import {
  renderMediaOnLambda,
  renderStillOnLambda,
  getRenderProgress as getLambdaProgress,
  cancelRenderOnLambda,
  presignUrl,
  type AwsRegion,
} from "@remotion/lambda/client";
import type { InvitationInput } from "../modules/invitations/invitation.schema";
import type { RenderTier } from "../modules/renders/render.model";
import { remotionLambdaConfig } from "../lib/config";
import { log } from "../lib/logger";

export interface LambdaRenderProgress {
  done: boolean;
  progress: number;
  fileUrl?: string;
  error?: string;
}

export interface LambdaRenderClient {
  renderMedia(
    input: InvitationInput,
    tier?: RenderTier,
    outputKey?: string,
  ): Promise<{ renderId: string; bucketName: string }>;
  renderStill(input: InvitationInput, posterKey?: string): Promise<string>;
  getProgress(
    renderId: string,
    bucketName?: string,
  ): Promise<LambdaRenderProgress>;
  cancelRender?(renderId: string, bucketName?: string): Promise<void>;
  checkOutputExists?(
    outputKey: string,
    bucketName?: string,
  ): Promise<{ exists: boolean; url?: string }>;
}

export function createRemotionLambdaClient(): LambdaRenderClient {
  const config = remotionLambdaConfig();
  if (!config) {
    throw new Error("Remotion Lambda configuration is not set");
  }

  const region = config.region as AwsRegion;
  const functionName = config.functionName;
  const serveUrl = config.serveUrl;
  const bucketName = config.bucketName;

  return {
    async renderMedia(
      input: InvitationInput,
      tier: RenderTier = "free",
      outputKey?: string,
    ) {
      const inputProps = {
        recipientName: null,
        message: null,
        photoUrl: null,
        mapUrl: null,
        guestName: null,
        ...input.props,
        watermark: tier !== "hd",
      };

      const result = await renderMediaOnLambda({
        region,
        functionName,
        serveUrl,
        composition: input.templateId,
        inputProps,
        codec: "h264",
        scale: tier === "hd" ? 1 : 2 / 3,
        privacy: "public",
        enableCancellation: true,
        outName: outputKey
          ? { bucketName, key: outputKey }
          : `renders/${input.templateId}-${Date.now()}.mp4`,
      });

      return { renderId: result.renderId, bucketName: result.bucketName };
    },

    async checkOutputExists(outputKey: string, customBucket?: string) {
      const targetBucket = customBucket || bucketName;
      try {
        const url = await presignUrl({
          region,
          bucketName: targetBucket,
          objectKey: outputKey,
          checkIfObjectExists: true,
          expiresInSeconds: 86400,
        });
        if (!url) {
          return { exists: false };
        }
        return { exists: true, url };
      } catch (error) {
        log("error", "remotion.s3.check_output_failed", {
          outputKey,
          bucket: targetBucket,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },

    async renderStill(input: InvitationInput, posterKey?: string) {
      const inputProps = {
        recipientName: null,
        message: null,
        photoUrl: null,
        mapUrl: null,
        guestName: null,
        ...input.props,
        watermark: false,
      };

      const result = await renderStillOnLambda({
        region,
        functionName,
        serveUrl,
        composition: input.templateId,
        inputProps,
        imageFormat: "png",
        privacy: "public",
        outName: posterKey
          ? { bucketName, key: posterKey }
          : `posters/${input.templateId}-${Date.now()}.png`,
      });

      return result.url;
    },

    async getProgress(renderId: string, customBucketName?: string) {
      const result = await getLambdaProgress({
        renderId,
        bucketName: customBucketName || bucketName,
        functionName,
        region,
      });

      if (result.fatalErrorEncountered) {
        const message =
          result.errors && result.errors.length > 0
            ? result.errors.map((e) => e.message).join("; ")
            : "Rendering failed on Remotion Lambda";
        return {
          done: false,
          progress: 0,
          error: message,
        };
      }

      const progress = Math.min(
        100,
        Math.max(0, Math.round((result.overallProgress ?? 0) * 100)),
      );

      return {
        done: Boolean(result.done),
        progress,
        fileUrl: result.outputFile ?? undefined,
      };
    },

    async cancelRender(renderId: string, customBucketName?: string) {
      await cancelRenderOnLambda({
        renderId,
        bucketName: customBucketName || bucketName,
        region,
      });
    },
  };
}
