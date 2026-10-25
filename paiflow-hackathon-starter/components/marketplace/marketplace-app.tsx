"use client";
import { useMemo, useState } from "react";
import { DEMO_LISTINGS } from "@/lib/demo-listings";
import type { ListingCategory } from "@/lib/demo-listings";
import { Navbar } from "@/components/marketplace/navbar";
import { Hero } from "@/components/marketplace/hero";
import type { SearchFilters } from "@/components/marketplace/hero";
import { CategoryBar } from "@/components/marketplace/category-bar";
import { ListingsSection } from "@/components/marketplace/listings-section";
import { HostCta } from "@/components/marketplace/host-cta";
import { EventsSection } from "@/components/marketplace/events-section";
import { Footer } from "@/components/marketplace/footer";

export function MarketplaceApp() {
  const [category, setCategory] = useState<ListingCategory | "all">("all");
  const [search, setSearch] = useState<SearchFilters>({
    location: "",
    checkIn: "",
    checkOut: "",
    guests: "2",
    category: "all",
  });

  const listings = useMemo(() => {
    const locationNeedle = search.location.trim().toLowerCase();
    const maxGuests = Number.parseInt(search.guests, 10) || 0;
    return DEMO_LISTINGS.filter((listing) => {
      if (category !== "all" && listing.category !== category) return false;
      if (
        locationNeedle &&
        !listing.location.toLowerCase().includes(locationNeedle) &&
        !listing.title.toLowerCase().includes(locationNeedle)
      )
        return false;
      if (maxGuests > 0 && listing.guests < maxGuests) return false;
      return true;
    });
  }, [category, search]);

  const resultNote = useMemo(() => {
    const parts: string[] = [];
    if (category !== "all") parts.push("category");
    if (search.location.trim()) parts.push(`“${search.location.trim()}”`);
    const guests = Number.parseInt(search.guests, 10) || 0;
    if (guests > 0) parts.push(`${guests}+ guests`);
    return parts.length
      ? `${listings.length} demo ${listings.length === 1 ? "space" : "spaces"} · filtered by ${parts.join(" · ")}`
      : `${listings.length} demo spaces · sample data, prices in XLM`;
  }, [category, search, listings.length]);

  return (
    <div className="sf-page">
      <Navbar />
      <main className="sf-main">
        <Hero
          onSearch={(filters) => {
            setSearch(filters);
            setCategory(filters.category);
          }}
        />
        <CategoryBar active={category} onSelect={setCategory} />
        <ListingsSection listings={listings} resultNote={resultNote} />
        <EventsSection />
        <HostCta />
      </main>
      <Footer />
    </div>
  );
}
