"use client";
import { useMemo, useState } from "react";
import type { DemoListing } from "@/lib/demo-listings";
import { ListingCard } from "@/components/marketplace/listing-card";
import { categoryLabel } from "@/lib/demo-listings";

export type NearbyMatch = { listing: DemoListing; matchedOn: string };

/**
 * Nearby-listing discovery for an event. Listings only carry human-readable
 * location strings (no coordinates), so filtering is by matched location,
 * category, and price — never by distance, and never automatic booking.
 */
export function NearbyListings({ matches }: { matches: NearbyMatch[] }) {
  const [category, setCategory] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");

  const categories = useMemo(
    () => [...new Set(matches.map((m) => m.listing.category))].sort(),
    [matches],
  );

  const filtered = useMemo(() => {
    const cap = Number(maxPrice);
    return matches.filter(({ listing }) => {
      if (category !== "all" && listing.category !== category) return false;
      if (maxPrice && Number.isFinite(cap) && listing.priceXlm > cap)
        return false;
      return true;
    });
  }, [matches, category, maxPrice]);

  if (matches.length === 0)
    return (
      <div className="sf-empty">
        <p>
          No marketplace listings are registered near this venue yet, so we
          can&apos;t suggest any — we only show stays and spaces with a
          reliable location match.
        </p>
      </div>
    );

  return (
    <div>
      <div className="sf-event-filters">
        <select
          className="sf-input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by listing category"
        >
          <option value="all">All categories</option>
          {categories.map((key) => (
            <option key={key} value={key}>
              {categoryLabel(key as DemoListing["category"])}
            </option>
          ))}
        </select>
        <input
          className="sf-input"
          type="number"
          min="0"
          step="0.5"
          placeholder="Max price (XLM / unit)"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          aria-label="Filter by maximum price"
        />
      </div>
      <p className="sf-muted" style={{ fontSize: "0.85rem" }}>
        Matched by location name ({matches[0]?.matchedOn ?? "location"}); no
        distance claims. Selecting a listing never books anything.
      </p>
      {filtered.length === 0 ? (
        <div className="sf-empty">
          <p>No nearby listings match those filters.</p>
        </div>
      ) : (
        <div className="sf-grid">
          {filtered.map(({ listing }) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
