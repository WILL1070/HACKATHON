import { POST as POST_BOOKING } from "@/app/api/bookings/route";
import { POST as POST_PAY } from "@/app/api/pay/route";
import {
  createBooking,
  getBooking,
  getAttempt,
} from "@/lib/demo-bookings";
import {
  prepareBookingPayment,
  submitBookingPayment,
  checkBookingPayment,
} from "@/lib/booking-payments";
import {
  fixtureAddress,
  fixturePrepared,
} from "./transaction-fixture";
import { envelopeHash } from "@/lib/transaction";
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  prepare: vi.fn(),
  submit: vi.fn(),
  status: vi.fn(),
  events: vi.fn(),
}));
vi.mock("@paiflow/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@paiflow/sdk")>();
  return {
    ...actual,
    Paiflow: class {
      constructor() {}
      deployment() {
        return {
          capabilities: { get: mocks.get },
          execute: { prepare: mocks.prepare, submit: mocks.submit },
          transactions: { get: mocks.status },
          events: { list: mocks.events },
        };
      }
    },
  };
});

const id = "12345678-1234-1234-1234-123456789abc";
const hash = envelopeHash(fixturePrepared.xdr);
const origin = "https://starter.example";
const post = (body: unknown) =>
  POST_PAY(
    new Request(`${origin}/api/pay`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PAIFLOW_BASE_URL", "https://beta.app.paiflow.xyz");
  vi.stubEnv("PAIFLOW_DEPLOYMENT_ID", id);
  vi.stubEnv("PAIFLOW_API_TOKEN", "pfd_" + "a".repeat(64));
  mocks.get.mockResolvedValue({
    data: {
      network: "testnet",
      inputAsset: { kind: "native" },
      triggerType: "deposit",
      operations: { execute: { status: "supported" } },
    },
  });
  mocks.prepare.mockResolvedValue({
    data: fixturePrepared,
    metadata: { historyRequestId: "preparation-evidence" },
  });
  mocks.submit.mockResolvedValue({ data: { txHash: hash, status: "PENDING" } });
  mocks.status.mockResolvedValue({
    data: { txHash: hash, status: "PENDING", network: "testnet" },
  });
  mocks.events.mockResolvedValue({
    data: { items: [], nextCursor: null, hasMore: false },
  });
});

