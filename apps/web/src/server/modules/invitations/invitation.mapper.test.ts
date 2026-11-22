import { describe, expect, it } from "vitest";
import { templates } from "@greetings/remotion/templates";
import { invitationDto } from "./invitation.mapper";

describe("invitationDto", () => {
  const sample = {
    _id: "507f1f77bcf86cd799439011",
    templateId: templates[0].id,
    props: templates[0].defaultProps,
    guestCount: 5,
    status: "draft",
    createdAt: new Date("2026-11-20T10:00:00Z"),
    updatedAt: new Date("2026-11-20T11:00:00Z"),
  };

  it("maps invitation record to DTO without publicUrl when shareId is absent", () => {
    const dto = invitationDto(sample);
    expect(dto.id).toBe("507f1f77bcf86cd799439011");
    expect(dto.title).toBe(templates[0].title);
    expect(dto.publicUrl).toBeUndefined();
    expect(dto.guestCount).toBe(5);
    expect(dto.status).toBe("draft");
  });

  it("constructs stable publicUrl when shareId is present", () => {
    const dto = invitationDto({
      ...sample,
      shareId: "test-share-123",
    });
    expect(dto.shareId).toBe("test-share-123");
    expect(dto.publicUrl).toContain("/c/test-share-123");
  });

  it("reflects rendering status when pendingRender is queued or rendering", () => {
    const dto = invitationDto(sample, {
      _id: "607f1f77bcf86cd799439022",
      status: "queued",
      tier: "free",
      invitationId: "507f1f77bcf86cd799439011",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Parameters<typeof invitationDto>[1]);
    expect(dto.status).toBe("rendering");
    expect(dto.currentRender?.id).toBe("607f1f77bcf86cd799439022");
    expect(dto.currentRender?.status).toBe("queued");
  });

  it("keeps status as draft when edited even if a published render exists", () => {
    const editedDraft = {
      ...sample,
      shareId: "published-share-id",
      status: "draft",
    };
    const publishedReadyRender = {
      _id: "707f1f77bcf86cd799439033",
      status: "ready",
      tier: "free",
      invitationId: "507f1f77bcf86cd799439011",
      posterUrl: "/posters/published.jpg",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Parameters<typeof invitationDto>[2];

    const dto = invitationDto(editedDraft, null, publishedReadyRender);
    expect(dto.status).toBe("draft");
    expect(dto.currentRender).toBeNull();
    expect(dto.posterUrl).toBe("/posters/published.jpg");
    expect(dto.publicUrl).toContain("/c/published-share-id");
  });

  it("reflects ready status when unedited and published render is ready", () => {
    const publishedUnedited = {
      ...sample,
      shareId: "published-share-id",
      status: "ready",
    };
    const publishedReadyRender = {
      _id: "707f1f77bcf86cd799439033",
      status: "ready",
      tier: "free",
      invitationId: "507f1f77bcf86cd799439011",
      posterUrl: "/posters/published.jpg",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Parameters<typeof invitationDto>[2];

    const dto = invitationDto(publishedUnedited, null, publishedReadyRender);
    expect(dto.status).toBe("ready");
    expect(dto.currentRender?.id).toBe("707f1f77bcf86cd799439033");
  });
});
