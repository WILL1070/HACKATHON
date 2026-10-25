"use client";
import { useEffect, useState } from "react";
import { BrowserRequestError, browserRequest } from "@/lib/browser-api";

type BookingRow = {
  id: string;
  listingId: string;
  listingTitle: string;
  hostName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  units: number;
  unitLabel: string;
  resourceLabel: string | null;
  startHour: number | null;
  promotionLabel: string | null;
  discountXlm: number | null;
  totalXlm: number;
  status: string;
  txHash: string | null;
};

const STATUS_CHIP: Record<string, string> = {
  PAID: "sf-event-chip-published",
  PENDING_PAYMENT: "sf-event-chip-tentative",
  UNRESOLVED: "sf-event-chip-draft",
  PAYMENT_FAILED: "sf-event-chip-archived",
};

function slotLabel(b: BookingRow) {
  if (b.startHour === null) return null;
  const end = b.startHour + b.units;
  const fmt = (h: number) => String(h % 24).padStart(2, "0");
  const overnight = end >= 24;
  return `${fmt(b.startHour)}:00–${fmt(end)}:00${
    overnight ? " (+1 day)" : ""
  }`;
}

export function BookingsList() {
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    browserRequest<{ bookings: BookingRow[] }>("/api/bookings")
      .then((result) => {
        if (!cancelled) setBookings(result.bookings);
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            e instanceof BrowserRequestError
              ? e.message
              : "Could not load bookings.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error)
    return (
      <div className="sf-empty">
        <p className="sf-empty-emoji" aria-hidden="true">
          ⚠️
        </p>
        <p>{error}</p>
      </div>
    );

  if (bookings === null)
    return (
      <div className="sf-empty">
        <p>Loading your bookings…</p>
      </div>
    );

  if (bookings.length === 0)
    return (
      <div className="sf-simple">
        <p className="sf-simple-emoji" aria-hidden="true">
          🗝️
        </p>
        <h1>No bookings yet</h1>
        <p>
          When you book a space on StayFlow, your reservations will appear
          here.
        </p>
        <a href="/#explore" className="sf-btn sf-btn-primary sf-btn-sm">
          Explore spaces
        </a>
      </div>
    );

  return (
    <div className="sf-bookings">
      <h1>My bookings</h1>
      <p className="sf-muted" style={{ marginBottom: 20 }}>
        Demo storage only — bookings live in the server&apos;s memory and
        disappear when the dev server restarts.
      </p>
      <ul className="sf-booking-list">
        {bookings.map((b) => {
          const slot = slotLabel(b);
          return (
            <li key={b.id} className="sf-booking-row">
              <div className="sf-booking-main">
                <a href={`/listing/${b.listingId}`} className="sf-booking-title">
                  {b.listingTitle}
                </a>
                <span className={`sf-event-chip ${STATUS_CHIP[b.status] ?? "sf-event-chip-draft"}`}>
                  {b.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="sf-muted" style={{ fontSize: "0.88rem" }}>
                {b.checkIn} → {b.checkOut} · {b.guests} guest
                {b.guests === 1 ? "" : "s"} · {b.units} {b.unitLabel}
                {b.resourceLabel ? ` · ${b.resourceLabel}` : ""}
                {slot ? ` · ${slot}` : ""} · host: {b.hostName}
              </p>
              <p className="sf-booking-amount">
                {b.totalXlm} XLM
                {b.promotionLabel && (b.discountXlm ?? 0) > 0
                  ? ` (${b.promotionLabel}, −${b.discountXlm} XLM)`
                  : ""}
              </p>
              {b.txHash && (
                <p className="sf-muted" style={{ fontSize: "0.8rem" }}>
                  Transaction: <code className="sf-pay-hash">{b.txHash}</code>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
