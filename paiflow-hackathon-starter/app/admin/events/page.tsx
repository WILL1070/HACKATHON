"use client";
import { useCallback, useEffect, useState } from "react";
import { browserRequest, BrowserRequestError } from "@/lib/browser-api";
import type { MarketplaceEvent, EventCategory } from "@/lib/events";
import type { EventPromotion } from "@/lib/promotions";
import { DEMO_LISTINGS } from "@/lib/demo-listings";

const EVENT_CATEGORIES: EventCategory[] = [
  "festival",
  "cultural",
  "concert",
  "fair",
  "convention",
  "community",
];

type EventForm = {
  name: string;
  description: string;
  coverImageUrl: string;
  category: EventCategory;
  city: string;
  province: string;
  venue: string;
  startDate: string;
  endDate: string;
  organizer: string;
  officialLinks: string;
  ticketingLinks: string;
  tentative: boolean;
};

const EMPTY_FORM: EventForm = {
  name: "",
  description: "",
  coverImageUrl: "",
  category: "festival",
  city: "",
  province: "",
  venue: "",
  startDate: "",
  endDate: "",
  organizer: "",
  officialLinks: "",
  ticketingLinks: "",
  tentative: true,
};

function toForm(event: MarketplaceEvent): EventForm {
  return {
    name: event.name,
    description: event.description,
    coverImageUrl: event.coverImageUrl,
    category: event.category,
    city: event.city,
    province: event.province ?? "",
    venue: event.venue,
    startDate: event.startDate,
    endDate: event.endDate,
    organizer: event.organizer,
    officialLinks: event.officialLinks.join("\n"),
    ticketingLinks: (event.ticketingLinks ?? []).join("\n"),
    tentative: event.tentative,
  };
}

