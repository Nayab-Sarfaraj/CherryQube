import {
  clerkAuthClient,
  type ClerkAuthClient,
} from "../../integrations/clerk-auth.client";
import { AppError } from "../../lib/errors";
import { rateLimit } from "../../lib/rate-limit";

export const MOBILE_TICKET_TTL_SECONDS = 60;

type Dependencies = {
  clerk: ClerkAuthClient;
  limit: typeof rateLimit;
};

export class MobileAuthService {
  constructor(private readonly dependencies: Dependencies) {}

  async createTicket(owner: string, ip: string | null) {
    await this.dependencies.limit(`mobile-auth:user:${owner}`, 10, 60_000);
    if (ip) await this.dependencies.limit(`mobile-auth:ip:${ip}`, 30, 60_000);
    try {
      const ticket = await this.dependencies.clerk.createSignInTicket(
        owner,
        MOBILE_TICKET_TTL_SECONDS,
      );
      return { ticket, expiresInSeconds: MOBILE_TICKET_TTL_SECONDS };
    } catch {
      throw new AppError(
        "UNAVAILABLE",
        "Mobile sign-in is temporarily unavailable",
        503,
      );
    }
  }
}

export const mobileAuthService = new MobileAuthService({
  clerk: clerkAuthClient,
  limit: rateLimit,
});
