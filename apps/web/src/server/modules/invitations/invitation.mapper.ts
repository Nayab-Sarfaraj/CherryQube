import type { VideoProps } from "@greetings/remotion/schema";
import { getTemplate } from "@greetings/remotion/templates";
import { renderDto } from "../renders/render.mapper";
import type { RenderRecord } from "../renders/render.model";

export function invitationDto(
  item: Record<string, unknown>,
  currentRender?: (RenderRecord & { _id: unknown }) | null,
) {
  const template = getTemplate(String(item.templateId));
  const render = currentRender ? renderDto(currentRender) : null;
  return {
    id: String(item._id),
    shareId: item.shareId as string | undefined,
    templateId: String(item.templateId),
    title: template?.title ?? "Untitled creation",
    type: template?.type,
    themeId: template?.themeId,
    props: item.props as VideoProps,
    hostContact: item.hostContact as
      { method: "email" | "whatsapp" | "sms"; value: string } | undefined,
    status:
      render?.status === "queued" || render?.status === "rendering"
        ? "rendering"
        : render?.status ?? String(item.status),
    guestCount: Number(item.guestCount ?? 0),
    createdAt: new Date(item.createdAt as string).toISOString(),
    updatedAt: new Date(item.updatedAt as string).toISOString(),
    posterUrl: render?.posterUrl,
    currentRender: render,
  };
}
