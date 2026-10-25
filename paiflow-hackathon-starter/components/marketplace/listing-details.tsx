"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { categoryLabel } from "@/lib/demo-listings";
import type { DemoListing } from "@/lib/demo-listings";
import { browserRequest } from "@/lib/browser-api";

function toDateInputValue(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

type BusySlots = Record<string, { startHour: number; endHour: number }[]>;

/** Structural mirror of EventPromotion (the lib module is server-only). */
type PromoLite = {
  id: string;
  label: string;
  kind: "percent" | "fixed";
  value: number;
  startDate: string;
  endDate: string;
  terms: string;
  active: boolean;
};

function formatHour(hour: number) {
  return `${String(hour % 24).padStart(2, "0")}:00`;
}

export function ListingDetails({ listing }: { listing: DemoListing }) {
  const router = useRouter();
  const seats = listing.seats ?? [];
  const hasSeats = seats.length > 0;
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(String(Math.min(2, listing.guests)));
  const [hours, setHours] = useState("4");
  const [resourceId, setResourceId] = useState(seats[0]?.id ?? "");
  const [startHour, setStartHour] = useState<number | null>(null);
  const [busy, setBusy] = useState<BusySlots>({});
  const [promotions, setPromotions] = useState<PromoLite[]>([]);

  useEffect(() => {
    let cancelled = false;
    browserRequest<PromoLite[]>(
      `/api/admin/promotions?listingId=${encodeURIComponent(listing.id)}`,
    )
      .then((result) => {
        if (!cancelled) setPromotions(result.filter((p) => p.active));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [listing.id]);

  useEffect(() => {
    // Nightly stays default to tomorrow; time-slot reservations to today.
    setCheckIn(toDateInputValue(hasSeats ? 0 : 1));
    setCheckOut(toDateInputValue(hasSeats ? 0 : 3));
  }, [hasSeats]);

  const isNightly = listing.priceUnit === "night";

  // Live availability for reservable units on the selected date.
  useEffect(() => {
    if (!hasSeats || !checkIn) return;
    let cancelled = false;
    browserRequest<{ busy: BusySlots }>(
      `/api/bookings?listingId=${encodeURIComponent(listing.id)}&date=${checkIn}`,
    )
      .then((result) => {
        if (!cancelled) setBusy(result.busy);
      })
      .catch(() => {
        if (!cancelled) setBusy({});
      });
    return () => {
      cancelled = true;
    };
  }, [hasSeats, checkIn, listing.id]);

  const nights = useMemo(() => {
    const start = Date.parse(checkIn);
    const end = Date.parse(checkOut);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      return 1;
    return Math.max(1, Math.round((end - start) / 86_400_000));
  }, [checkIn, checkOut]);

  // Whole-hour start options inside the published opening window (handles
  // overnight windows such as 10:00–02:00).
  const startOptions = useMemo(() => {
    const range = listing.openingHours;
    if (!range) return [];
    const options: number[] = [];
    for (let h = range.open; h !== range.close; h = (h + 1) % 24) {
      options.push(h);
      if (options.length > 24) break;
    }
    return options;
  }, [listing.openingHours]);

  const effectiveStart = startHour ?? startOptions[0] ?? null;
  const durationOptions = useMemo(() => {
    if (effectiveStart === null || !listing.openingHours) return [1, 2, 3, 4, 6, 8];
    const { close } = listing.openingHours;
    return [1, 2, 3, 4, 6, 8].filter((n) => {
      const end = effectiveStart + n;
      return close > effectiveStart
        ? end <= close
        : end <= 24 || end - 24 <= close;
    });
  }, [effectiveStart, listing.openingHours]);

  const unitCount = isNightly ? nights : Math.max(1, Number(hours) || 1);
  const unitLabel = isNightly
    ? `${nights} ${nights === 1 ? "night" : "nights"}`
    : `${unitCount} ${unitCount === 1 ? "hour" : "hours"}`;
  const baseTotal = listing.priceXlm * unitCount;
  const activePromo = promotions.find(
    (promotion) =>
      promotion.startDate <= checkIn && promotion.endDate >= checkIn,
  );
  const discount = activePromo
    ? activePromo.kind === "percent"
      ? Math.round(baseTotal * (activePromo.value / 100) * 10_000_000) / 10_000_000
      : activePromo.value * unitCount
    : 0;
  const total = Math.round((baseTotal - discount) * 10_000_000) / 10_000_000;
  const selectedSeat = seats.find((s) => s.id === resourceId);
  const belowMinSpend =
    listing.minSpendXlm !== undefined && total < listing.minSpendXlm;

  const slotBusy =
    hasSeats && effectiveStart !== null
      ? (busy[resourceId] ?? []).filter(
          (slot) => effectiveStart < slot.endHour && effectiveStart + unitCount > slot.startHour,
        )
      : [];

  function book() {
    const params = new URLSearchParams({
      checkIn,
      checkOut: hasSeats ? checkIn : checkOut,
      guests,
      units: String(unitCount),
    });
    if (hasSeats && effectiveStart !== null) {
      params.set("resource", resourceId);
      params.set("start", String(effectiveStart));
    }
    router.push(`/checkout/${listing.id}?${params.toString()}`);
  }

  const facts: string[] = [];
  if (listing.openingHours)
    facts.push(
      `Open daily ${formatHour(listing.openingHours.open)}–${formatHour(listing.openingHours.close)}${listing.openingHours.note ? ` · ${listing.openingHours.note}` : ""}`,
    );
  if (listing.wifi) facts.push(`Wi-Fi: ${listing.wifi}`);
  if (listing.powerOutlets) facts.push(`Power outlets: ${listing.powerOutlets}`);
  if (listing.seatingTypes?.length)
    facts.push(`Seating: ${listing.seatingTypes.join(", ")}`);
  if (listing.noiseLevel)
    facts.push(`Noise level: ${listing.noiseLevel}`);
  if (listing.pcSpecs) facts.push(`PCs: ${listing.pcSpecs}`);
  if (listing.gamingEquipment?.length)
    facts.push(`Gaming gear: ${listing.gamingEquipment.join(", ")}`);
  if (listing.verifiedSpeedMbps)
    facts.push(`Verified line: ${listing.verifiedSpeedMbps} Mbps`);
  if (listing.amenities?.length)
    facts.push(`Amenities: ${listing.amenities.join(", ")}`);
  if (listing.minSpendXlm !== undefined)
    facts.push(`Minimum spend ${listing.minSpendXlm} XLM per reservation`);
  if (listing.reservationKinds?.length)
    facts.push(
      `Reserve: ${listing.reservationKinds.join(" / ")} — ${seats.length} unit${seats.length === 1 ? "" : "s"} available`,
    );

  return (
    <div className="sf-detail">
      <div>
        <div className="sf-detail-hero">
          <img src={listing.imageUrl} alt={listing.title} />
        </div>
        <h1 className="sf-detail-title">{listing.title}</h1>
        <p className="sf-detail-meta">
          <span className="sf-card-rating">
            ★ {listing.rating.toFixed(1)} ({listing.reviews} reviews)
          </span>
          <span>{listing.location}</span>
          <span>{categoryLabel(listing.category)}</span>
          <span>
            {listing.guests} {listing.guests === 1 ? "guest" : "guests"}
          </span>
          {listing.beds > 0 && <span>{listing.beds} bedrooms</span>}
        </p>
        <p className="sf-detail-desc">{listing.description}</p>
        {facts.map((fact) => (
          <p key={fact} className="sf-detail-desc sf-muted">
            {fact}
          </p>
        ))}
        <p className="sf-detail-desc sf-muted">
          Demo listing — sample data only. Host: {listing.hostName}. Prices are
          shown in XLM; no real booking is created yet.
        </p>
      </div>
      <aside className="sf-detail-panel">
        <p className="sf-detail-price">
          <strong>{listing.priceXlm} XLM</strong>
          <span>/ {listing.priceUnit}</span>
        </p>
        <div className="sf-booking-rows">
          {isNightly ? (
            <>
              <label className="sf-field">
                <span>Check-in</span>
                <input
                  className="sf-input"
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </label>
              <label className="sf-field">
                <span>Check-out</span>
                <input
                  className="sf-input"
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </label>
            </>
          ) : hasSeats ? (
            <>
              <label className="sf-field">
                <span>Date</span>
                <input
                  className="sf-input"
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </label>
              <label className="sf-field">
                <span>{listing.category === "internet-cafe" ? "Computer" : "Table / seat"}</span>
                <select
                  className="sf-input"
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                >
                  {seats.map((seat) => (
                    <option key={seat.id} value={seat.id}>
                      {seat.label}
                      {seat.specs ? ` — ${seat.specs}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sf-field">
                <span>Start time</span>
                <select
                  className="sf-input"
                  value={effectiveStart ?? ""}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                >
                  {startOptions.map((h) => (
                    <option key={h} value={h}>
                      {formatHour(h)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sf-field">
                <span>Duration</span>
                <select
                  className="sf-input"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                >
                  {durationOptions.map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "hour" : "hours"}
                    </option>
                  ))}
                </select>
              </label>
              {selectedSeat && (busy[resourceId]?.length ?? 0) > 0 && (
                <p className="sf-fineprint">
                  {selectedSeat.label} already reserved:{" "}
                  {(busy[resourceId] ?? [])
                    .map((s) => `${formatHour(s.startHour)}–${formatHour(s.endHour)}`)
                    .join(", ")}
                </p>
              )}
              {slotBusy.length > 0 && (
                <p className="sf-fineprint" role="status">
                  Your selection overlaps a reserved slot — pick another time.
                </p>
              )}
            </>
          ) : (
            <label className="sf-field">
              <span>Duration (hours)</span>
              <select
                className="sf-input"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              >
                {[1, 2, 3, 4, 6, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "hour" : "hours"}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="sf-field">
            <span>Guests</span>
            <select
              className="sf-input"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
            >
              {Array.from(
                { length: Math.min(listing.guests, 12) },
                (_, i) => i + 1,
              ).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "guest" : "guests"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="sf-price-breakdown">
          {activePromo && discount > 0 && (
            <>
              <div className="sf-price-row">
                <span>
                  {listing.priceXlm} XLM × {unitLabel}
                </span>
                <span style={{ textDecoration: "line-through" }}>
                  {baseTotal} XLM
                </span>
              </div>
              <div className="sf-price-row">
                <span>
                  {activePromo.label}
                  {activePromo.terms ? ` (${activePromo.terms})` : ""}
                </span>
                <span>−{discount} XLM</span>
              </div>
            </>
          )}
          {!activePromo && (
            <div className="sf-price-row">
              <span>
                {listing.priceXlm} XLM × {unitLabel}
              </span>
              <span>{baseTotal} XLM</span>
            </div>
          )}
          <div className="sf-price-row">
            <span>Service fee (demo)</span>
            <span>0 XLM</span>
          </div>
          <div className="sf-price-row sf-price-total">
            <span>Total (demo)</span>
            <span>{total} XLM</span>
          </div>
        </div>
        <button
          type="button"
          className="sf-btn sf-btn-primary sf-btn-block"
          onClick={book}
          disabled={
            (isNightly && (!checkIn || !checkOut)) ||
            (hasSeats && (slotBusy.length > 0 || effectiveStart === null)) ||
            belowMinSpend
          }
        >
          Proceed to checkout
        </button>
        {belowMinSpend && (
          <p className="sf-fineprint" role="status">
            Minimum spend is {listing.minSpendXlm} XLM — choose a longer
            duration.
          </p>
        )}
        <p className="sf-fineprint">
          Payments settle on Stellar via Paiflow.
        </p>
      </aside>
    </div>
  );
}
