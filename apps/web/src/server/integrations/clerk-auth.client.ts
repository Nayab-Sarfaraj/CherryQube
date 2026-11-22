import { clerkClient } from "@clerk/nextjs/server";

export interface ClerkAuthClient {
  createSignInTicket(userId: string, expiresInSeconds: number): Promise<string>;
}

export const clerkAuthClient: ClerkAuthClient = {
  async createSignInTicket(userId, expiresInSeconds) {
    const client = await clerkClient();
    const ticket = await client.signInTokens.createSignInToken({
      userId,
      expiresInSeconds,
    });
    return ticket.token;
  },
};
