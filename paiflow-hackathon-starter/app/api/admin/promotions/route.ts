import { createPromotion, listPromotions } from "@/lib/promotions";
import { handle, sameOrigin, readJson, RequestError } from "@/lib/http";
import { limitPaymentRequests } from "@/lib/payment-rate-limit";

export async function GET(request: Request) {
  return handle(async () => {
    const listingId = new URL(request.url).searchParams.get("listingId");
    return listPromotions(listingId ? { listingId } : {});
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    sameOrigin(request);
    limitPaymentRequests("request");
    const body = await readJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new RequestError(400, "VALIDATION", "Invalid request.");
    return createPromotion(body as Record<string, unknown>);
  });
}
