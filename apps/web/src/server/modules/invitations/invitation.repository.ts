import { connectDb } from "../../lib/db";
import { Invitation } from "./invitation.model";
import type { InvitationInput } from "./invitation.schema";
export const invitationRepository = {
  async list(ownerClerkId: string, limit = 50, cursor?: string) {
    await connectDb();
    return Invitation.find({
      ownerClerkId,
      ...(cursor ? { _id: { $lt: cursor } } : {}),
    })
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();
  },
  async get(ownerClerkId: string, id: string) {
    await connectDb();
    return Invitation.findOne({ _id: id, ownerClerkId }).lean();
  },
  async create(ownerClerkId: string, input: InvitationInput) {
    await connectDb();
    return (await Invitation.create({ ...input, ownerClerkId })).toObject();
  },
  async update(ownerClerkId: string, id: string, input: InvitationInput) {
    await connectDb();
    return Invitation.findOneAndUpdate(
      { _id: id, ownerClerkId },
      {
        $set: { ...input, status: "draft" },
        $unset: { pendingRenderId: 1 },
      },
      { returnDocument: "after" },
    ).lean();
  },
  async delete(ownerClerkId: string, id: string) {
    await connectDb();
    return Invitation.findOneAndDelete({ _id: id, ownerClerkId }).lean();
  },
};
