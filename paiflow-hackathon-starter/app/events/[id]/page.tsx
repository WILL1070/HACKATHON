import { getEvent, nearbyListings } from "@/lib/events";
import { Navbar } from "@/components/marketplace/navbar";
import { Footer } from "@/components/marketplace/footer";
import { NearbyListings } from "@/components/events/nearby-listings";
import { EVENT_CATEGORY_LABELS } from "@/components/marketplace/event-card";

export const dynamic = "force-dynamic";

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  return startDate === endDate
    ? fmt(start)
    : `${fmt(start)} – ${fmt(end)}`;
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = getEvent(id);

  // Draft, unpublished and archived events are not public.
  if (!event || event.status !== "PUBLISHED") {
    return (
      <div className="sf-page">
        <Navbar />
        <main className="sf-main">
          <div className="sf-simple">
            <p className="sf-simple-emoji" aria-hidden="true">
              🎪
            </p>
            <h1>Event not found</h1>
            <p>
              This event is not published. Events appear here only after an
              admin verifies their dates against an official source.
            </p>
            <a href="/events" className="sf-btn sf-btn-primary sf-btn-sm">
              Browse events
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const matches = nearbyListings(event);

  return (
    <div className="sf-page">
      <Navbar />
      <main className="sf-main">
        <div className="sf-detail">
          <div>
            <div className="sf-detail-hero">
              <img src={event.coverImageUrl} alt={event.name} />
            </div>
            <p className="sf-eyebrow">
              {EVENT_CATEGORY_LABELS[event.category] ?? event.category}
            </p>
            <h1 className="sf-detail-title">{event.name}</h1>
            <p className="sf-detail-meta">
              {event.verified ? (
                <span className="sf-event-chip sf-event-chip-verified">
                  ✓ Verified
                  {event.lastVerifiedAt
                    ? ` · ${new Date(event.lastVerifiedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : ""}
                </span>
              ) : (
                <span className="sf-event-chip sf-event-chip-unverified">
                  Unverified
                </span>
              )}
              <span>
                {formatDateRange(event.startDate, event.endDate)}
              </span>
              <span>
                {event.venue}, {event.city}
                {event.province ? `, ${event.province}` : ""}
              </span>
              <span>Organized by {event.organizer}</span>
            </p>
            {event.tentative && (
              <p className="sf-pay-status sf-pay-warn" role="status">
                Dates are tentative — the official schedule has not been
                announced. Details may change.
              </p>
            )}
            <p className="sf-detail-desc">{event.description}</p>
            {event.schedule && event.schedule.length > 0 && (
              <>
                <h2 className="sf-section-title" style={{ fontSize: "1.25rem" }}>
                  Schedule
                </h2>
                <dl className="sf-confirm-rows">
                  {event.schedule.map((item, index) => (
                    <div key={index} className="sf-confirm-row">
                      <dt>{item.time}</dt>
                      <dd>
                        {item.title}
                        {item.description ? ` — ${item.description}` : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
            {event.officialLinks.length > 0 && (
              <>
                <h2 className="sf-section-title" style={{ fontSize: "1.25rem" }}>
                  Official information
                </h2>
                <p className="sf-detail-desc">
                  {event.officialLinks.map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      style={{ marginRight: 12 }}
                    >
                      {new URL(link).hostname}
                    </a>
                  ))}
                </p>
              </>
            )}
            {event.ticketingLinks && event.ticketingLinks.length > 0 && (
              <>
                <h2 className="sf-section-title" style={{ fontSize: "1.25rem" }}>
                  Tickets &amp; registration
                </h2>
                <p className="sf-detail-desc sf-muted">
                  StayFlow does not sell tickets. External organizers handle
                  ticketing and registration:
                </p>
                <p className="sf-detail-desc">
                  {event.ticketingLinks.map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      style={{ marginRight: 12 }}
                    >
                      {new URL(link).hostname}
                    </a>
                  ))}
                </p>
              </>
            )}
          </div>
        </div>
        <section className="sf-section" id="nearby">
          <div className="sf-section-head">
            <h2 className="sf-section-title sf-serif">
              Stays &amp; spaces near {event.venue}
            </h2>
            <p className="sf-section-sub">
              Browse existing marketplace listings with a matching location.
              Nothing is booked automatically.
            </p>
          </div>
          <NearbyListings matches={matches} />
        </section>
      </main>
      <Footer />
    </div>
  );
}
