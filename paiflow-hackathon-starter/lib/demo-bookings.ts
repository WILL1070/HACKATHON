import "server-only";
import { toStroops } from "@/lib/amount";
import { getDemoListing } from "@/lib/demo-listings";
import { applyPromotion } from "@/lib/promotions";
import { RequestError } from "@/lib/http";

// Demo booking store. In-memory and per-process: bookings are lost on restart
// and are NOT durable financial storage. A real deployment must persist these
// records in a database (see the approved architecture plan).
export type BookingStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PAYMENT_FAILED"
  | "UNRESOLVED";

export type Booking = {
  id: string;
  listingId: string;
  listingTitle: string;
  hostName: string;
  customerAddress: string | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  units: number;
  unitLabel: string;
  /** Reservable unit (table/seat/PC) for listings with inventory. */
  resourceId?: string;
  resourceLabel?: string;
  /** Start of an hourly time slot, whole hours on a 24h clock. */
  startHour?: number;
  /** Applied host promotion, if one is active for the check-in date. */
  promotionId?: string;
  promotionLabel?: string;
  discountXlm?: number;
  totalXlm: number;
  /** Canonical integer stroop string; money never uses floats. */
  totalStroops: string;
  status: BookingStatus;
  txHash: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AttemptStatus = "PREPARED" | "SUBMITTED" | "VERIFIED" | "FAILED";

export type PaymentAttempt = {
  bookingId: string;
  amountStroops: string;
  fromAddress: string;
  preparedXdr: string;
  preparedHash: string;
  preparedExpiresAt: string;
  preparationRequestId?: string;
  signedXdr?: string;
  txHash?: string;
  status: AttemptStatus;
  updatedAt: string;
};

const bookings = new Map<string, Booking>();
const attempts = new Map<string, PaymentAttempt>();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function createBooking(input: {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  units: number;
  resourceId?: unknown;
  startHour?: unknown;
}): Booking {
  const listing = getDemoListing(input.listingId);
  if (!listing) throw new RequestError(404, "NOT_FOUND", "Unknown listing.");
  if (listing.priceXlm <= 0)
    throw new RequestError(422, "VALIDATION", "Listing has no valid price.");
  if (!DATE_RE.test(input.checkIn) || !DATE_RE.test(input.checkOut))
    throw new RequestError(422, "VALIDATION", "Invalid booking dates.");
  const start = Date.parse(input.checkIn);
  const end = Date.parse(input.checkOut);
  // Hourly spaces may be booked same-day; nightly stays need a later checkout.
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start ||
    (listing.priceUnit === "night" && end <= start)
  )
    throw new RequestError(422, "VALIDATION", "Invalid booking dates.");

  const hasSeats = !!listing.seats?.length;
  const resourceId: unknown = input.resourceId;
  const startHourRaw: unknown = input.startHour;

  if (
    listing.priceUnit === "night" &&
    (resourceId !== undefined || startHourRaw !== undefined)
  )
    throw new RequestError(
      422,
      "VALIDATION",
      "Nightly stays do not take a time slot or a table.",
    );

  let resource: string | undefined;
  let slotStart: number | undefined;
  let seatLabel: string | undefined;
  if (hasSeats) {
    if (typeof resourceId !== "string" || !resourceId)
      throw new RequestError(
        422,
        "VALIDATION",
        "Pick a table, seat, or computer for this listing.",
      );
    const seat = listing.seats!.find((s) => s.id === resourceId);
    if (!seat)
      throw new RequestError(422, "VALIDATION", "Unknown table, seat, or computer.");
    seatLabel = seat.label;
    if (
      typeof startHourRaw !== "number" ||
      !Number.isInteger(startHourRaw) ||
      startHourRaw < 0 ||
      startHourRaw > 23
    )
      throw new RequestError(
        422,
        "VALIDATION",
        "Pick a whole-hour start time for this reservation.",
      );
    resource = resourceId;
    slotStart = startHourRaw;
  } else if (resourceId !== undefined) {
    throw new RequestError(
      422,
      "VALIDATION",
      "This listing does not have reservable tables or seats.",
    );
  }

  // Time slots must fit inside the published opening window (supports overnight
  // hours such as 10:00–02:00).
  if (slotStart !== undefined && listing.openingHours) {
    const { open, close } = listing.openingHours;
    const slotEnd = slotStart + input.units;
    const fits =
      close > open
        ? slotStart >= open && slotEnd <= close
        : slotStart >= open && (slotEnd <= 24 || slotEnd - 24 <= close);
    if (!fits)
      throw new RequestError(
        422,
        "VALIDATION",
        "That time is outside the published opening hours.",
      );
  }

  if (
    !Number.isInteger(input.guests) ||
    input.guests < 1 ||
    input.guests > listing.guests
  )
    throw new RequestError(422, "VALIDATION", "Invalid guest count.");
  if (!Number.isInteger(input.units) || input.units < 1 || input.units > 365)
    throw new RequestError(422, "VALIDATION", "Invalid duration.");

  // Per-unit overlap prevention: any live booking (pending, paid, or
  // unresolved) of the same unit on the same day blocks the slot. Failed
  // payments release it. In-memory only: lost on server restart.
  if (hasSeats) {
    for (const other of bookings.values()) {
      if (
        other.listingId !== listing.id ||
        other.resourceId !== resource ||
        other.checkIn !== input.checkIn ||
        other.status === "PAYMENT_FAILED"
      )
        continue;
      const aStart = other.startHour ?? 0;
      const aEnd = aStart + other.units;
      const bStart = slotStart as number;
      const bEnd = bStart + input.units;
      if (bStart < aEnd && bEnd > aStart)
        throw new RequestError(
          409,
          "CONFLICT",
          `${seatLabel} is already reserved ${aStart}:00–${aEnd}:00 on that date.`,
        );
    }
  }

  const priced = applyPromotion(listing, input.units, input.checkIn);
  const totalXlm = priced.finalXlm;
  if (listing.minSpendXlm !== undefined && totalXlm < listing.minSpendXlm)
    throw new RequestError(
      422,
      "VALIDATION",
      `Minimum spend for this café is ${listing.minSpendXlm} XLM per reservation.`,
    );
  const now = new Date().toISOString();
  const booking: Booking = {
    id: crypto.randomUUID(),
    listingId: listing.id,
    listingTitle: listing.title,
    hostName: listing.hostName,
    customerAddress: null,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    units: input.units,
    unitLabel:
      listing.priceUnit === "night"
        ? `${input.units} ${input.units === 1 ? "night" : "nights"}`
        : `${input.units} ${input.units === 1 ? "hour" : "hours"}`,
    ...(resource ? { resourceId: resource } : {}),
    ...(seatLabel ? { resourceLabel: seatLabel } : {}),
    ...(slotStart !== undefined ? { startHour: slotStart } : {}),
    ...(priced.promotion
      ? {
          promotionId: priced.promotion.id,
          promotionLabel: priced.promotion.label,
          discountXlm: priced.discountXlm,
        }
      : {}),
    totalXlm,
    totalStroops: toStroops(String(totalXlm)),
    status: "PENDING_PAYMENT",
    txHash: null,
    createdAt: now,
    updatedAt: now,
  };
  bookings.set(booking.id, booking);
  return booking;
}

