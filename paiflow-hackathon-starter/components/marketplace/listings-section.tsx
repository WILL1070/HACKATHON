"use client";
import type { DemoListing } from "@/lib/demo-listings";
import { ListingCard } from "@/components/marketplace/listing-card";

export function ListingsSection({
  listings,
  resultNote,
}: {
  listings: DemoListing[];
  resultNote: string;
}) {
  return (
    <section className="sf-section" id="explore">
      <div className="sf-section-head">
        <h2 className="sf-section-title">Explore stays &amp; spaces</h2>
        <p className="sf-section-sub">{resultNote}</p>
      </div>
      {listings.length === 0 ? (
        <div className="sf-empty">
          <p className="sf-empty-emoji" aria-hidden="true">
            🧭
          </p>
          <p>No demo spaces match that search yet.</p>
          <p className="sf-muted">Try a different location or category.</p>
        </div>
      ) : (
        <div className="sf-grid">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </section>
  );
}
