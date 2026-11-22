import { describe, expect, it, vi } from "vitest";
import { RateLimitError } from "../../lib/errors";
import {
  MobileAuthService,
  MOBILE_TICKET_TTL_SECONDS,
} from "./mobile-auth.service";

describe("MobileAuthService", () => {
  it("rate limits before issuing a short-lived ticket", async () => {
    const createSignInTicket = vi.fn().mockResolvedValue("ticket");
    const limit = vi.fn().mockResolvedValue(undefined);
    const service = new MobileAuthService({
      clerk: { createSignInTicket },
      limit,
    });

    await expect(
      service.createTicket("user_123", "192.0.2.1"),
    ).resolves.toEqual({
      ticket: "ticket",
      expiresInSeconds: MOBILE_TICKET_TTL_SECONDS,
    });
    expect(limit).toHaveBeenCalledWith("mobile-auth:user:user_123", 10, 60_000);
    expect(limit).toHaveBeenCalledWith("mobile-auth:ip:192.0.2.1", 30, 60_000);
    expect(createSignInTicket).toHaveBeenCalledWith("user_123", 60);
  });

  it("does not issue a ticket when rate limited", async () => {
    const createSignInTicket = vi.fn();
    const service = new MobileAuthService({
      clerk: { createSignInTicket },
      limit: vi.fn().mockRejectedValue(new RateLimitError()),
    });

    await expect(service.createTicket("user_123", null)).rejects.toBeInstanceOf(
      RateLimitError,
    );
    expect(createSignInTicket).not.toHaveBeenCalled();
  });
});
