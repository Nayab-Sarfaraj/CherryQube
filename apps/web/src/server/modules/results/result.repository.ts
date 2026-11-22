import { connectDb } from "../../lib/db";
import { Invitation } from "../invitations/invitation.model";
import { Render } from "../renders/render.model";

export function visiblePublicRender<T extends { status: string }>(
  published: T | null,
  pending: T | null,
) {
  return published?.status === "ready" ? published : pending;
}

export const resultRepository = {
  async setPending(ownerClerkId: string, id: string, renderId: string) {
    await connectDb();
    await Invitation.updateOne(
      { _id: id, ownerClerkId },
      { $set: { pendingRenderId: renderId } },
    );
  },
  async pending(ownerClerkId: string, renderId: string) {
    await connectDb();
    return Invitation.find({ ownerClerkId, pendingRenderId: renderId })
      .select("_id shareId")
      .lean();
  },
  async assignShareId(
    ownerClerkId: string,
    id: string,
    renderId: string,
    shareId: string,
  ) {
    await connectDb();
    await Invitation.init();
    return Invitation.updateOne(
      {
        _id: id,
        ownerClerkId,
        pendingRenderId: renderId,
        shareId: { $exists: false },
      },
      { $set: { shareId } },
    );
  },
  async setPublished(ownerClerkId: string, id: string, renderId: string) {
    await connectDb();
    return Invitation.updateOne(
      { _id: id, ownerClerkId, pendingRenderId: renderId },
      { $set: { publishedRenderId: renderId } },
    );
  },
  async find(shareId: string) {
    await connectDb();
    const item = await Invitation.findOne({ shareId })
      .select("shareId ownerClerkId pendingRenderId publishedRenderId")
      .lean();
    if (!item) return null;
    const filter = {
      ownerClerkId: item.ownerClerkId,
      invitationIds: String(item._id),
    };
    const published = item.publishedRenderId
      ? await Render.findOne({
          ...filter,
          _id: item.publishedRenderId,
          status: "ready",
        })
          .select("status input.props fileUrl posterUrl")
          .lean()
      : null;
    const pending = item.pendingRenderId
      ? await Render.findOne({ ...filter, _id: item.pendingRenderId })
          .select("status input.props fileUrl posterUrl")
          .lean()
      : null;
    const render = visiblePublicRender(published, pending);
    return render ? { shareId, render } : null;
  },
};
