import { getEvent, updateEvent, transitionEvent } from "@/lib/events";
import { handle, sameOrigin, readJson, RequestError } from "@/lib/http";
import { limitPaymentRequests } from "@/lib/payment-rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  return handle(async () => {
    const { id } = await context.params;
    const event = getEvent(id);
    if (!event) throw new RequestError(404, "NOT_FOUND", "Unknown event.");
    return event;
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return handle(async () => {
    sameOrigin(request);
    limitPaymentRequests("request");
    const { id } = await context.params;
    const body = await readJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new RequestError(400, "VALIDATION", "Invalid request.");
    const action = (body as Record<string, unknown>).action;
    if (action === "publish" || action === "unpublish" || action === "archive")
      return transitionEvent(id, action);
    const { action: _omitted, ...patch } = body as Record<string, unknown>;
    return updateEvent(id, patch);
  });
}
