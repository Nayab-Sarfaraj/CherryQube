import { z } from "zod";

export const renderJobSchema = z.object({
  id: z.string(),
  invitationId: z.string().optional(),
  invitationIds: z.array(z.string()).optional(),
  status: z.enum(["queued", "rendering", "ready", "failed"]),
  tier: z.enum(["free", "hd"]),
  fileUrl: z.string().optional(),
  posterUrl: z.string().optional(),
  error: z.string().optional(),
});

export const hostContactSchema = z.object({
  method: z.enum(["email", "whatsapp", "sms"]),
  value: z.string(),
});

export const invitationDetailSchema = z.object({
  id: z.string(),
  shareId: z.string().optional(),
  publicUrl: z.string().optional(),
  templateId: z.string(),
  title: z.string(),
  type: z.enum(["card", "invitation"]).optional(),
  themeId: z.string().optional(),
  props: z.record(z.string(), z.unknown()),
  hostContact: hostContactSchema.optional(),
  status: z.string(),
  guestCount: z.number().int().nonnegative().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
  posterUrl: z.string().optional(),
  currentRender: renderJobSchema.nullable().optional(),
});

export const invitationListResponseSchema = z.object({
  items: z.array(invitationDetailSchema),
  nextCursor: z.string().nullable(),
});

export const guestContactSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("email"), value: z.string().email().max(160) }),
  z.object({
    method: z.literal("phone"),
    value: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s().-]{7,20}$/, "Enter a valid phone number"),
  }),
]);

export const guestItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  token: z.string(),
  link: z.string(),
  contact: guestContactSchema.optional(),
  createdAt: z.string(),
});

export const guestListResponseSchema = z.array(guestItemSchema);

export const guestAddResponseSchema = z.object({
  guests: z.array(guestItemSchema),
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
});

export const guestImportResponseSchema = z.object({
  guests: z.array(guestItemSchema),
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
});

export const entitlementsResponseSchema = z.object({
  balance: z.number().int().nonnegative(),
});

export type RenderJobDto = z.infer<typeof renderJobSchema>;
export type InvitationDetailDto = z.infer<typeof invitationDetailSchema>;
export type InvitationListResponseDto = z.infer<
  typeof invitationListResponseSchema
>;
export type GuestItemDto = z.infer<typeof guestItemSchema>;
export type GuestListResponseDto = z.infer<typeof guestListResponseSchema>;
export type GuestAddResponseDto = z.infer<typeof guestAddResponseSchema>;
export type GuestImportResponseDto = z.infer<typeof guestImportResponseSchema>;
export type EntitlementsResponseDto = z.infer<
  typeof entitlementsResponseSchema
>;
