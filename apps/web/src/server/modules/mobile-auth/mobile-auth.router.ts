import { errorResponse } from "../../lib/errors";
import { requireUser } from "../../middleware/auth";
import { mobileAuthTicketRequestSchema } from "./mobile-auth.schema";
import { mobileAuthService } from "./mobile-auth.service";

function clientIp(request: Request) {
  const raw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return mobileAuthTicketRequestSchema.parse({ ip: raw || null }).ip;
}

export async function create(request: Request) {
  try {
    return Response.json(
      await mobileAuthService.createTicket(
        await requireUser(),
        clientIp(request),
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
