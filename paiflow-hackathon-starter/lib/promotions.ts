import "server-only";
import { RequestError } from "@/lib/http";
import { getDemoListing } from "@/lib/demo-listings";
import { getEvent } from "@/lib/events";
import type { DemoListing } from "@/lib/demo-listings";

export type EventPromotion = {
  id: string;
  /** Optional tie to an event; the date window is authoritative either way. */
  eventId?: string;
  eventName?: string;
  listingId: string;
  label: string;
  kind: "percent" | "fixed";
  /** Percent: 1–90. Fixed: XLM amount deducted from the pre-discount total. */
  value: number;
  startDate: string;
  endDate: string;
  terms: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

const promotions = new Map<string, EventPromotion>();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: unknown, label: string): string {
  if (typeof value !== "string" || !DATE_RE.test(value) || !Number.isFinite(Date.parse(value)))
    throw new RequestError(422, "VALIDATION", `${label} must be a YYYY-MM-DD date.`);
  return value;
}

export function createPromotion(input: {
  eventId?: unknown;
  listingId?: unknown;
  label?: unknown;
  kind?: unknown;
  value?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  terms?: unknown;
}): EventPromotion {
  if (typeof input.listingId !== "string" || !getDemoListing(input.listingId))
    throw new RequestError(422, "VALIDATION", "Unknown listing.");
  const listing = getDemoListing(input.listingId)!;
  let eventId: string | undefined;
  let eventName: string | undefined;
  if (input.eventId !== undefined && input.eventId !== null && input.eventId !== "") {
    if (typeof input.eventId !== "string" || !getEvent(input.eventId))
      throw new RequestError(422, "VALIDATION", "Unknown event.");
    const event = getEvent(input.eventId)!;
    eventId = event.id;
    eventName = event.name;
  }
  if (typeof input.label !== "string" || !input.label.trim())
    throw new RequestError(422, "VALIDATION", "Promotion label is required.");
  if (input.kind !== "percent" && input.kind !== "fixed")
    throw new RequestError(422, "VALIDATION", "Kind must be percent or fixed.");
  if (
    typeof input.value !== "number" ||
    !Number.isFinite(input.value)
  )
    throw new RequestError(422, "VALIDATION", "Value must be a number.");
  if (input.kind === "percent" && (input.value < 1 || input.value > 90))
    throw new RequestError(
      422,
      "VALIDATION",
      "Percent discounts must be between 1 and 90.",
    );
  if (input.kind === "fixed" && input.value <= 0)
    throw new RequestError(422, "VALIDATION", "Fixed discounts must be positive.");
  if (input.kind === "fixed" && input.value >= listing.priceXlm)
    throw new RequestError(
      422,
      "VALIDATION",
      "Fixed discount must be smaller than the listing's hourly/nightly rate.",
    );
  const startDate = parseDate(input.startDate, "Start date");
  const endDate = parseDate(input.endDate, "End date");
  if (Date.parse(endDate) < Date.parse(startDate))
    throw new RequestError(422, "VALIDATION", "End date must not precede start date.");
  const now = new Date().toISOString();
  const promotion: EventPromotion = {
    id: crypto.randomUUID(),
    ...(eventId ? { eventId, eventName } : {}),
    listingId: listing.id,
    label: input.label.trim(),
    kind: input.kind,
    value: input.value,
    startDate,
    endDate,
    terms:
      typeof input.terms === "string" && input.terms.trim()
        ? input.terms.trim()
        : "No additional terms.",
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  promotions.set(promotion.id, promotion);
  return promotion;
}

export function getPromotion(id: string): EventPromotion | undefined {
  return promotions.get(id);
}

export function listPromotions(filter: { listingId?: string } = {}): EventPromotion[] {
  return [...promotions.values()].filter(
    (promotion) => !filter.listingId || promotion.listingId === filter.listingId,
  );
}

export function setPromotionActive(id: string, active: boolean): EventPromotion {
  const promotion = promotions.get(id);
  if (!promotion) throw new RequestError(404, "NOT_FOUND", "Unknown promotion.");
  promotion.active = active;
  promotion.updatedAt = new Date().toISOString();
  return promotion;
}

/** The single active promotion for a listing on a date, if any. */
export function promotionFor(
  listingId: string,
  date: string,
): EventPromotion | undefined {
  return [...promotions.values()].find(
    (promotion) =>
      promotion.active &&
      promotion.listingId === listingId &&
      promotion.startDate <= date &&
      promotion.endDate >= date,
  );
}

export type PricedTotal = {
  originalXlm: number;
  discountXlm: number;
  finalXlm: number;
  promotion: EventPromotion | null;
};

/**
 * Apply an active promotion to a booking total. Discounts never reduce a
 * total below zero — a misconfigured promotion is a hard error, not a silent
 * fix, so a broken price can never reach the payment layer.
 */
export function applyPromotion(
  listing: DemoListing,
  units: number,
  date: string,
): PricedTotal {
  const originalXlm = listing.priceXlm * units;
  const promotion = promotionFor(listing.id, date);
  if (!promotion) {
    return { originalXlm, discountXlm: 0, finalXlm: originalXlm, promotion: null };
  }
  const discountXlm =
    promotion.kind === "percent"
      ? Math.round(originalXlm * (promotion.value / 100) * 10_000_000) / 10_000_000
      : promotion.value * units;
  const finalXlm = Math.round((originalXlm - discountXlm) * 10_000_000) / 10_000_000;
  if (finalXlm <= 0)
    throw new RequestError(
      422,
      "VALIDATION",
      "This promotion would reduce the price below zero. Fix the promotion before booking.",
    );
  return { originalXlm, discountXlm, finalXlm, promotion };
}
