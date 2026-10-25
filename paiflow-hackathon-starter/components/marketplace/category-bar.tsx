"use client";
import { CATEGORIES } from "@/lib/demo-listings";
import type { ListingCategory } from "@/lib/demo-listings";

export function CategoryBar({
  active,
  onSelect,
}: {
  active: ListingCategory | "all";
  onSelect: (category: ListingCategory | "all") => void;
}) {
  return (
    <div className="sf-section" id="categories">
      <div className="sf-section-head">
        <h2 className="sf-section-title sf-serif">Browse by category</h2>
        <p className="sf-section-sub">Every kind of space, one checkout.</p>
      </div>
      <div
        className="sf-cats"
        role="tablist"
        aria-label="Categories"
      >
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={active === c.key}
            className={active === c.key ? "sf-cat sf-cat-active" : "sf-cat"}
            onClick={() => onSelect(c.key)}
          >
            <img src={c.imageUrl} alt="" loading="lazy" />
            <span className="sf-cat-label">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
