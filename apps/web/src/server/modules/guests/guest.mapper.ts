import type { GuestRecord } from "./guest.model";
import { localRenderConfig } from "../../lib/config";

export function guestDto(item: GuestRecord & { _id: unknown }) {
  return {
    id: String(item._id),
    name: item.name,
    token: item.token,
    link: `${localRenderConfig().appUrl}/i/${item.token}`,
    contact: item.contact,
    createdAt: new Date(item.createdAt).toISOString(),
  };
}
