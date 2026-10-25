import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createEvent,
  updateEvent,
  transitionEvent,
  listEvents,
  nearbyListings,
  type MarketplaceEvent,
} from "@/lib/events";
import {
  createPromotion,
  setPromotionActive,
  promotionFor,
  applyPromotion,
} from "@/lib/promotions";
import { createBooking } from "@/lib/demo-bookings";

function eventInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Harvest Moon Fair",
    description: "A community fair with food stalls and live music.",
    coverImageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3",
    category: "fair",
    city: "Marina Bay",
    province: "Singapore",
    venue: "Bayfront Lawn",
    startDate: "2027-03-05",
    endDate: "2027-03-07",
    organizer: "Community Board",
    officialLinks: ["https://example.org/harvest-moon"],
    tentative: false,
    ...overrides,
  };
}

describe("event creation and validation", () => {
  it("creates a draft event, unverified by default", () => {
    const event = createEvent(eventInput());
    expect(event.status).toBe("DRAFT");
    expect(event.verified).toBe(false);
    expect(event.lastVerifiedAt).toBeNull();
  });

  it("rejects end dates before start dates", () => {
    expect(() =>
      createEvent(eventInput({ startDate: "2027-03-07", endDate: "2027-03-05" })),
    ).toThrow("End date must not be before the start date");
  });

  it("rejects malformed dates and URLs", () => {
    expect(() => createEvent(eventInput({ startDate: "March 5" }))).toThrow(
      "YYYY-MM-DD",
    );
    expect(() =>
      createEvent(eventInput({ coverImageUrl: "notaurl" })),
    ).toThrow("valid URL");
    expect(() =>
      createEvent(eventInput({ officialLinks: ["ftp://x"] })),
    ).toThrow("http(s)");
  });

  it("rejects unknown categories", () => {
    expect(() => createEvent(eventInput({ category: "parade" }))).toThrow(
      "Unknown event category",
    );
  });
});

describe("verification and publication rules", () => {
  it("refuses to publish unverified events", () => {
    const event = createEvent(eventInput());
    expect(() => transitionEvent(event.id, "publish")).toThrow(
      "Verify the event against an official source",
    );
  });

  it("refuses to publish tentative dates as confirmed", () => {
    const event = createEvent(eventInput({ tentative: true }));
    const verified = updateEvent(event.id, { verified: true });
    expect(verified.verified).toBe(true);
    expect(verified.lastVerifiedAt).toBeTruthy();
    expect(() => transitionEvent(event.id, "publish")).toThrow(
      "Tentative dates cannot be published as confirmed",
    );
  });

  it("publishes verified events with official sources", () => {
    const event = createEvent(eventInput());
    updateEvent(event.id, { verified: true });
    const published = transitionEvent(event.id, "publish");
    expect(published.status).toBe("PUBLISHED");
    const unpublished = transitionEvent(event.id, "unpublish");
    expect(unpublished.status).toBe("UNPUBLISHED");
    expect(() => transitionEvent(event.id, "unpublish")).toThrow(
      "Event is not published",
    );
    expect(transitionEvent(event.id, "archive").status).toBe("ARCHIVED");
    expect(() => transitionEvent(event.id, "publish")).toThrow(
      "Archived events cannot be published",
    );
  });

  it("hides non-published events from public lists", () => {
    const draft = createEvent(eventInput({ city: "Hidden City" }));
    expect(listEvents({ city: "Hidden" })).toHaveLength(0);
    expect(
      listEvents({ city: "Hidden" }, { includeUnpublished: true }),
    ).toHaveLength(1);
    updateEvent(draft.id, { verified: true });
    transitionEvent(draft.id, "publish");
    expect(listEvents({ city: "Hidden" })).toHaveLength(1);
  });
});

