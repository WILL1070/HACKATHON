"use client";
import { categoryLabel } from "@/lib/demo-listings";
import type { DemoListing } from "@/lib/demo-listings";

export function ListingCard({ listing }: { listing: DemoListing }) {
  const details = [
    `${listing.guests} ${listing.guests === 1 ? "guest" : "guests"}`,
    ...(listing.beds > 0
      ? [`${listing.beds} ${listing.beds === 1 ? "bedroom" : "bedrooms"}`]
      : []),
    categoryLabel(listing.category),
  ];

  return (
    <article className="sf-card">
      <div className="sf-card-img">
        <img src={listing.imageUrl} alt={listing.title} loading="lazy" />
        <span className="sf-card-demo-badge">Demo listing</span>
        {listing.tag && <span className="sf-card-tag">{listing.tag}</span>}
      </div>
      <div className="sf-card-body">
        <div className="sf-card-top">
          <h3 className="sf-card-title">{listing.title}</h3>
          <span className="sf-card-rating" title={`${listing.reviews} reviews`}>
            ★ {listing.rating.toFixed(1)}
          </span>
        </div>
        <p className="sf-card-location">{listing.location}</p>
        <p className="sf-card-details">
          {details.join(" · ")} · Hosted by {listing.hostName}
        </p>
        <div className="sf-card-bottom">
          <p className="sf-card-price">
            <strong>{listing.priceXlm} XLM</strong>
            <span> / {listing.priceUnit}</span>
          </p>
          {/* Payments are not wired to bookings yet; Book Now opens the
              booking-details page. */}
          <a
            href={`/listing/${listing.id}`}
            className="sf-btn sf-btn-primary sf-btn-sm"
          >
            Book Now
          </a>
        </div>
      </div>
    </article>
  );
}
