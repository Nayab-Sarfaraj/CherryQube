import type { VideoProps } from "@greetings/remotion/schema";
import { getTemplate } from "@greetings/remotion/templates";
import { localRenderConfig } from "../../lib/config";
import { renderDto } from "../renders/render.mapper";
import type { RenderRecord } from "../renders/render.model";

export function invitationDto(
  item: Record<string, unknown>,
  pendingRender?: (RenderRecord & { _id: unknown }) | null,
  publishedRender?: (RenderRecord & { _id: unknown }) | null,
) {
  const template = getTemplate(String(item.templateId));
  const pending = pendingRender ? renderDto(pendingRender) : null;
  const published = publishedRender ? renderDto(publishedRender) : null;
  const shareId = item.shareId as string | undefined;

  const isDraft = String(item.status ?? "draft") === "draft";
  let status: string;
  let currentRender: ReturnType<typeof renderDto> | null = null;

  if (pending?.status === "queued" || pending?.status === "rendering") {
    status = "rendering";
    currentRender = pending;
  } else if (pending?.status) {
    status = pending.status;
    currentRender = pending;
  } else if (isDraft) {
    status = "draft";
    currentRender = null;
  } else if (published?.status) {
    status = published.status;
    currentRender = published;
  } else {
    status = String(item.status ?? "draft");
    currentRender = null;
  }

  return {
    id: String(item._id),
    shareId,
    publicUrl: shareId
      ? `${localRenderConfig().appUrl}/c/${shareId}`
      : undefined,
    templateId: String(item.templateId),
    title: template?.title ?? "Untitled creation",
    type: template?.type,
    themeId: template?.themeId,
    props: item.props as VideoProps,
    hostContact: item.hostContact as
      { method: "email" | "whatsapp" | "sms"; value: string } | undefined,
    status,
    guestCount: Number(item.guestCount ?? 0),
    createdAt: new Date(item.createdAt as string).toISOString(),
    updatedAt: new Date(item.updatedAt as string).toISOString(),
    posterUrl: pending?.posterUrl ?? published?.posterUrl,
    currentRender,
  };
}
