"use client";
import { useEffect, useRef, useState } from "react";
import { BrowserRequestError, browserRequest } from "@/lib/browser-api";
import { connectWallet, refreshWallet, restoreWallet, signPrepared } from "@/lib/wallet";
import { assertOriginal } from "@/lib/transaction";
import { confirmOriginal } from "@/lib/confirmation";
import type { Prepared } from "@/lib/types";

type Phase =
  | "loading"
  | "unavailable"
  | "idle"
  | "connecting"
  | "creating-booking"
  | "preparing"
  | "signing"
  | "submitting"
  | "verifying"
  | "confirmed"
  | "unverified-success"
  | "final-failed"
  | "rejected"
  | "unresolved";

type BookingView = {
  id: string;
  listingTitle: string;
  hostName: string;
  unitLabel: string;
  totalXlm: number;
  totalStroops: string;
  status: string;
  txHash: string | null;
  resourceLabel?: string | null;
  startHour?: number | null;
  promotionLabel?: string | null;
  discountXlm?: number | null;
};

type StatusResult = {
  status: string;
  txHash: string;
  verified: boolean;
  booking: BookingView;
};

export function CheckoutPayment({
  listingId,
  checkIn,
  checkOut,
  guests,
  units,
  resourceId,
  startHour,
}: {
  listingId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  units: number;
  resourceId?: string;
  startHour?: number;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [address, setAddress] = useState("");
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [signedXdr, setSignedXdr] = useState("");
  const [txHash, setTxHash] = useState("");
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    browserRequest<{ ready: boolean }>("/api/integration")
      .then((config) => {
        if (!cancelled) setPhase(config.ready ? "idle" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) setPhase("unavailable");
      });
    // Silently re-attach to an already-authorized wallet after a reload so a
    // refreshed checkout page does not force a fresh connection prompt.
    restoreWallet().then((restored) => {
      if (!cancelled && restored) setAddress(restored);
    });
    return () => {
      cancelled = true;
      active.current?.abort();
    };
  }, []);

  async function handleConnect() {
    const controller = new AbortController();
    active.current = controller;
    setPhase("connecting");
    setMessage("");
    try {
      setAddress(await connectWallet());
      setPhase("idle");
    } catch (error) {
      setPhase("idle");
      setMessage(error instanceof Error ? error.message : "Could not connect.");
    } finally {
      if (active.current === controller) active.current = null;
    }
  }

  async function handlePrepare() {
    if (!address) return;
    setPhase("creating-booking");
    setMessage("");
    try {
      const created = await browserRequest<BookingView>("/api/bookings", {
        listingId,
        checkIn,
        checkOut,
        guests,
        units,
        ...(resourceId ? { resourceId } : {}),
        ...(startHour !== undefined ? { startHour } : {}),
      });
      setBooking(created);
      setPhase("preparing");
      const result = await browserRequest<{
        booking: BookingView;
        preparation: Prepared;
      }>("/api/pay", {
        action: "prepareBooking",
        bookingId: created.id,
        from: address,
      });
      setBooking(result.booking);
      setPrepared(result.preparation);
      setPhase("idle");
      setMessage(
        `Payment prepared for ${result.booking.totalXlm} XLM (booking ${result.booking.id.slice(0, 8)}…). Review and sign in Freighter.`,
      );
    } catch (error) {
      setPhase("idle");
      setMessage(error instanceof Error ? error.message : "Preparation failed.");
    }
  }

  async function handleSign() {
    if (!prepared || !address || !booking) return;
    const controller = new AbortController();
    active.current = controller;
    setPhase("signing");
    setMessage("");
    try {
      const envelope = await (async () => {
        if ((await refreshWallet()) !== address)
          throw new Error("Reconnect the original wallet.");
        return signPrepared(prepared, address);
      })();
      assertOriginal(prepared.xdr, envelope, prepared.txHash);
      setSignedXdr(envelope);
      setPhase("idle");
      setMessage("Signed envelope verified against the original preparation.");
    } catch (error) {
      setPhase("idle");
      setMessage(error instanceof Error ? error.message : "Signing failed.");
    } finally {
      if (active.current === controller) active.current = null;
    }
  }

  async function checkBooking(signal: AbortSignal) {
    if (!booking) return;
    setPhase("verifying");
    let last: StatusResult | undefined;
    const outcome = await confirmOriginal({
      txHash: prepared?.txHash ?? "",
      signal,
      lookup: async (sig, remainingMs) => {
        last = await browserRequest<StatusResult>(
          "/api/pay",
          { action: "statusBooking", bookingId: booking.id },
          sig,
          remainingMs,
        );
        return { txHash: last.txHash, status: last.status, network: "testnet" };
      },
      onResult: () => {},
    });
    if (signal.aborted) {
      setPhase("unresolved");
      return;
    }
    const status = last?.status ?? "";
    if (status === "SUCCESS" && last?.verified) {
      setTxHash(last.txHash);
      setVerified(true);
      setPhase("confirmed");
      setMessage(
        "Payment confirmed: SUCCESS on the original hash and the expected amount was received by the deployment.",
      );
      return;
    }
    if (status === "SUCCESS" && !last?.verified) {
      setTxHash(last?.txHash ?? "");
      setPhase("unverified-success");
      setMessage(
        "The transaction reports SUCCESS, but receipt verification is incomplete, so this booking is NOT marked paid. Check again shortly.",
      );
      return;
    }
    if (status === "FAILED") {
      setPhase("final-failed");
      setMessage("The transaction FAILED on the network. No payment is confirmed.");
      return;
    }
    if (status === "REJECTED" || outcome === "rejected") {
      setPhase("rejected");
      setMessage("The transaction was rejected.");
      return;
    }
    setPhase("unresolved");
    setMessage(
      "Confirmation is still pending. The original hash is retained — check again; never start a replacement payment.",
    );
  }

  async function handleSubmit() {
    if (!booking || !prepared || !signedXdr) return;
    const controller = new AbortController();
    active.current = controller;
    setPhase("submitting");
    setMessage("");
    try {
      const result = await browserRequest<{ txHash: string; status: string }>(
        "/api/pay",
        {
          action: "submitBooking",
          bookingId: booking.id,
          signedXdr,
          preparationRequestId: prepared.preparationRequestId,
        },
      );
      setTxHash(result.txHash);
    } catch (error) {
      if (
        error instanceof BrowserRequestError &&
        error.status < 500 &&
        error.code !== "UPSTREAM_RPC"
      ) {
        setPhase("idle");
        setMessage(error.message);
        return;
      }
      // Transport errors are unresolved, not failures — check the original.
    }
    await checkBooking(controller.signal);
  }

  function handleRecheck() {
    const controller = new AbortController();
    active.current = controller;
    void checkBooking(controller.signal);
  }

  function stopChecking() {
    active.current?.abort();
    setPhase("unresolved");
  }

  const busy = [
    "connecting",
    "creating-booking",
    "preparing",
    "signing",
    "submitting",
    "verifying",
  ].includes(phase);

  const steps = [
    {
      label: address
        ? `Wallet connected (${address.slice(0, 6)}…${address.slice(-4)})`
        : "Connect your Freighter wallet",
      done: !!address,
      active: phase === "connecting",
    },
    {
      label: prepared
        ? `Payment prepared: ${booking?.totalXlm ?? "…"} XLM for ${booking?.unitLabel ?? ""}${booking?.resourceLabel ? ` · ${booking.resourceLabel}` : ""}`
        : booking
          ? "Preparing your payment…"
          : "Create booking & prepare payment",
      done: !!prepared,
      active: phase === "creating-booking" || phase === "preparing",
    },
    {
      label: signedXdr
        ? "Signed in Freighter and verified"
        : "Review and sign in Freighter",
      done: !!signedXdr,
      active: phase === "signing",
    },
    {
      label: "Submit and confirm",
      done: phase === "confirmed",
      active: phase === "submitting" || phase === "verifying",
    },
  ];

  return (
    <div className="sf-pay-panel">
      <h2>Pay with XLM</h2>
      <p className="sf-muted">
        Your payment is prepared for the exact booking total, signed by you in
        Freighter, and confirmed before the booking is marked paid.
      </p>
      <p className="sf-fineprint">
        Payments currently run on a Stellar test network — no real funds move.
      </p>

      {phase === "loading" && (
        <p className="sf-pay-status sf-pay-info">Checking payment configuration…</p>
      )}
      {phase === "unavailable" && (
        <p className="sf-pay-status sf-pay-warn" role="status">
          Payments are not configured on this server yet — the Paiflow
          deployment ID and API token are missing from the server environment.
          The checkout flow below is ready; add them to your server-side env
          file to enable it.
        </p>
      )}

      <ol className="sf-pay-steps">
        {steps.map((step) => (
          <li
            key={step.label}
            className={
              step.done
                ? "sf-pay-step sf-pay-step-done"
                : step.active
                  ? "sf-pay-step sf-pay-step-active"
                  : "sf-pay-step"
            }
          >
            {step.done ? "✓ " : ""}
            {step.label}
          </li>
        ))}
      </ol>

      <div className="sf-pay-actions">
        {!address ? (
          <button
            type="button"
            className="sf-btn sf-btn-primary"
            disabled={busy || phase === "unavailable" || phase === "loading"}
            onClick={handleConnect}
          >
            {phase === "connecting" ? "Connecting…" : "Connect Wallet"}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="sf-btn sf-btn-primary"
              disabled={busy || !!prepared || phase === "unavailable"}
              onClick={handlePrepare}
            >
              {phase === "creating-booking" || phase === "preparing"
                ? "Preparing…"
                : "Prepare payment"}
            </button>{" "}
            <button
              type="button"
              className="sf-btn sf-btn-ghost"
              disabled={busy || !prepared || !!signedXdr}
              onClick={handleSign}
            >
              {phase === "signing" ? "Waiting for Freighter…" : "Sign in Freighter"}
            </button>{" "}
            <button
              type="button"
              className="sf-btn sf-btn-primary"
              disabled={busy || !signedXdr}
              onClick={handleSubmit}
            >
              {phase === "submitting"
                ? "Submitting…"
                : phase === "verifying"
                  ? "Confirming…"
                  : "Submit & confirm"}
            </button>
          </>
        )}
      </div>

      {phase === "verifying" && (
        <div className="sf-pay-actions">
          <button
            type="button"
            className="sf-btn sf-btn-ghost sf-btn-sm"
            onClick={stopChecking}
          >
            Stop checking
          </button>
        </div>
      )}
      {(phase === "unresolved" ||
        phase === "rejected" ||
        phase === "unverified-success") &&
        booking && (
          <div className="sf-pay-actions">
            <button
              type="button"
              className="sf-btn sf-btn-ghost sf-btn-sm"
              disabled={busy}
              onClick={handleRecheck}
            >
              Check payment status
            </button>
          </div>
        )}

      {message && (
        <p
          className={`sf-pay-status ${
            phase === "confirmed"
              ? "sf-pay-ok"
              : phase === "final-failed" || phase === "rejected"
                ? "sf-pay-error"
                : phase === "unresolved" || phase === "unverified-success"
                  ? "sf-pay-warn"
                  : "sf-pay-info"
          }`}
          role="status"
        >
          {message}
        </p>
      )}

      {prepared && phase !== "confirmed" && (
        <p className="sf-muted" style={{ fontSize: "0.82rem", marginTop: 14 }}>
          Original transaction: <code className="sf-pay-hash">{prepared.txHash}</code>
        </p>
      )}

      {phase === "confirmed" && booking && (
        <div className="sf-confirm-card" style={{ marginTop: 20 }}>
          <h2>Payment confirmed</h2>
          <dl className="sf-confirm-rows">
            <div className="sf-confirm-row">
              <dt>Booking</dt>
              <dd>
                {booking.listingTitle} · {booking.unitLabel}
              </dd>
            </div>
            <div className="sf-confirm-row">
              <dt>Amount</dt>
              <dd>
                {booking.totalXlm} XLM
                {booking.promotionLabel && (booking.discountXlm ?? 0) > 0
                  ? ` (${booking.promotionLabel}, −${booking.discountXlm} XLM)`
                  : ""}
              </dd>
            </div>
            <div className="sf-confirm-row">
              <dt>Status</dt>
              <dd>SUCCESS — verified against the original hash and expected amount</dd>
            </div>
            <div className="sf-confirm-row">
              <dt>Transaction hash</dt>
              <dd>
                <code className="sf-pay-hash">{txHash}</code>
              </dd>
            </div>
            <div className="sf-confirm-row">
              <dt>Host</dt>
              <dd>{booking.hostName}</dd>
            </div>
          </dl>
          <p className="sf-muted" style={{ fontSize: "0.85rem", marginTop: 14 }}>
            Next verification step: cross-check this hash&apos;s PAYOUT events
            against the configured host-settlement and commission recipients
            before fulfilment. Transaction confirmation alone is not final
            application payment verification.
          </p>
        </div>
      )}
    </div>
  );
}