function linksToArray(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function AdminEventsPage() {
  const [tab, setTab] = useState<"events" | "promotions">("events");
  const [events, setEvents] = useState<MarketplaceEvent[]>([]);
  const [promotions, setPromotions] = useState<EventPromotion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [promo, setPromo] = useState({
    listingId: DEMO_LISTINGS[0]?.id ?? "",
    eventId: "",
    label: "",
    kind: "percent" as "percent" | "fixed",
    value: "10",
    startDate: "",
    endDate: "",
    terms: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [allEvents, allPromotions] = await Promise.all([
      browserRequest<MarketplaceEvent[]>("/api/events?all=1"),
      browserRequest<EventPromotion[]>("/api/admin/promotions"),
    ]);
    setEvents(allEvents);
    setPromotions(allPromotions);
  }, []);

  useEffect(() => {
    refresh().catch(() => setError("Could not load admin data."));
  }, [refresh]);

  function report(promise: Promise<unknown>, ok: string) {
    setError("");
    setMessage("");
    promise
      .then(async () => {
        setMessage(ok);
        await refresh();
      })
      .catch((e) =>
        setError(
          e instanceof BrowserRequestError
            ? e.message
            : "Request failed. Nothing was changed.",
        ),
      );
  }

  function submitEvent() {
    const payload = {
      ...form,
      province: form.province || undefined,
      officialLinks: linksToArray(form.officialLinks),
      ticketingLinks: linksToArray(form.ticketingLinks),
    };
    if (editingId) {
      report(
        browserRequest(`/api/events/${editingId}`, payload),
        "Event updated.",
      );
    } else {
      report(browserRequest("/api/events", payload), "Event created as draft.");
    }
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function action(id: string, action: string, ok: string) {
    report(
      browserRequest(`/api/events/${id}`, { action }),
      ok,
    );
  }

  function submitPromotion() {
    report(
      browserRequest("/api/admin/promotions", {
        listingId: promo.listingId,
        eventId: promo.eventId || undefined,
        label: promo.label,
        kind: promo.kind,
        value: Number(promo.value),
        startDate: promo.startDate,
        endDate: promo.endDate,
        terms: promo.terms,
      }),
      "Promotion created.",
    );
  }

  const field = (key: keyof EventForm) => ({
    value: form[key] as string,
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <div className="sf-page">
      <nav className="sf-nav">
        <div className="sf-nav-inner">
          <a className="sf-brand" href="/">
            <span className="sf-brand-mark" aria-hidden="true">◈</span> StayFlow
          </a>
          <div className="sf-nav-links">
            <a href="/events">Events</a>
            <a href="/#explore">Marketplace</a>
          </div>
        </div>
      </nav>
      <main className="sf-main">
        <p className="sf-pay-status sf-pay-warn" role="status">
          Demo admin — no authentication. Anyone with this URL can manage
          events and promotions. Do not deploy this page as-is.
        </p>
        <div className="sf-event-when" style={{ margin: "16px 0" }}>
          <button
            type="button"
            className={tab === "events" ? "sf-btn sf-btn-primary sf-btn-sm" : "sf-btn sf-btn-ghost sf-btn-sm"}
            onClick={() => setTab("events")}
          >
            Events
          </button>
          <button
            type="button"
            className={tab === "promotions" ? "sf-btn sf-btn-primary sf-btn-sm" : "sf-btn sf-btn-ghost sf-btn-sm"}
            onClick={() => setTab("promotions")}
          >
            Promotions
          </button>
        </div>

        {message && <p className="sf-pay-status sf-pay-ok" role="status">{message}</p>}
        {error && <p className="sf-pay-status sf-pay-error" role="status">{error}</p>}

        {tab === "events" && (
          <>
            <section className="sf-section">
              <div className="sf-section-head">
                <h2 className="sf-section-title">
                  {editingId ? "Edit event" : "Create event"}
                </h2>
                <p className="sf-section-sub">
                  New events are drafts. Verify dates against an official
                  source, then publish — tentative dates can never be
                  published as confirmed.
                </p>
              </div>
              <div className="sf-admin-form">
                <label className="sf-field">
                  <span>Name</span>
                  <input className="sf-input" required {...field("name")} />
                </label>
                <label className="sf-field">
                  <span>Type</span>
                  <select className="sf-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as EventCategory })}>
                    {EVENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="sf-field">
                  <span>City</span>
                  <input className="sf-input" required {...field("city")} />
                </label>
                <label className="sf-field">
                  <span>Province (optional)</span>
                  <input className="sf-input" {...field("province")} />
                </label>
                <label className="sf-field">
                  <span>Venue</span>
                  <input className="sf-input" required {...field("venue")} />
                </label>
                <label className="sf-field">
                  <span>Start date</span>
                  <input className="sf-input" type="date" required {...field("startDate")} />
                </label>
                <label className="sf-field">
                  <span>End date</span>
                  <input className="sf-input" type="date" required {...field("endDate")} />
                </label>
                <label className="sf-field">
                  <span>Organizer</span>
                  <input className="sf-input" required {...field("organizer")} />
                </label>
                <label className="sf-field">
                  <span>Cover image URL</span>
                  <input className="sf-input" type="url" required placeholder="https://…" {...field("coverImageUrl")} />
                </label>
                <label className="sf-field">
                  <span>Official source links (one per line)</span>
                  <textarea className="sf-input" rows={2} placeholder="https://official-site.example/…" {...field("officialLinks")} />
                </label>
                <label className="sf-field">
                  <span>Ticketing / registration links (optional; StayFlow does not sell tickets)</span>
                  <textarea className="sf-input" rows={2} {...field("ticketingLinks")} />
                </label>
                <label className="sf-field">
                  <span>Description</span>
                  <textarea className="sf-input" rows={4} required {...field("description")} />
                </label>
                <label className="sf-field sf-admin-checkbox">
                  <input
                    type="checkbox"
                    checked={form.tentative}
                    onChange={(e) => setForm({ ...form, tentative: e.target.checked })}
                  />
                  <span>Dates are tentative (not officially announced)</span>
                </label>
                <div className="sf-pay-actions">
                  <button type="button" className="sf-btn sf-btn-primary" onClick={submitEvent}>
                    {editingId ? "Save changes" : "Create draft event"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      className="sf-btn sf-btn-ghost"
                      onClick={() => {
                        setEditingId(null);
                        setForm(EMPTY_FORM);
                      }}
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="sf-section">
              <div className="sf-section-head">
                <h2 className="sf-section-title">All events</h2>
              </div>
              {events.length === 0 ? (
                <p className="sf-muted">No events yet.</p>
              ) : (
                <div className="sf-admin-table">
                  {events.map((event) => (
                    <div key={event.id} className="sf-admin-row">
                      <div>
                        <strong>{event.name}</strong>
                        <p className="sf-muted" style={{ margin: "4px 0" }}>
                          {event.startDate} → {event.endDate} · {event.city} ·{" "}
                          <span className={`sf-event-chip sf-event-chip-${event.status.toLowerCase()}`}>
                            {event.status}
                          </span>{" "}
                          {event.verified ? (
                            <span className="sf-event-chip sf-event-chip-verified">verified</span>
                          ) : (
                            <span className="sf-event-chip sf-event-chip-unverified">unverified</span>
                          )}{" "}
                          {event.tentative && (
                            <span className="sf-event-chip sf-event-chip-tentative">tentative</span>
                          )}
                        </p>
                      </div>
                      <div className="sf-admin-row-actions">
                        <button type="button" className="sf-btn sf-btn-ghost sf-btn-sm" onClick={() => { setEditingId(event.id); setForm(toForm(event)); }}>
                          Edit
                        </button>
                        {!event.verified && (
                          <button type="button" className="sf-btn sf-btn-ghost sf-btn-sm" onClick={() => report(browserRequest(`/api/events/${event.id}`, { verified: true }), "Marked verified — record the official source you checked.")}>
                            Mark verified
                          </button>
                        )}
                        {event.status !== "PUBLISHED" && event.status !== "ARCHIVED" && (
                          <button type="button" className="sf-btn sf-btn-primary sf-btn-sm" onClick={() => action(event.id, "publish", "Event published.")}>
                            Publish
                          </button>
                        )}
                        {event.status === "PUBLISHED" && (
                          <button type="button" className="sf-btn sf-btn-ghost sf-btn-sm" onClick={() => action(event.id, "unpublish", "Event unpublished.")}>
                            Unpublish
                          </button>
                        )}
                        {event.status !== "ARCHIVED" && (
                          <button type="button" className="sf-btn sf-btn-ghost sf-btn-sm" onClick={() => action(event.id, "archive", "Event archived.")}>
                            Archive
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {tab === "promotions" && (
          <section className="sf-section">
            <div className="sf-section-head">
              <h2 className="sf-section-title">Host promotions</h2>
              <p className="sf-section-sub">
                Event-period discounts applied transparently at checkout.
                Existing bookings are never changed.
              </p>
            </div>
            <div className="sf-admin-form">
              <label className="sf-field">
                <span>Listing</span>
                <select className="sf-input" value={promo.listingId} onChange={(e) => setPromo({ ...promo, listingId: e.target.value })}>
                  {DEMO_LISTINGS.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sf-field">
                <span>Event (optional)</span>
                <select className="sf-input" value={promo.eventId} onChange={(e) => setPromo({ ...promo, eventId: e.target.value })}>
                  <option value="">— no event tie —</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sf-field">
                <span>Label</span>
                <input className="sf-input" required placeholder="Dinagyang week — 15% off" value={promo.label} onChange={(e) => setPromo({ ...promo, label: e.target.value })} />
              </label>
              <label className="sf-field">
                <span>Discount type</span>
                <select className="sf-input" value={promo.kind} onChange={(e) => setPromo({ ...promo, kind: e.target.value as "percent" | "fixed" })}>
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed (XLM per unit)</option>
                </select>
              </label>
              <label className="sf-field">
                <span>{promo.kind === "percent" ? "Percent (1–90)" : "XLM per unit"}</span>
                <input className="sf-input" type="number" min="1" max={promo.kind === "percent" ? 90 : undefined} step="0.5" required value={promo.value} onChange={(e) => setPromo({ ...promo, value: e.target.value })} />
              </label>
              <label className="sf-field">
                <span>From</span>
                <input className="sf-input" type="date" required value={promo.startDate} onChange={(e) => setPromo({ ...promo, startDate: e.target.value })} />
              </label>
              <label className="sf-field">
                <span>To</span>
                <input className="sf-input" type="date" required value={promo.endDate} onChange={(e) => setPromo({ ...promo, endDate: e.target.value })} />
              </label>
              <label className="sf-field">
                <span>Terms</span>
                <textarea className="sf-input" rows={2} value={promo.terms} onChange={(e) => setPromo({ ...promo, terms: e.target.value })} />
              </label>
              <div className="sf-pay-actions">
                <button type="button" className="sf-btn sf-btn-primary" onClick={submitPromotion}>
                  Create promotion
                </button>
              </div>
            </div>

            <h3 className="sf-section-title" style={{ marginTop: 32 }}>Existing promotions</h3>
            {promotions.length === 0 ? (
              <p className="sf-muted">No promotions yet.</p>
            ) : (
              <div className="sf-admin-table">
                {promotions.map((promotion) => (
                  <div key={promotion.id} className="sf-admin-row">
                    <div>
                      <strong>{promotion.label}</strong>
                      <p className="sf-muted" style={{ margin: "4px 0" }}>
                        {DEMO_LISTINGS.find((l) => l.id === promotion.listingId)?.title ?? promotion.listingId}
                        {" · "}
                        {promotion.kind === "percent" ? `${promotion.value}% off` : `${promotion.value} XLM off per unit`}
                        {" · "}
                        {promotion.startDate} → {promotion.endDate}
                        {promotion.eventName ? ` · ${promotion.eventName}` : ""}
                        {" · "}
                        <span className={`sf-event-chip ${promotion.active ? "sf-event-chip-verified" : "sf-event-chip-unverified"}`}>
                          {promotion.active ? "active" : "inactive"}
                        </span>
                      </p>
                      <p className="sf-muted" style={{ margin: "4px 0" }}>{promotion.terms}</p>
                    </div>
                    <div className="sf-admin-row-actions">
                      <button
                        type="button"
                        className="sf-btn sf-btn-ghost sf-btn-sm"
                        onClick={() =>
                          report(
                            browserRequest(`/api/admin/promotions/${promotion.id}`, {
                              active: !promotion.active,
                            }),
                            promotion.active ? "Promotion deactivated." : "Promotion activated.",
                          )
                        }
                      >
                        {promotion.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
