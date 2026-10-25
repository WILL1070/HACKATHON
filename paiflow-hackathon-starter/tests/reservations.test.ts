import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createBooking,
  availabilityFor,
  transitionBooking,
  type Booking,
} from "@/lib/demo-bookings";
import { POST, GET } from "@/app/api/bookings/route";

// The booking store is a shared in-memory Map, so every test books its own
// date to stay isolated.
let day = 1;
const nextDate = () => `2026-12-${String(day++).padStart(2, "0")}`;

const COFFEE = "ember-and-oak"; // open 8–19, min spend 2 XLM, price 1.5 XLM/h
const CAFE = "pixel-guild"; // open 10:00–02:00 (overnight), price 2.5 XLM/h
const LOUNGE = "velvet-lounge-soho"; // hourly, no seats, no opening hours

function slotBooking(date: string, overrides: Record<string, unknown> = {}): Booking {
  return createBooking({
    listingId: COFFEE,
    checkIn: date,
    checkOut: date,
    guests: 2,
    units: 2,
    resourceId: "t1",
    startHour: 10,
    ...overrides,
  });
}

describe("time-slot reservations for coffee shops and internet cafés", () => {
  it("creates a booking bound to a table and start hour", () => {
    const booking = slotBooking(nextDate());
    expect(booking.resourceId).toBe("t1");
    expect(booking.resourceLabel).toBe("Communal table (seats 4)");
    expect(booking.startHour).toBe(10);
    expect(booking.unitLabel).toBe("2 hours");
    expect(booking.totalXlm).toBe(3);
    expect(booking.totalStroops).toBe("30000000");
  });

  it("rejects an unknown reservable unit", () => {
    expect(() => slotBooking(nextDate(), { resourceId: "zz9" })).toThrow(
      "Unknown table",
    );
  });

  it("requires a unit for listings with inventory", () => {
    const date = nextDate();
    expect(() =>
      createBooking({
        listingId: COFFEE,
        checkIn: date,
        checkOut: date,
        guests: 2,
        units: 2,
        startHour: 10,
      }),
    ).toThrow("Pick a table, seat, or computer");
  });

  it("rejects slots outside published opening hours", () => {
    const date = nextDate();
    expect(() => slotBooking(date, { startHour: 7 })).toThrow(
      "outside the published opening hours",
    );
    expect(() => slotBooking(date, { startHour: 18, units: 2 })).toThrow(
      "outside the published opening hours",
    );
  });

  it("supports overnight opening windows", () => {
    const date = nextDate();
    const late = createBooking({
      listingId: CAFE,
      checkIn: date,
      checkOut: date,
      guests: 1,
      units: 2,
      resourceId: "g1",
      startHour: 23,
    });
    expect(late.startHour).toBe(23);
    expect(() =>
      createBooking({
        listingId: CAFE,
        checkIn: date,
        checkOut: date,
        guests: 1,
        units: 4,
        resourceId: "g2",
        startHour: 23,
      }),
    ).toThrow("outside the published opening hours");
  });

  it("enforces the café minimum spend", () => {
    // 1.5 XLM/h × 1h = 1.5 XLM < 2 XLM minimum.
    expect(() => slotBooking(nextDate(), { units: 1 })).toThrow(
      "Minimum spend",
    );
  });

  it("rejects overlapping reservations of the same unit", () => {
    const date = nextDate();
    slotBooking(date, { startHour: 10, units: 2 }); // 10–12
    // Same unit overlapping 11–13.
    expect(() => slotBooking(date, { resourceId: "t1", startHour: 11 })).toThrow(
      "already reserved 10:00–12:00",
    );
    // Same unit abutting 12–14 is allowed (no overlap).
    expect(() =>
      slotBooking(date, { resourceId: "t1", startHour: 12 }),
    ).not.toThrow();
    // A different unit at the same time is allowed.
    expect(() =>
      slotBooking(date, { resourceId: "w1", startHour: 10 }),
    ).not.toThrow();
  });

  it("releases the slot when the payment fails but not while pending", () => {
    const date = nextDate();
    const failed = slotBooking(date, { resourceId: "m1", startHour: 14 });
    transitionBooking(failed.id, "PAYMENT_FAILED");
    expect(() =>
      slotBooking(date, { resourceId: "m1", startHour: 14 }),
    ).not.toThrow();
    slotBooking(date, { resourceId: "w2", startHour: 15 });
    expect(() =>
      slotBooking(date, { resourceId: "w2", startHour: 15 }),
    ).toThrow("already reserved");
  });

  it("keeps nightly stays free of slot fields", () => {
    expect(() =>
      createBooking({
        listingId: "azure-pearl-hotel",
        checkIn: "2026-12-01",
        checkOut: "2026-12-03",
        guests: 2,
        units: 2,
        resourceId: "t1",
      }),
    ).toThrow("Nightly stays do not take a time slot");
  });

  it("rejects slot fields on listings without inventory", () => {
    const date = nextDate();
    expect(() =>
      createBooking({
        listingId: LOUNGE,
        checkIn: date,
        checkOut: date,
        guests: 2,
        units: 2,
        resourceId: "t1",
      }),
    ).toThrow("does not have reservable tables or seats");
  });

  it("reports busy slots per unit for a date", () => {
    const date = nextDate();
    slotBooking(date, { startHour: 10, units: 2 });
    const busy = availabilityFor(COFFEE, date);
    expect(busy.t1).toEqual([{ startHour: 10, endHour: 12 }]);
    expect(busy.w1).toBeUndefined();
    expect(availabilityFor(COFFEE, "2026-12-31")).toEqual({});
  });
});

