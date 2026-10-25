import type { MarketplaceEvent } from "@/lib/events";

export const EVENT_CATEGORY_LABELS: Record<string, string> = {
  festival: "Festival",
  cultural: "Cultural",
  concert: "Concert",
  fair: "Fair",
  convention: "Convention",
  community: "Community",
};

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return startDate === endDate
    ? fmt(start)
    : `${fmt(start)} – ${fmt(end)}`;
}

export function EventCard({ event }: { event: MarketplaceEvent }) {
  return (
    <article className="sf-card sf-event-card">
      <div className="sf-card-img">
        <img src={event.coverImageUrl} alt={event.name} loading="lazy" />
        <span className="sf-card-tag">
          {EVENT_CATEGORY_LABELS[event.category] ?? event.category}
        </span>
        {event.tentative && (
          <span className="sf-event-chip sf-event-chip-tentative">
            Dates tentative
          </span>
        )}
      </div>
      <div className="sf-card-body">
        <div className="sf-card-top">
          <h3 className="sf-card-title">{event.name}</h3>
          {event.verified ? (
            <span className="sf-event-chip sf-event-chip-verified" title="Dates checked against an official source">
              ✓ Verified
            </span>
          ) : (
            <span className="sf-event-chip sf-event-chip-unverified">
              Unverified
            </span>
          )}
        </div>
        <p className="sf-card-location">
          {formatDateRange(event.startDate, event.endDate)}
          {event.tentative ? " (typical month — not announced)" : ""} ·{" "}
          {event.venue}, {event.city}
          {event.province ? `, ${event.province}` : ""}
        </p>
        <p className="sf-card-details">{event.description}</p>
        <div className="sf-card-bottom">
          <p className="sf-card-details">Organized by {event.organizer}</p>
          <a
            href={`/events/${event.id}`}
            className="sf-btn sf-btn-primary sf-btn-sm"
          >
            View event
          </a>
        </div>
      </div>
    </article>
  );
}