describe("event search filters", () => {
  it("filters by query, city, category and date window", () => {
    // Distinctive values: earlier tests publish other events that stay in the
    // shared store.
    const event = createEvent(
      eventInput({
        name: "Searchable Harvest Gala",
        category: "concert",
        city: "Cedar Falls",
        startDate: "2027-09-01",
        endDate: "2027-09-05",
      }),
    );
    updateEvent(event.id, { verified: true });
    transitionEvent(event.id, "publish");
    const past = createEvent(
      eventInput({
        name: "Old Lantern Parade",
        startDate: "2020-01-01",
        endDate: "2020-01-02",
      }),
    );
    updateEvent(past.id, { verified: true });
    transitionEvent(past.id, "publish");

    expect(listEvents({ query: "searchable" })).toHaveLength(1);
    expect(listEvents({ city: "cedar" })).toHaveLength(1);
    expect(listEvents({ category: "concert" })).toHaveLength(1);
    // Earlier tests published "fair"-category events into the shared store.
    expect(listEvents({ category: "fair" }).map((e) => e.name)).toContain(
      "Harvest Moon Fair",
    );
    expect(listEvents({ from: "2027-08-01", to: "2027-10-01" })).toHaveLength(1);
    expect(listEvents({ when: "past" }).map((e) => e.name)).toContain(
      "Old Lantern Parade",
    );
    expect(listEvents({ when: "upcoming" }).map((e) => e.name)).toContain(
      "Searchable Harvest Gala",
    );
  });
});

describe("nearby listings", () => {
  it("matches listings by location token, never distance", () => {
    const event = createEvent(eventInput()) as MarketplaceEvent;
    const matches = nearbyListings(event);
    // "Marina Bay, Singapore" should match the Azure Pearl Hotel listing.
    expect(matches.map((m) => m.listing.id)).toContain("azure-pearl-hotel");
    expect(matches[0]?.matchedOn.length ?? 0).toBeGreaterThan(3);
  });

  it("returns no matches when no listing shares the location", () => {
    const event = createEvent(
      eventInput({ city: "Iloilo City", province: "Iloilo" }),
    );
    expect(nearbyListings(event)).toHaveLength(0);
  });
});

describe("host promotions", () => {
  const promoInput = (overrides: Record<string, unknown> = {}) => ({
    listingId: "lantern-study-hub",
    label: "Festival week — 10% off",
    kind: "percent",
    value: 10,
    startDate: "2027-03-01",
    endDate: "2027-03-31",
    ...overrides,
  });

  it("applies a percent promotion inside its window", () => {
    createPromotion(promoInput());
    const priced = applyPromotion(
      { id: "lantern-study-hub", priceXlm: 2 } as never,
      3,
      "2027-03-05",
    );
    expect(priced.originalXlm).toBe(6);
    expect(priced.discountXlm).toBe(0.6);
    expect(priced.finalXlm).toBe(5.4);
  });

  it("ignores promotions outside the window or inactive", () => {
    const promotion = createPromotion(
      promoInput({
        listingId: "the-quiet-stack",
        startDate: "2027-04-01",
        endDate: "2027-04-30",
      }),
    );
    expect(
      applyPromotion({ id: "the-quiet-stack", priceXlm: 3 } as never, 1, "2027-05-01")
        .promotion,
    ).toBeNull();
    setPromotionActive(promotion.id, false);
    expect(promotionFor("the-quiet-stack", "2027-04-05")).toBeUndefined();
  });

  it("validates percent caps, fixed size and dates", () => {
    expect(() => createPromotion(promoInput({ value: 95 }))).toThrow(
      "between 1 and 90",
    );
    expect(() =>
      createPromotion(promoInput({ kind: "fixed", value: 5 })),
    ).toThrow("smaller than the listing");
    expect(() =>
      createPromotion(
        promoInput({ startDate: "2027-03-31", endDate: "2027-03-01" }),
      ),
    ).toThrow("must not precede");
  });

  it("flows the discounted total into the booking", () => {
    createPromotion(
      promoInput({ listingId: "azure-pearl-hotel", value: 50 }),
    );
    const booking = createBooking({
      listingId: "azure-pearl-hotel",
      checkIn: "2027-03-10",
      checkOut: "2027-03-12",
      guests: 2,
      units: 2,
    });
    // 12 XLM/night × 2 nights = 24; 50% off = 12.
    expect(booking.totalXlm).toBe(12);
    expect(booking.discountXlm).toBe(12);
    expect(booking.promotionLabel).toBe("Festival week — 10% off");
    expect(booking.totalStroops).toBe("120000000");
  });
});
