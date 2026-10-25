import { setPromotionActive } from "@/lib/promotions";
import { handle, sameOrigin, readJson, RequestError } from "@/lib/http";
import { limitPaymentRequests } from "@/lib/payment-rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return handle(async () => {
    sameOrigin(request);
    limitPaymentRequests("request");
    const { id } = await context.params;
    const body = await readJson(request);
    const active = (body as Record<string, unknown> | null)?.active;
    if (typeof active !== "boolean")
      throw new RequestError(400, "VALIDATION", "Invalid request.");
    return setPromotionActive(id, active);
  });
}