describe("bookings API with time slots", () => {
  const origin = "https://starter.example";
  const post = (body: unknown) =>
    POST(
      new Request(`${origin}/api/bookings`, {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );

  it("accepts a slot booking and returns the resource fields", async () => {
    const date = nextDate();
    const response = await post({
      listingId: COFFEE,
      checkIn: date,
      checkOut: date,
      guests: 1,
      units: 2,
      resourceId: "w1",
      startHour: 9,
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.resourceId).toBe("w1");
    expect(body.data.resourceLabel).toBe("Window seat 1");
    expect(body.data.startHour).toBe(9);
  });

  it("still accepts the original five-field nightly shape", async () => {
    const date = nextDate();
    const response = await post({
      listingId: "azure-pearl-hotel",
      checkIn: date,
      checkOut: "2026-12-29",
      guests: 2,
      units: 3,
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.unitLabel).toBe("3 nights");
    expect(body.data.resourceId).toBeNull();
  });

  it("returns 409 for a conflicting slot", async () => {
    const date = nextDate();
    slotBooking(date, { resourceId: "t1", startHour: 10, units: 2 });
    const response = await post({
      listingId: COFFEE,
      checkIn: date,
      checkOut: date,
      guests: 1,
      units: 2,
      resourceId: "t1",
      startHour: 10,
    });
    expect(response.status).toBe(409);
  });

  it("rejects malformed slot fields", async () => {
    const date = nextDate();
    const response = await post({
      listingId: COFFEE,
      checkIn: date,
      checkOut: date,
      guests: 1,
      units: 2,
      resourceId: 42,
      startHour: 10,
    });
    expect(response.status).toBe(400);
  });

  it("serves availability for a listing and date", async () => {
    const date = nextDate();
    slotBooking(date, { startHour: 10, units: 2 });
    const response = await GET(
      new Request(`${origin}/api/bookings?listingId=${COFFEE}&date=${date}`),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.busy.t1).toEqual([{ startHour: 10, endHour: 12 }]);
    const bad = await GET(
      new Request(`${origin}/api/bookings?listingId=nope&date=${date}`),
    );
    expect(bad.status).toBe(400);
  });
});
