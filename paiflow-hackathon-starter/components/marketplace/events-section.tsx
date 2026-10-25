"use client";
import { useEffect, useState } from "react";
import { browserRequest } from "@/lib/browser-api";
import type { MarketplaceEvent } from "@/lib/events";
import { EventCard } from "@/components/marketplace/event-card";

/** Homepage preview of published upcoming events; links to /events. */
export function EventsSection() {
  const [events, setEvents] = useState<MarketplaceEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    browserRequest<MarketplaceEvent[]>("/api/events?when=upcoming")
      .then((result) => setEvents(result.slice(0, 3)))
      .catch(() => setEvents([]))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || events.length === 0) return null;

  return (
    <section className="sf-section" id="events-preview">
      <div className="sf-section-head">
        <h2 className="sf-section-title sf-serif">Events &amp; Festivals</h2>
        <p className="sf-section-sub">
          What&apos;s on near your next stay — verified dates only.
        </p>
      </div>
      <div className="sf-grid">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <a href="/events" className="sf-btn sf-btn-ghost">
          Browse all events
        </a>
      </div>
    </section>
  );
}