/**
 * Busy time slots per reservable unit for one listing and date. Non-secret:
 * used by the listing page to show availability. In-memory only.
 */
export function availabilityFor(listingId: string, date: string) {
  const busy: Record<string, { startHour: number; endHour: number }[]> = {};
  for (const booking of bookings.values()) {
    if (
      booking.listingId !== listingId ||
      booking.checkIn !== date ||
      booking.status === "PAYMENT_FAILED" ||
      !booking.resourceId ||
      booking.startHour === undefined
    )
      continue;
    (busy[booking.resourceId] ??= []).push({
      startHour: booking.startHour,
      endHour: booking.startHour + booking.units,
    });
  }
  for (const slots of Object.values(busy)) slots.sort((a, b) => a.startHour - b.startHour);
  return busy;
}

export function getBooking(id: string): Booking | undefined {
  return bookings.get(id);
}

export function getAttempt(bookingId: string): PaymentAttempt | undefined {
  return attempts.get(bookingId);
}

/** One active attempt per booking prevents duplicate payment processing. */
export function saveAttempt(
  attempt: PaymentAttempt,
): PaymentAttempt {
  attempts.set(attempt.bookingId, attempt);
  return attempt;
}

export function bindCustomer(bookingId: string, address: string) {
  const booking = bookings.get(bookingId);
  if (!booking) throw new RequestError(404, "NOT_FOUND", "Unknown booking.");
  if (booking.customerAddress && booking.customerAddress !== address)
    throw new RequestError(409, "CONFLICT", "Booking belongs to another wallet.");
  booking.customerAddress = address;
  booking.updatedAt = new Date().toISOString();
}

export function transitionBooking(
  bookingId: string,
  status: BookingStatus,
  txHash?: string,
) {
  const booking = bookings.get(bookingId);
  if (!booking) throw new RequestError(404, "NOT_FOUND", "Unknown booking.");
  booking.status = status;
  if (txHash) booking.txHash = txHash;
  booking.updatedAt = new Date().toISOString();
}

export function bookingView(booking: Booking) {
  // Only non-secret fields ever leave the server.
  return {
    id: booking.id,
    listingId: booking.listingId,
    listingTitle: booking.listingTitle,
    hostName: booking.hostName,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: booking.guests,
    units: booking.units,
    unitLabel: booking.unitLabel,
    resourceId: booking.resourceId ?? null,
    resourceLabel: booking.resourceLabel ?? null,
    startHour: booking.startHour ?? null,
    promotionId: booking.promotionId ?? null,
    promotionLabel: booking.promotionLabel ?? null,
    discountXlm: booking.discountXlm ?? null,
    totalXlm: booking.totalXlm,
    totalStroops: booking.totalStroops,
    status: booking.status,
    txHash: booking.txHash,
  };
}
