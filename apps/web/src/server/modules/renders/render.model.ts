import mongoose, { Schema } from "mongoose";
import type { InvitationInput } from "../invitations/invitation.schema";
export type RenderTier = "free" | "hd";
export interface RenderRecord {
  tier: RenderTier;
  billingEnvironment?: "sandbox" | "production";
  chargeSequence: number;
  ownerClerkId: string;
  invitationId: string;
  invitationIds: string[];
  propsHash: string;
  status:
    | "queued"
    | "rendering"
    | "ready"
    | "failed"
    | "submission_uncertain";
  input: InvitationInput;
  fileUrl?: string;
  posterUrl?: string;
  error?: string;
  lambdaRenderId?: string;
  bucketName?: string;
  outputKey?: string;
  posterKey?: string;
  progress?: number;
  attempts: number;
  attemptId?: string;
  submittedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  lastReconciledAt?: Date;
  elapsedMs?: number;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<RenderRecord>(
  {
    tier: { type: String, enum: ["free", "hd"], default: "free" },
    chargeSequence: { type: Number, default: 0 },
    billingEnvironment: { type: String, enum: ["sandbox", "production"] },
    ownerClerkId: { type: String, required: true, index: true },
    invitationId: { type: String, required: true, index: true },
    invitationIds: { type: [String], index: true },
    propsHash: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "queued",
        "rendering",
        "ready",
        "failed",
        "submission_uncertain",
      ],
      default: "queued",
    },
    input: { type: Schema.Types.Mixed, required: true },
    fileUrl: String,
    posterUrl: String,
    error: String,
    lambdaRenderId: String,
    bucketName: String,
    outputKey: String,
    posterKey: String,
    progress: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
    attemptId: String,
    submittedAt: Date,
    startedAt: Date,
    completedAt: Date,
    lastReconciledAt: Date,
    elapsedMs: Number,
  },
  { timestamps: true },
);
schema.index({ status: 1, startedAt: 1 });
schema.index({ status: 1, updatedAt: 1 });
schema.index({ status: 1, lastReconciledAt: 1, updatedAt: 1 });
schema.index({ ownerClerkId: 1, propsHash: 1 }, { unique: true });
export const Render =
  (mongoose.models.Render as mongoose.Model<RenderRecord>) ||
  mongoose.model<RenderRecord>("Render", schema);
