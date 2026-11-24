import type { RenderRecord } from "./render.model";
export function renderDto(
  item: Pick<
    RenderRecord,
    | "tier"
    | "status"
    | "invitationIds"
    | "invitationId"
    | "fileUrl"
    | "posterUrl"
    | "error"
    | "progress"
  > & { _id: unknown },
) {
  return {
    id: String(item._id),
    invitationId: item.invitationId,
    invitationIds: item.invitationIds,
    status: item.status,
    tier: item.tier ?? "free",
    fileUrl: item.fileUrl,
    posterUrl: item.posterUrl,
    error: item.error,
    progress: item.progress ?? (item.status === "ready" ? 100 : 0),
  };
}
