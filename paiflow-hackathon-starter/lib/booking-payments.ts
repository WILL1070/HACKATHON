import "server-only";
import {
  bindCustomer,
  getAttempt,
  getBooking,
  saveAttempt,
  transitionBooking,
  bookingView,
} from "@/lib/demo-bookings";
import {
  paymentStatus,
  preparePaymentOf,
  submitPreparedPayment,
  paymentEvents,
} from "@/lib/paiflow";
import { envelopeHash } from "@/lib/transaction";
import { TESTNET } from "@/lib/types";
import { RequestError } from "@/lib/http";

/** Booking-bound preparation: persists the attempt before any signing. */
export async function prepareBookingPayment(
  bookingId: string,
  from: string,
) {
  const booking = getBooking(bookingId);
  if (!booking) throw new RequestError(404, "NOT_FOUND", "Unknown booking.");
  if (booking.status === "PAID")
    throw new RequestError(409, "CONFLICT", "Booking is already paid.");
  bindCustomer(bookingId, from);

  const existing = getAttempt(bookingId);
  if (existing) {
    if (existing.status === "PREPARED" && existing.fromAddress === from) {
      // Idempotent re-preparation: return the persisted original preparation.
      return {
        booking: bookingView(getBooking(bookingId)!),
        preparation: {
          xdr: existing.preparedXdr,
          network: "testnet" as const,
          networkPassphrase: TESTNET,
          expiresAt: existing.preparedExpiresAt,
          txHash: existing.preparedHash,
          preparationRequestId: existing.preparationRequestId,
        },
      };
    }
    throw new RequestError(
      409,
      "CONFLICT",
      "A payment attempt is already in progress. Check its status; never prepare a replacement.",
    );
  }

  const prepared = await preparePaymentOf(from, booking.totalStroops);
  saveAttempt({
    bookingId,
    amountStroops: booking.totalStroops,
    fromAddress: from,
    preparedXdr: prepared.xdr,
    preparedHash: prepared.txHash,
    preparedExpiresAt: prepared.expiresAt,
    preparationRequestId: prepared.preparationRequestId,
    status: "PREPARED",
    updatedAt: new Date().toISOString(),
  });
  return { booking: bookingView(getBooking(bookingId)!), preparation: prepared };
}

export async function submitBookingPayment(
  bookingId: string,
  signedXdr: string,
  preparationRequestId?: string,
) {
  const booking = getBooking(bookingId);
  if (!booking) throw new RequestError(404, "NOT_FOUND", "Unknown booking.");
  const attempt = getAttempt(bookingId);
  if (!attempt || attempt.status !== "PREPARED")
    throw new RequestError(
      409,
      "CONFLICT",
      "No prepared payment for this booking.",
    );
  if (envelopeHash(signedXdr) !== attempt.preparedHash)
    throw new RequestError(
      422,
      "VALIDATION",
      "Envelope does not match the stored preparation.",
    );
  const data = await submitPreparedPayment(
    signedXdr,
    attempt.preparedHash,
    preparationRequestId ?? attempt.preparationRequestId,
  );
  saveAttempt({
    ...attempt,
    signedXdr,
    txHash: data.txHash,
    status: "SUBMITTED",
    updatedAt: new Date().toISOString(),
  });
  return data;
}

export type BookingPaymentStatus = {
  status: string;
  txHash: string;
  verified: boolean;
  booking: ReturnType<typeof bookingView>;
};

/**
 * Verification before confirmation: only a SUCCESS on the original hash PLUS
 * a matching RECEIVE event for the expected amount marks the booking paid.
 */
export async function checkBookingPayment(
  bookingId: string,
): Promise<BookingPaymentStatus> {
  const booking = getBooking(bookingId);
  if (!booking) throw new RequestError(404, "NOT_FOUND", "Unknown booking.");
  const attempt = getAttempt(bookingId);
  if (!attempt?.txHash)
    throw new RequestError(
      409,
      "CONFLICT",
      "No submitted payment for this booking.",
    );
  const txHash = attempt.txHash;

  const tx = await paymentStatus(txHash);
  if (tx.status === "SUCCESS") {
    let received: string | null = null;
    try {
      const events = await paymentEvents(txHash);
      const match = events.items?.find((item) => {
        const data = item.data as Record<string, unknown> | null;
        return (
          item.kind === "RECEIVE" &&
          item.txHash === txHash &&
          (data?.amount === attempt.amountStroops ||
            data?.amountStroops === attempt.amountStroops ||
            data?.amountIn === attempt.amountStroops)
        );
      });
      received = match ? attempt.amountStroops : null;
    } catch {
      // Missing history is unresolved, not failure: do not mark paid.
    }
    if (received) {
      saveAttempt({
        ...getAttempt(bookingId)!,
        status: "VERIFIED",
        updatedAt: new Date().toISOString(),
      });
      transitionBooking(bookingId, "PAID", txHash);
      return {
        status: "SUCCESS",
        txHash,
        verified: true,
        booking: bookingView(getBooking(bookingId)!),
      };
    }
    return {
      status: "SUCCESS",
      txHash,
      verified: false,
      booking: bookingView(getBooking(bookingId)!),
    };
  }
  if (tx.status === "FAILED") {
    saveAttempt({
      ...getAttempt(bookingId)!,
      status: "FAILED",
      updatedAt: new Date().toISOString(),
    });
    transitionBooking(bookingId, "PAYMENT_FAILED", txHash);
    return {
      status: "FAILED",
      txHash,
      verified: false,
      booking: bookingView(getBooking(bookingId)!),
    };
  }
  return {
    status: tx.status,
    txHash,
    verified: false,
    booking: bookingView(getBooking(bookingId)!),
  };
}
