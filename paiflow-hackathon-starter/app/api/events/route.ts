import { createEvent, listEvents } from "@/lib/events";
import type { EventCategory, EventFilter } from "@/lib/events";
import { handle, sameOrigin, readJson, RequestError } from "@/lib/http";
import { limitPaymentRequests } from "@/lib/payment-rate-limit";

const CATEGORIES = new Set([
  "festival",
  "cultural",
  "concert",
  "fair",
  "convention",
  "community",
]);

function readFilter(url: URL): EventFilter {
  const category = url.searchParams.get("category");
  const when = url.searchParams.get("when");
  return {
    ...(url.searchParams.get("q") ? { query: url.searchParams.get("q")! } : {}),
    ...(url.searchParams.get("city") ? { city: url.searchParams.get("city")! } : {}),
    ...(category && CATEGORIES.has(category)
      ? { category: category as EventCategory }
      : {}),
    ...(url.searchParams.get("from") ? { from: url.searchParams.get("from")! } : {}),
    ...(url.searchParams.get("to") ? { to: url.searchParams.get("to")! } : {}),
    ...(when === "upcoming" || when === "past" ? { when } : {}),
  };
}

export async function GET(request: Request) {
  return handle(async () => {
    const includeUnpublished =
      new URL(request.url).searchParams.get("all") === "1";
    return listEvents(readFilter(new URL(request.url)), { includeUnpublished });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    limitPaymentRequests("request");
    const body = await readJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new RequestError(400, "VALIDATION", "Invalid request.");
    return createEvent(body as Record<string, unknown>);
  });
}