it("creates a booking with integer-stroop totals and rejects bad input", async () => {
  const ok = await POST_BOOKING(
    new Request(`${origin}/api/bookings`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({
        listingId: "azure-pearl-hotel",
        checkIn: "2026-11-01",
        checkOut: "2026-11-03",
        guests: 2,
        units: 2,
      }),
    }),
  );
  expect(ok.status).toBe(200);
  const { data } = await ok.json();
  expect(data.totalXlm).toBe(24);
  expect(data.totalStroops).toBe("240000000");
  expect(data.status).toBe("PENDING_PAYMENT");
  expect(data.hostName).toBe("Pearl Hospitality Group");

  for (const body of [
    {
      listingId: "azure-pearl-hotel",
      checkIn: "2026-11-03",
      checkOut: "2026-11-01",
      guests: 2,
      units: 2,
    },
    {
      listingId: "azure-pearl-hotel",
      checkIn: "2026-11-01",
      checkOut: "2026-11-03",
      guests: 99,
      units: 2,
    },
    {
      listingId: "nope",
      checkIn: "2026-11-01",
      checkOut: "2026-11-03",
      guests: 2,
      units: 2,
    },
  ]) {
    const bad = await POST_BOOKING(
      new Request(`${origin}/api/bookings`, {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
    expect(bad.status).toBeGreaterThanOrEqual(400);
  }
});

it("prepares a booking payment for the exact total and is idempotent", async () => {
  const booking = createBooking({
    listingId: "cliffside-glass-villa",
    checkIn: "2026-11-01",
    checkOut: "2026-11-04",
    guests: 4,
    units: 3,
  });
  const first = await prepareBookingPayment(booking.id, fixtureAddress);
  expect(mocks.prepare).toHaveBeenCalledWith({
    from: fixtureAddress,
    amount: "1350000000", // 45 XLM × 3 nights
  });
  expect(first.preparation.txHash).toBe(hash);
  expect(getAttempt(booking.id)?.status).toBe("PREPARED");

  mocks.prepare.mockClear();
  const again = await prepareBookingPayment(booking.id, fixtureAddress);
  expect(mocks.prepare).not.toHaveBeenCalled();
  expect(again.preparation.txHash).toBe(hash);

  await expect(
    prepareBookingPayment("00000000-0000-0000-0000-000000000000", fixtureAddress),
  ).rejects.toThrow("Unknown booking");
});

it("submits only the exact signed envelope for the booking", async () => {
  const booking = createBooking({
    listingId: "summit-boardroom",
    checkIn: "2026-11-01",
    checkOut: "2026-11-01",
    guests: 10,
    units: 4,
  });
  await prepareBookingPayment(booking.id, fixtureAddress);
  const data = await submitBookingPayment(booking.id, fixturePrepared.xdr);
  expect(data.txHash).toBe(hash);
  expect(getAttempt(booking.id)?.status).toBe("SUBMITTED");
  expect(getBooking(booking.id)?.status).toBe("PENDING_PAYMENT");

  await expect(
    submitBookingPayment(booking.id, fixturePrepared.xdr),
  ).rejects.toThrow("No prepared payment");
});

it("marks the booking paid only on SUCCESS with a matching RECEIVE event", async () => {
  const booking = createBooking({
    listingId: "summit-boardroom",
    checkIn: "2026-11-01",
    checkOut: "2026-11-01",
    guests: 10,
    units: 4,
  });
  await prepareBookingPayment(booking.id, fixtureAddress);
  await submitBookingPayment(booking.id, fixturePrepared.xdr);

  // PENDING is not confirmation.
  let result = await checkBookingPayment(booking.id);
  expect(result.verified).toBe(false);
  expect(getBooking(booking.id)?.status).toBe("PENDING_PAYMENT");

  // SUCCESS without a matching RECEIVE event is not confirmation either.
  mocks.status.mockResolvedValue({
    data: { txHash: hash, status: "SUCCESS", network: "testnet" },
  });
  result = await checkBookingPayment(booking.id);
  expect(result.status).toBe("SUCCESS");
  expect(result.verified).toBe(false);
  expect(getBooking(booking.id)?.status).toBe("PENDING_PAYMENT");

  // SUCCESS + expected amount received → PAID and hash recorded.
  mocks.events.mockResolvedValue({
    data: {
      items: [
        {
          id: "evt-1",
          eventId: "evt-1",
          kind: "RECEIVE",
          topic: null,
          ledger: 123,
          txHash: hash,
          occurredAt: "2026-11-01T00:00:00Z",
          data: { amount: "600000000" }, // 15 XLM × 4 hours
        },
      ],
      nextCursor: null,
      hasMore: false,
    },
  });
  result = await checkBookingPayment(booking.id);
  expect(result.verified).toBe(true);
  expect(result.booking.status).toBe("PAID");
  expect(result.booking.txHash).toBe(hash);
});

it("records FAILED payments and refuses unknown booking actions", async () => {
  const booking = createBooking({
    listingId: "lantern-study-hub",
    checkIn: "2026-11-01",
    checkOut: "2026-11-01",
    guests: 1,
    units: 2,
  });
  await prepareBookingPayment(booking.id, fixtureAddress);
  await submitBookingPayment(booking.id, fixturePrepared.xdr);
  mocks.status.mockResolvedValue({
    data: { txHash: hash, status: "FAILED", network: "testnet" },
  });
  const result = await checkBookingPayment(booking.id);
  expect(result.status).toBe("FAILED");
  expect(result.booking.status).toBe("PAYMENT_FAILED");

  const response = await post({
    action: "prepareBooking",
    bookingId: "00000000-0000-0000-0000-000000000000",
    from: fixtureAddress,
  });
  expect(response.status).toBe(404);
  const invalid = await post({ action: "statusBooking", bookingId: 42 });
  expect(invalid.status).toBe(400);
});
