import { z } from "zod";

export const mobileAuthTicketRequestSchema = z.object({
  ip: z
    .string()
    .trim()
    .regex(/^[0-9A-Fa-f:.]{3,64}$/)
    .nullable(),
});

export const mobileAuthTicketResponseSchema = z.object({
  ticket: z.string().min(1).max(4096),
  expiresInSeconds: z.literal(60),
});

export type MobileAuthTicketRequest = z.infer<
  typeof mobileAuthTicketRequestSchema
>;
