import { paidRenderRepository } from "./paid-render.repository";
import { randomUUID } from "node:crypto";
import { connectDb } from "../../lib/db";
import { Render } from "./render.model";
import type { InvitationInput } from "../invitations/invitation.schema";
export const renderRepository = {
  async find(ownerClerkId: string, propsHash: string) {
    await connectDb();
    return Render.findOne({ ownerClerkId, propsHash }).lean();
  },
  async get(ownerClerkId: string, id: string) {
    await connectDb();
    return Render.findOne({ _id: id, ownerClerkId }).lean();
  },
  async getMany(ownerClerkId: string, ids: string[]) {
    await connectDb();
    if (!ids.length) return [];
    return Render.find({ ownerClerkId, _id: { $in: ids } }).lean();
  },
  async retryById(ownerClerkId: string, id: string) {
    await connectDb();
    return Render.findOneAndUpdate(
      { ownerClerkId, _id: id, status: "failed", attempts: { $lt: 3 } },
      {
        $set: { status: "queued" },
        $unset: {
          error: 1,
          startedAt: 1,
          attemptId: 1,
          lambdaRenderId: 1,
          bucketName: 1,
          progress: 1,
        },
      },
      { returnDocument: "after" },
    ).lean();
  },
  async enqueue(
    ownerClerkId: string,
    invitationId: string,
    propsHash: string,
    input: InvitationInput,
  ) {
    await connectDb();
    await Render.init();
    try {
      return await Render.findOneAndUpdate(
        { ownerClerkId, propsHash },
        {
          $setOnInsert: {
            ownerClerkId,
            invitationId,
            invitationIds: [invitationId],
            propsHash,
            input: JSON.parse(JSON.stringify(input)),
            status: "queued",
            tier: "free",
            attempts: 0,
          },
        },
        { upsert: true, returnDocument: "after" },
      ).lean();
    } catch (error) {
      if ((error as { code?: number }).code === 11000)
        return Render.findOne({ ownerClerkId, propsHash }).lean();
      throw error;
    }
  },
  async attach(ownerClerkId: string, propsHash: string, invitationId: string) {
    await connectDb();
    return Render.updateOne(
      { ownerClerkId, propsHash },
      { $addToSet: { invitationIds: invitationId } },
    );
  },
  async claim() {
    await connectDb();
    return Render.findOneAndUpdate(
      { status: "queued" },
      {
        $set: {
          status: "rendering",
          startedAt: new Date(),
          attemptId: randomUUID(),
        },
        $unset: { lambdaRenderId: 1, bucketName: 1, error: 1 },
        $inc: { attempts: 1 },
      },
      { returnDocument: "after", sort: { createdAt: 1 } },
    ).lean();
  },
  /**
   * Claims a queued job for Lambda before starting the remote render. This
   * prevents a second request or the local worker from taking the same job.
   */
  async claimLambda(id: string) {
    await connectDb();
    const attemptId = randomUUID();
    const outputKey = `renders/${id}/${attemptId}.mp4`;
    const posterKey = `posters/${id}/${attemptId}.png`;
    return Render.findOneAndUpdate(
      { _id: id, status: "queued" },
      {
        $set: {
          status: "submission_uncertain",
          submittedAt: new Date(),
          attemptId,
          outputKey,
          posterKey,
          progress: 1,
        },
        $unset: { lambdaRenderId: 1, bucketName: 1, error: 1 },
        $inc: { attempts: 1 },
      },
      { returnDocument: "after" },
    ).lean();
  },
  async complete(
    id: string,
    attemptId: string,
    fileUrl: string,
    posterUrl: string,
    elapsedMs: number,
  ) {
    return Render.updateOne(
      { _id: id, attemptId, status: "rendering" },
      {
        $set: {
          status: "ready",
          fileUrl,
          posterUrl,
          elapsedMs,
          completedAt: new Date(),
        },
      },
    );
  },
  async fail(id: string, attemptId: string) {
    const job = await Render.findById(id).select("tier").lean();
    if (job?.tier === "hd") return paidRenderRepository.fail(id, attemptId);
    return Render.updateOne(
      { _id: id, attemptId, status: "rendering" },
      {
        $set: {
          status: "failed",
          error: "The video could not be rendered. Try exporting again.",
        },
      },
    );
  },
  async retry(ownerClerkId: string, propsHash: string) {
    await connectDb();
    return Render.findOneAndUpdate(
      {
        ownerClerkId,
        propsHash,
        tier: { $ne: "hd" },
        status: "failed",
        attempts: { $lt: 3 },
      },
      {
        $set: { status: "queued" },
        $unset: {
          error: 1,
          startedAt: 1,
          attemptId: 1,
          lambdaRenderId: 1,
          bucketName: 1,
          progress: 1,
        },
      },
      { returnDocument: "after" },
    ).lean();
  },
  async sweep(includeLambda = false) {
    await connectDb();
    await paidRenderRepository.sweep(includeLambda);
    const cutoff = new Date(Date.now() - 600000);
    const renderingFilter = includeLambda
      ? { status: "rendering" as const, startedAt: { $lt: cutoff } }
      : {
          status: "rendering" as const,
          lambdaRenderId: { $exists: false },
          startedAt: { $lt: cutoff },
        };
    return Render.updateMany(
      {
        tier: { $ne: "hd" },
        $or: [
          renderingFilter,
          { status: "queued", updatedAt: { $lt: cutoff } },
        ],
      },
      {
        $set: {
          status: "failed",
          error: "Rendering timed out. Try exporting again.",
        },
      },
    );
  },
  async list(ownerClerkId: string) {
    await connectDb();
    return Render.find({ ownerClerkId })
      .select("-input -ownerClerkId -propsHash")
      .sort({ updatedAt: -1 })
      .lean();
  },
  async updateLambdaJob(
    id: string,
    attemptId: string,
    lambdaRenderId: string,
    bucketName: string,
    outputKey?: string,
    posterKey?: string,
  ) {
    await connectDb();
    return Render.findOneAndUpdate(
      {
        _id: id,
        attemptId,
        status: "submission_uncertain",
      },
      {
        $set: {
          status: "rendering",
          lambdaRenderId,
          bucketName,
          ...(outputKey ? { outputKey } : {}),
          ...(posterKey ? { posterKey } : {}),
          startedAt: new Date(),
          progress: 5,
        },
      },
      { returnDocument: "after" },
    ).lean();
  },
  async recordUncertainRecoveryData(
    id: string,
    attemptId: string,
    lambdaRenderId: string,
    bucketName: string,
  ) {
    await connectDb();
    return Render.findOneAndUpdate(
      {
        _id: id,
        attemptId,
        status: "submission_uncertain",
      },
      {
        $set: {
          lambdaRenderId,
          bucketName,
        },
      },
      { returnDocument: "after" },
    ).lean();
  },
  async findUncertainJobs(limit = 10) {
    await connectDb();
    return Render.find({
      status: "submission_uncertain",
      outputKey: { $exists: true },
    })
      .sort({ lastReconciledAt: 1, updatedAt: 1 })
      .limit(limit)
      .lean();
  },
  async touchUncertainJob(id: string, attemptId: string) {
    await connectDb();
    return Render.findOneAndUpdate(
      {
        _id: id,
        attemptId,
        status: "submission_uncertain",
      },
      {
        $set: {
          lastReconciledAt: new Date(),
        },
      },
      { returnDocument: "after" },
    ).lean();
  },
  async recoverUncertainJob(
    id: string,
    attemptId: string,
    fileUrl: string,
    posterUrl?: string,
  ) {
    await connectDb();
    return Render.findOneAndUpdate(
      {
        _id: id,
        attemptId,
        status: "submission_uncertain",
      },
      {
        $set: {
          status: "ready",
          fileUrl,
          ...(posterUrl ? { posterUrl } : {}),
          progress: 100,
          completedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    ).lean();
  },
  async updateProgress(id: string, lambdaRenderId: string, progress: number) {
    await connectDb();
    return Render.findOneAndUpdate(
      { _id: id, lambdaRenderId, status: "rendering" },
      { $set: { progress } },
      { returnDocument: "after" },
    ).lean();
  },
  async completeLambda(
    id: string,
    lambdaRenderId: string,
    fileUrl: string,
    posterUrl?: string,
  ) {
    await connectDb();
    return Render.findOneAndUpdate(
      { _id: id, lambdaRenderId, status: "rendering" },
      {
        $set: {
          status: "ready",
          fileUrl,
          ...(posterUrl ? { posterUrl } : {}),
          progress: 100,
          completedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    ).lean();
  },
  async failLambda(id: string, lambdaRenderId: string, error: string) {
    await connectDb();
    const job = await Render.findOne({
      _id: id,
      lambdaRenderId,
      status: "rendering",
    })
      .select("tier")
      .lean();
    if (job?.tier === "hd") {
      await paidRenderRepository.failLambda(id, lambdaRenderId, error);
      return Render.findById(id).lean();
    }
    return Render.findOneAndUpdate(
      { _id: id, lambdaRenderId, status: "rendering" },
      {
        $set: {
          status: "failed",
          error,
        },
      },
      { returnDocument: "after" },
    ).lean();
  },
  async findExpiredLambdaRenders(cutoff: Date, limit = 10) {
    await connectDb();
    return Render.find({
      status: "rendering",
      lambdaRenderId: { $exists: true },
      startedAt: { $lt: cutoff },
    })
      .limit(limit)
      .lean();
  },
  async failLambdaStart(id: string, attemptId: string, error: string) {
    await connectDb();
    const job = await Render.findOne({
      _id: id,
      attemptId,
      status: "submission_uncertain",
    })
      .select("tier")
      .lean();
    if (job?.tier === "hd") {
      await paidRenderRepository.failLambdaStart(id, attemptId, error);
      return Render.findById(id).lean();
    }
    return Render.findOneAndUpdate(
      {
        _id: id,
        attemptId,
        status: "submission_uncertain",
      },
      { $set: { status: "failed", error } },
      { returnDocument: "after" },
    ).lean();
  },
};
