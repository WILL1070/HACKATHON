import "server-only";
import { RequestError } from "@/lib/http";
import { DEMO_LISTINGS } from "@/lib/demo-listings";
import type { DemoListing } from "@/lib/demo-listings";

export type EventCategory =
  | "festival"
  | "cultural"
  | "concert"
  | "fair"
  | "convention"
  | "community";

export type EventStatus = "DRAFT" | "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED";

export type EventScheduleItem = {
  time: string;
  title: string;
  description?: string;
};

export type MarketplaceEvent = {
  id: string;
  name: string;
  description: string;
  coverImageUrl: string;
  category: EventCategory;
  city: string;
  province?: string;
  venue: string;
  /** YYYY-MM-DD. May be tentative — see `tentative`. */
  startDate: string;
  endDate: string;
  schedule?: EventScheduleItem[];
  organizer: string;
  /** Official sources used for verification. */
  officialLinks: string[];
  verified: boolean;
  lastVerifiedAt: string | null;
  /** True when dates are not yet officially announced. */
  tentative: boolean;
  /** Optional external ticketing/registration links. StayFlow does not sell tickets. */
  ticketingLinks?: string[];
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
};

export type EventInput = {
  name?: unknown;
  description?: unknown;
  coverImageUrl?: unknown;
  category?: unknown;
  city?: unknown;
  province?: unknown;
  venue?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  schedule?: unknown;
  organizer?: unknown;
  officialLinks?: unknown;
  ticketingLinks?: unknown;
  tentative?: unknown;
};

