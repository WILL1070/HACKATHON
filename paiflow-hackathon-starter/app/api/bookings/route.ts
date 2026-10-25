import {
  createBooking,
  bookingView,
  availabilityFor,
  listBookings,
} from "@/lib/demo-bookings";
import { getDemoListing } from "@/lib/demo-listings";
import { handle, sameOrigin, readJson, RequestError } from "@/lib/http";
import { limitPaymentRequests } from "@/lib/payment-rate-limit";

export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    limitPaymentRequests("request");
    const b = await readJson(request);
    if (!b || typeof b !== "object" || Array.isArray(b))
      throw new RequestError(400, "VALIDATION", "Invalid request.");
    const v = b as Record<string, unknown>;
    const keys = Object.keys(v);
    const slotKeysOk =
      (v.resourceId === undefined || typeof v.resourceId === "string") &&
      (v.startHour === undefined ||
        (typeof v.startHour === "number" && Number.isInteger(v.startHour)));
    if (
      typeof v.listingId === "string" &&
      typeof v.checkIn === "string" &&
      typeof v.checkOut === "string" &&
      typeof v.guests === "number" &&
      Number.isInteger(v.guests) &&
      typeof v.units === "number" &&
      Number.isInteger(v.units) &&
      keys.length >= 5 &&
      keys.length <= 7 &&
      slotKeysOk
    ) {
      const booking = createBooking({
        listingId: v.listingId,
        checkIn: v.checkIn,
        checkOut: v.checkOut,
        guests: v.guests,
        units: v.units,
        resourceId: v.resourceId,
        startHour: v.startHour,
      });
      return bookingView(booking);
    }
    throw new RequestError(400, "VALIDATION", "Invalid request.");
  });
}

/** No params: all bookings. With listingId+date: busy time slots, e.g. ?listingId=x&date=2026-10-26. */
export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const listingId = url.searchParams.get("listingId") ?? "";
    const date = url.searchParams.get("date") ?? "";
    if (!listingId && !date) {
      return { bookings: listBookings().map((booking) => bookingView(booking)) };
    }
    if (!getDemoListing(listingId) || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new RequestError(400, "VALIDATION", "Invalid listing or date.");
    return { listingId, date, busy: availabilityFor(listingId, date) };
  });
}
