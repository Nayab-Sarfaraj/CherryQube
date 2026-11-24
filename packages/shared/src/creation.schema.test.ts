import { describe, expect, it } from "vitest";
import {
  entitlementsResponseSchema,
  guestImportResponseSchema,
  guestListResponseSchema,
  invitationDetailSchema,
  invitationListResponseSchema,
  renderJobSchema,
} from "./creation.schema";

describe("creation schemas", () => {
  it("validates renderJobSchema correctly", () => {
    const valid = {
      id: "render-1",
      status: "ready",
      tier: "free",
      fileUrl: "http://example.com/video.mp4",
      posterUrl: "http://example.com/poster.jpg",
    };
    expect(renderJobSchema.parse(valid)).toEqual(valid);

    const uncertain = {
      id: "render-2",
      status: "submission_uncertain",
      tier: "free",
      error: "Render submission unconfirmed",
    };
    expect(renderJobSchema.parse(uncertain)).toEqual(uncertain);
  });

  it("validates invitationDetailSchema with optional publicUrl and currentRender", () => {
    const valid = {
      id: "inv-1",
      shareId: "share-abc",
      publicUrl: "http://localhost:3000/c/share-abc",
      templateId: "harvest-card",
      title: "Harvest Greeting",
      type: "card",
      themeId: "thanksgiving",
      props: { senderName: "Alice" },
      status: "ready",
      guestCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentRender: {
        id: "render-1",
        status: "ready",
        tier: "free",
        fileUrl: "http://example.com/video.mp4",
      },
    };
    const parsed = invitationDetailSchema.parse(valid);
    expect(parsed.publicUrl).toBe("http://localhost:3000/c/share-abc");
    expect(parsed.currentRender?.id).toBe("render-1");
  });

  it("validates invitationListResponseSchema with items and nextCursor", () => {
    const list = {
      items: [
        {
          id: "inv-1",
          templateId: "harvest-card",
          title: "Harvest Greeting",
          props: {},
          status: "draft",
          guestCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      nextCursor: "next-id",
    };
    const parsed = invitationListResponseSchema.parse(list);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.nextCursor).toBe("next-id");
  });

  it("validates guestItemSchema and guestListResponseSchema", () => {
    const guest = {
      id: "guest-1",
      name: "Nayab Sarfaraj",
      token: "tok-123",
      link: "https://example.com/i/tok-123",
      contact: { method: "email" as const, value: "test@example.com" },
      createdAt: new Date().toISOString(),
    };
    expect(guestListResponseSchema.parse([guest])).toEqual([guest]);
  });

  it("validates guestImportResponseSchema", () => {
    const importRes = {
      guests: [
        {
          id: "guest-1",
          name: "Guest One",
          token: "tok-1",
          link: "https://example.com/i/tok-1",
          createdAt: new Date().toISOString(),
        },
      ],
      created: 1,
      updated: 0,
    };
    expect(guestImportResponseSchema.parse(importRes)).toEqual(importRes);
  });

  it("validates entitlementsResponseSchema", () => {
    const valid = { balance: 3 };
    expect(entitlementsResponseSchema.parse(valid)).toEqual(valid);
  });
});