export type EventFilter = {
  query?: string;
  city?: string;
  category?: EventCategory | "all";
  /** Inclusive ISO date bounds. */
  from?: string;
  to?: string;
  when?: "upcoming" | "past" | "all";
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORIES: EventCategory[] = [
  "festival",
  "cultural",
  "concert",
  "fair",
  "convention",
  "community",
];

const events = new Map<string, MarketplaceEvent>();

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new RequestError(422, "VALIDATION", `${label} is required.`);
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requireUrl(value: unknown, label: string): string {
  const raw = requireString(value, label);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new RequestError(422, "VALIDATION", `${label} must be a valid URL.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:")
    throw new RequestError(422, "VALIDATION", `${label} must be http(s).`);
  return raw;
}

function optionalUrlList(value: unknown, label: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10)
    throw new RequestError(422, "VALIDATION", `${label} must be a list of URLs.`);
  return value.map((item) => requireUrl(item, label));
}

function parseDate(value: unknown, label: string): string {
  const raw = requireString(value, label);
  if (!DATE_RE.test(raw) || !Number.isFinite(Date.parse(raw)))
    throw new RequestError(422, "VALIDATION", `${label} must be a YYYY-MM-DD date.`);
  return raw;
}

function validateDateRange(startDate: string, endDate: string) {
  if (Date.parse(endDate) < Date.parse(startDate))
    throw new RequestError(
      422,
      "VALIDATION",
      "End date must not be before the start date.",
    );
}

function parseSchedule(value: unknown): EventScheduleItem[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 100)
    throw new RequestError(422, "VALIDATION", "Schedule must be a list.");
  return value.map((item) => {
    if (!item || typeof item !== "object")
      throw new RequestError(422, "VALIDATION", "Invalid schedule entry.");
    const entry = item as Record<string, unknown>;
    return {
      time: requireString(entry.time, "Schedule time"),
      title: requireString(entry.title, "Schedule title"),
      description: optionalString(entry.description),
    };
  });
}

export function createEvent(input: EventInput): MarketplaceEvent {
  const name = requireString(input.name, "Event name");
  const description = requireString(input.description, "Description");
  const coverImageUrl = requireUrl(input.coverImageUrl, "Cover image URL");
  const category = requireString(input.category, "Category");
  if (!CATEGORIES.includes(category as EventCategory))
    throw new RequestError(422, "VALIDATION", "Unknown event category.");
  const city = requireString(input.city, "City");
  const venue = requireString(input.venue, "Venue");
  const startDate = parseDate(input.startDate, "Start date");
  const endDate = parseDate(input.endDate, "End date");
  validateDateRange(startDate, endDate);
  const organizer = requireString(input.organizer, "Organizer");
  const officialLinks = optionalUrlList(input.officialLinks, "Official links");
  const ticketingLinks = optionalUrlList(input.ticketingLinks, "Ticketing links");
  const tentative = input.tentative === true;
  const schedule = parseSchedule(input.schedule);
  const now = new Date().toISOString();
  const event: MarketplaceEvent = {
    id: crypto.randomUUID(),
    name,
    description,
    coverImageUrl,
    category: category as EventCategory,
    city,
    province: optionalString(input.province),
    venue,
    startDate,
    endDate,
    ...(schedule ? { schedule } : {}),
    organizer,
    officialLinks,
    verified: false,
    lastVerifiedAt: null,
    tentative,
    ...(ticketingLinks.length ? { ticketingLinks } : {}),
    status: "DRAFT",
    createdAt: now,
    updatedAt: now,
  };
  events.set(event.id, event);
  return event;
}

export function getEvent(id: string): MarketplaceEvent | undefined {
  return events.get(id);
}

export type EventPatch = Partial<EventInput> & {
  verified?: unknown;
  tentative?: unknown;
};

export function updateEvent(id: string, patch: EventPatch): MarketplaceEvent {
  const event = events.get(id);
  if (!event) throw new RequestError(404, "NOT_FOUND", "Unknown event.");
  const next: MarketplaceEvent = { ...event, updatedAt: new Date().toISOString() };

  if (patch.name !== undefined) next.name = requireString(patch.name, "Event name");
  if (patch.description !== undefined)
    next.description = requireString(patch.description, "Description");
  if (patch.coverImageUrl !== undefined)
    next.coverImageUrl = requireUrl(patch.coverImageUrl, "Cover image URL");
  if (patch.category !== undefined) {
    const category = requireString(patch.category, "Category");
    if (!CATEGORIES.includes(category as EventCategory))
      throw new RequestError(422, "VALIDATION", "Unknown event category.");
    next.category = category as EventCategory;
  }
  if (patch.city !== undefined) next.city = requireString(patch.city, "City");
  if (patch.province !== undefined)
    next.province = optionalString(patch.province);
  if (patch.venue !== undefined) next.venue = requireString(patch.venue, "Venue");
  if (patch.startDate !== undefined)
    next.startDate = parseDate(patch.startDate, "Start date");
  if (patch.endDate !== undefined)
    next.endDate = parseDate(patch.endDate, "End date");
  validateDateRange(next.startDate, next.endDate);
  if (patch.schedule !== undefined) next.schedule = parseSchedule(patch.schedule);
  if (patch.organizer !== undefined)
    next.organizer = requireString(patch.organizer, "Organizer");
  if (patch.officialLinks !== undefined)
    next.officialLinks = optionalUrlList(patch.officialLinks, "Official links");
  if (patch.ticketingLinks !== undefined)
    next.ticketingLinks = optionalUrlList(patch.ticketingLinks, "Ticketing links");
  if (patch.tentative !== undefined) {
    if (typeof patch.tentative !== "boolean")
      throw new RequestError(422, "VALIDATION", "Tentative must be boolean.");
    next.tentative = patch.tentative;
  }
  if (patch.verified !== undefined) {
    if (typeof patch.verified !== "boolean")
      throw new RequestError(422, "VALIDATION", "Verified must be boolean.");
    next.verified = patch.verified;
    next.lastVerifiedAt = patch.verified ? new Date().toISOString() : null;
  }

  events.set(id, next);
  return next;
}

/**
 * Publication guard: unverified or tentative dates must never be presented as
 * confirmed. Verification requires at least one official source link.
 */
export function transitionEvent(
  id: string,
  action: "publish" | "unpublish" | "archive",
): MarketplaceEvent {
  const event = events.get(id);
  if (!event) throw new RequestError(404, "NOT_FOUND", "Unknown event.");
  if (action === "publish") {
    if (event.status === "ARCHIVED")
      throw new RequestError(409, "CONFLICT", "Archived events cannot be published.");
    if (event.tentative)
      throw new RequestError(
        409,
        "CONFLICT",
        "Tentative dates cannot be published as confirmed.",
      );
    if (!event.verified || !event.lastVerifiedAt)
      throw new RequestError(
        409,
        "CONFLICT",
        "Verify the event against an official source before publishing.",
      );
    if (!event.officialLinks.length)
      throw new RequestError(
        409,
        "CONFLICT",
        "Add at least one official source link before publishing.",
      );
    event.status = "PUBLISHED";
  }
  if (action === "unpublish") {
    if (event.status !== "PUBLISHED")
      throw new RequestError(409, "CONFLICT", "Event is not published.");
    event.status = "UNPUBLISHED";
  }
  if (action === "archive") {
    if (event.status === "ARCHIVED")
      throw new RequestError(409, "CONFLICT", "Event is already archived.");
    event.status = "ARCHIVED";
  }
  event.updatedAt = new Date().toISOString();
  return event;
}

export function listEvents(
  filter: EventFilter = {},
  { includeUnpublished = false } = {},
): MarketplaceEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  const query = filter.query?.trim().toLowerCase();
  return [...events.values()]
    .filter((event) => includeUnpublished || event.status === "PUBLISHED")
    .filter((event) => !filter.city || event.city.toLowerCase().includes(filter.city.trim().toLowerCase()))
    .filter((event) => !filter.category || filter.category === "all" || event.category === filter.category)
    .filter((event) => !filter.from || event.endDate >= filter.from)
    .filter((event) => !filter.to || event.startDate <= filter.to)
    .filter((event) => {
      if (!filter.when || filter.when === "all") return true;
      return filter.when === "upcoming" ? event.endDate >= today : event.endDate < today;
    })
    .filter((event) => {
      if (!query) return true;
      return [event.name, event.description, event.city, event.venue, event.organizer]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/**
 * Match marketplace listings near an event venue. Listings carry only
 * human-readable location strings (no coordinates), so "nearby" is a
 * city/location-token match — never a distance claim. Listings without a
 * location match are simply not shown as nearby.
 */
export function nearbyListings(event: MarketplaceEvent): {
  listing: DemoListing;
  matchedOn: string;
}[] {
  const generic = new Set(["city", "province", "region", "island"]);
  const tokens = `${event.city} ${event.province ?? ""}`
    .toLowerCase()
    .split(/[^a-zà-ÿ]+/)
    .filter((token) => token.length >= 4 && !generic.has(token));
  const matches: { listing: DemoListing; matchedOn: string }[] = [];
  for (const listing of DEMO_LISTINGS) {
    const location = listing.location.toLowerCase();
    const hit = tokens.find((token) => location.includes(token));
    if (hit) matches.push({ listing, matchedOn: hit });
  }
  return matches;
}

export { events as eventStoreForTests };

// Example festivals seeded as DRAFT + tentative + unverified. They are
// illustration data, NOT confirmed upcoming events: dates must be checked
// against an official source and verified before publishing.
const seed = (input: EventInput) => {
  const event = createEvent(input);
  events.set(event.id, event);
  return event;
};

seed({
  name: "Dinagyang Festival (example — unverified)",
  description:
    "Iloilo City's celebration of the Santo Niño with tribal dance competitions, food streets and religious processions. EXAMPLE ENTRY: dates are typical-month placeholders, not announced dates.",
  coverImageUrl:
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80",
  category: "festival",
  city: "Iloilo City",
  province: "Iloilo",
  venue: "City Proper parade route (verify)",
  startDate: "2027-01-24",
  endDate: "2027-01-26",
  organizer: "Iloilo City Government (verify)",
  officialLinks: [],
  tentative: true,
});

seed({
  name: "Panagbenga Festival (example — unverified)",
  description:
    "Baguio City's month-long flower festival with float parades, street dances and a market fair. EXAMPLE ENTRY: dates are typical-month placeholders, not announced dates.",
  coverImageUrl:
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
  category: "festival",
  city: "Baguio City",
  province: "Benguet",
  venue: "Session Road & Burnham Park (verify)",
  startDate: "2027-02-01",
  endDate: "2027-02-28",
  organizer: "Panagbenga Foundation (verify)",
  officialLinks: [],
  tentative: true,
});

seed({
  name: "Manggahan Festival (example — unverified)",
  description:
    "Guimaras' mango harvest festival with agri-trade fairs, cultural shows and the famed mango-eat-all contest. EXAMPLE ENTRY: dates are typical-month placeholders, not announced dates.",
  coverImageUrl:
    "https://images.unsplash.com/photo-1552960562-daf630e9278b?auto=format&fit=crop&w=1200&q=80",
  category: "festival",
  city: "Jordan",
  province: "Guimaras",
  venue: "Provincial Capitol grounds (verify)",
  startDate: "2027-05-11",
  endDate: "2027-05-22",
  organizer: "Province of Guimaras (verify)",
  officialLinks: [],
  tentative: true,
});
