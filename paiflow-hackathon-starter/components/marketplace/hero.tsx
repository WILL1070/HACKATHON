"use client";
import { useEffect, useState } from "react";
import { CATEGORIES, HERO_IMAGE_URL, HERO_IMAGE_SECONDARY_URL } from "@/lib/demo-listings";
import type { ListingCategory } from "@/lib/demo-listings";

export type SearchFilters = {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  category: ListingCategory | "all";
};

function toDateInputValue(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function Hero({
  onSearch,
}: {
  onSearch: (filters: SearchFilters) => void;
}) {
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [category, setCategory] = useState<ListingCategory | "all">("all");

  // Set date defaults after mount to avoid server/client markup drift.
  useEffect(() => {
    setCheckIn(toDateInputValue(1));
    setCheckOut(toDateInputValue(3));
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    onSearch({ location, checkIn, checkOut, guests, category });
    document
      .getElementById("explore")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="sf-hero">
      <div className="sf-hero-copy">
        <p className="sf-eyebrow">XLM payments · Freighter</p>
        <h1 className="sf-hero-title">
          Find your next stay, space, or quiet corner —{" "}
          <span className="sf-hero-accent">book it in XLM.</span>
        </h1>
        <p className="sf-hero-sub">
          Hotels, vacation houses, lounges, conference rooms and study hubs in
          one warm, welcoming marketplace — settled on Stellar.
        </p>
        <div className="sf-search-wrap">
          <form
            className="sf-search"
            onSubmit={submit}
            aria-label="Search spaces"
          >
            <label className="sf-search-field sf-search-grow">
              <span>Location</span>
              <input
                className="sf-input"
                type="text"
                placeholder="Where to?"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>
            <label className="sf-search-field">
              <span>Check-in</span>
              <input
                className="sf-input"
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </label>
            <label className="sf-search-field">
              <span>Check-out</span>
              <input
                className="sf-input"
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </label>
            <label className="sf-search-field">
              <span>Guests</span>
              <select
                className="sf-input"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
              >
                {[1, 2, 3, 4, 6, 8, 12, 20, 30].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "guest" : "guests"}
                  </option>
                ))}
              </select>
            </label>
            <label className="sf-search-field">
              <span>Category</span>
              <select
                className="sf-input"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ListingCategory | "all")
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="sf-btn sf-btn-primary sf-search-btn">
              Search
            </button>
          </form>
        </div>
      </div>
      <div className="sf-hero-media" aria-hidden="true">
        <img
          className="sf-hero-photo"
          src={HERO_IMAGE_URL}
          alt="A welcoming boutique hotel lobby"
        />
        <img
          className="sf-hero-photo-small"
          src={HERO_IMAGE_SECONDARY_URL}
          alt=""
        />
        <p className="sf-hero-stat">
          <strong>4.9 ★</strong> average across demo spaces
        </p>
      </div>
    </section>
  );
}
