"use client";
import { useEffect, useMemo, useState } from "react";
import { browserRequest } from "@/lib/browser-api";
import type { MarketplaceEvent, EventCategory } from "@/lib/events";
import { EventCard, EVENT_CATEGORY_LABELS } from "@/components/marketplace/event-card";

type When = "upcoming" | "past" | "all";

export function EventsBrowser() {
  const [events, setEvents] = useState<MarketplaceEvent[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState<EventCategory | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [when, setWhen] = useState<When>("upcoming");

  useEffect(() => {
    browserRequest<MarketplaceEvent[]>("/api/events?when=all")
      .then(setEvents)
      .catch(() => setFailed(true));
  }, []);

  const cities = useMemo(
    () =>
      [...new Set((events ?? []).map((event) => event.city))].sort(),
    [events],
  );

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const needle = query.trim().toLowerCase();
    return (events ?? [])
      .filter((event) =>
        when === "all"
          ? true
          : when === "upcoming"
            ? event.endDate >= today
            : event.endDate < today,
      )
      .filter((event) => !city || event.city === city)
      .filter((event) => category === "all" || event.category === category)
      .filter((event) => !from || event.endDate >= from)
      .filter((event) => !to || event.startDate <= to)
      .filter(
        (event) =>
          !needle ||
          [event.name, event.description, event.venue, event.organizer]
            .join(" ")
            .toLowerCase()
            .includes(needle),
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [events, query, city, category, from, to, when]);

  if (failed)
    return (
      <div className="sf-empty">
        <p>Events could not be loaded. Try again shortly.</p>
      </div>
    );
  if (events === null)
    return (
      <div className="sf-empty">
        <p>Loading events…</p>
      </div>
    );

  return (
    <section className="sf-section" id="events">
      <div className="sf-section-head">
        <h2 className="sf-section-title sf-serif">Events &amp; Festivals</h2>
        <p className="sf-section-sub">
          Festivals, cultural events, concerts, fairs, conventions and
          community activities — dates are published only after verification.
        </p>
      </div>
      <div className="sf-event-filters">
        <input
          className="sf-input"
          type="search"
          placeholder="Search events, venues, organizers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search events"
        />
        <select
          className="sf-input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          aria-label="Filter by location"
        >
          <option value="">All locations</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="sf-input"
          value={category}
          onChange={(e) => setCategory(e.target.value as EventCategory | "all")}
          aria-label="Filter by event type"
        >
          <option value="all">All types</option>
          {Object.entries(EVENT_CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <label className="sf-event-filter-date">
          <span>From</span>
          <input
            className="sf-input"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="sf-event-filter-date">
          <span>To</span>
          <input
            className="sf-input"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <div className="sf-event-when" role="tablist" aria-label="Time window">
          {(["upcoming", "past", "all"] as When[]).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={when === option}
              className={
                when === option ? "sf-btn sf-btn-primary sf-btn-sm" : "sf-btn sf-btn-ghost sf-btn-sm"
              }
              onClick={() => setWhen(option)}
            >
              {option === "all" ? "All" : option === "upcoming" ? "Upcoming" : "Past"}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="sf-empty">
          <p className="sf-empty-emoji" aria-hidden="true">
            🎪
          </p>
          <p>No published events match those filters.</p>
          <p className="sf-muted">
            New events appear here once an admin verifies and publishes them.
          </p>
        </div>
      ) : (
        <div className="sf-grid">
          {filtered.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
}
