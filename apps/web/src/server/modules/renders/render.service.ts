import { paymentSettings, remotionLambdaEnabled } from "../../lib/config";
import {
  paidRenderRepository,
  RenderRetryLimit,
} from "./paid-render.repository";
import { InsufficientBalance } from "../entitlements/entitlement.repository";
import type { RenderTier } from "./render.model";
import { bindResult, publishResults } from "../results/publication.service";
import { validate } from "../../lib/validation";
import { createHash } from "node:crypto";
import { invitationService } from "../invitations/invitation.service";
import { renderRepository } from "./render.repository";
import { invitationInput } from "../invitations/invitation.schema";
import { assertOwnedPhoto } from "../../integrations/local-storage.client";
import { createRemotionLambdaClient } from "../../integrations/remotion-lambda.client";
import { log } from "../../lib/logger";
import {
  NotFoundError,
  ValidationError,
  RateLimitError,
  PaymentRequiredError,
} from "../../lib/errors";
import { rateLimit } from "../../lib/rate-limit";
export function canonical(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}
const defaultDependencies = {
  invitations: invitationService,
  renders: renderRepository,
  limit: rateLimit,
  checkPhoto: assertOwnedPhoto,
  bindResult,
  reserveHd: paidRenderRepository.reserve,
  environment: () => paymentSettings().environment,
  isLambdaEnabled: remotionLambdaEnabled,
  getLambdaClient: createRemotionLambdaClient,
};
export function createRenderService(deps: typeof defaultDependencies) {
  type RenderJob = NonNullable<Awaited<ReturnType<typeof deps.renders.get>>>;

  async function dispatchToLambda(
    owner: string,
    job: RenderJob,
  ): Promise<RenderJob> {
    if (!deps.isLambdaEnabled?.()) return job;

    const id = String(job._id);
    const claimed = await deps.renders.claimLambda(id);
    if (!claimed) return (await deps.renders.get(owner, id)) ?? job;

    try {
      const lambda = deps.getLambdaClient();
      const { renderId, bucketName } = await lambda.renderMedia(
        invitationInput.parse(claimed.input),
        claimed.tier,
      );
      const updated = await deps.renders.updateLambdaJob(
        id,
        claimed.attemptId!,
        renderId,
        bucketName,
      );
      return updated ?? (await deps.renders.get(owner, id)) ?? claimed;
    } catch (error) {
      log("error", "render.lambda.start-failed", {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      return (
        (await deps.renders.failLambdaStart(
          id,
          claimed.attemptId!,
          "The video could not be started. Try exporting again.",
        )) ??
        (await deps.renders.get(owner, id)) ??
        claimed
      );
    }
  }

  async function reconcileLambda(
    owner: string,
    item: RenderJob,
  ): Promise<RenderJob> {
    if (
      !item ||
      item.status !== "rendering" ||
      !item.lambdaRenderId ||
      !deps.isLambdaEnabled?.()
    )
      return item;

    const id = String(item._id);
    const lambdaRenderId = item.lambdaRenderId;
    const isTimedOut =
      item.startedAt &&
      Date.now() - new Date(item.startedAt).getTime() >= 600000;
    try {
      const lambda = deps.getLambdaClient();
      const progress = await lambda.getProgress(
        lambdaRenderId,
        item.bucketName ?? undefined,
      );
      if (progress.done && progress.fileUrl) {
        const updated = await deps.renders.completeLambda(
          id,
          lambdaRenderId,
          progress.fileUrl,
        );
        if (updated) {
          await publishResults(owner, id).catch(() =>
            log("error", "render.publication-deferred", { renderId: id }),
          );
          return updated;
        }
      } else if (progress.error) {
        const updated = await deps.renders.failLambda(
          id,
          lambdaRenderId,
          progress.error,
        );
        if (updated) return updated;
      } else if (isTimedOut) {
        const updated = await deps.renders.failLambda(
          id,
          lambdaRenderId,
          item.tier === "hd"
            ? "Rendering timed out. Your export credit was returned."
            : "Rendering timed out. Try exporting again.",
        );
        if (updated) return updated;
      } else if (
        typeof progress.progress === "number" &&
        progress.progress !== item.progress
      ) {
        const updated = await deps.renders.updateProgress(
          id,
          lambdaRenderId,
          progress.progress,
        );
        if (updated) return updated;
      }
      return (await deps.renders.get(owner, id)) ?? item;
    } catch (error) {
      if (isTimedOut) {
        const updated = await deps.renders.failLambda(
          id,
          lambdaRenderId,
          item.tier === "hd"
            ? "Rendering timed out. Your export credit was returned."
            : "Rendering timed out. Try exporting again.",
        );
        if (updated) return updated;
      }
      log("error", "render.lambda.progress-failed", {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      return item;
    }
  }

  async function sweep() {
    if (deps.isLambdaEnabled?.()) {
      const cutoff = new Date(Date.now() - 600000);
      const expiredLambda = await deps.renders.findExpiredLambdaRenders?.(cutoff);
      if (expiredLambda?.length) {
        await Promise.all(
          expiredLambda.map((job) => reconcileLambda(job.ownerClerkId, job)),
        );
      }
    }
    await deps.renders.sweep();
  }

  return {
    async request(
      owner: string,
      id: string,
      ip?: string,
      quality: RenderTier = "free",
    ) {
      const item = await deps.invitations.get(owner, id);
      const input = validate(invitationInput, {
        templateId: item.templateId,
        props: item.props,
        hostContact: item.hostContact,
      });
      if (input.props.photoUrl) {
        try {
          await deps.checkPhoto(input.props.photoUrl, owner);
        } catch {
          throw new ValidationError("Photo does not belong to your account");
        }
      }
      const environment = quality === "hd" ? deps.environment() : undefined;
      const propsHash = createHash("sha256")
        .update(
          canonical({
            owner,
            billingEnvironment: environment,
            templateId: input.templateId,
            props: input.props,
            tier:
              quality === "hd"
                ? "hd-1080p-clean-v1"
                : "free-720p-watermarked-v1",
          }),
        )
        .digest("hex");
      const cached = await deps.renders.find(owner, propsHash);
      if (cached && cached.status !== "failed") {
        await deps.renders.attach(owner, propsHash, id);
        const dispatched =
          cached.status === "queued"
            ? await dispatchToLambda(owner, cached)
            : cached;
        await deps.bindResult(owner, id, dispatched);
        return dispatched;
      }
      await deps.limit(`render:${owner}`, 10);
      if (ip)
        await deps.limit(
          `render-ip:${createHash("sha256").update(ip).digest("hex")}`,
          30,
        );
      if (quality === "hd") {
        try {
          const job = await deps.reserveHd(
            owner,
            id,
            propsHash,
            input,
            environment!,
          );
          if (!job) throw new Error("Render queue unavailable");
          const dispatched = await dispatchToLambda(owner, job);
          await deps.bindResult(owner, id, dispatched);
          return dispatched;
        } catch (error) {
          if (error instanceof InsufficientBalance)
            throw new PaymentRequiredError(
              "Choose an export pack to make this HD video",
            );
          if (error instanceof RenderRetryLimit)
            throw new RateLimitError(
              "This video has reached its retry limit. Change the content before exporting again.",
            );
          throw error;
        }
      }
      if (cached) {
        const retried = await deps.renders.retry(owner, propsHash);
        if (!retried) {
          const current = await deps.renders.find(owner, propsHash);
          if (current && current.status !== "failed") {
            await deps.bindResult(owner, id, current);
            return current;
          }
          throw new RateLimitError(
            "This video has reached its retry limit. Change the content before exporting again.",
          );
        }
        const dispatched = await dispatchToLambda(owner, retried);
        if (dispatched) await deps.bindResult(owner, id, dispatched);
        return dispatched;
      }
      const job = await deps.renders.enqueue(owner, id, propsHash, input);
      if (!job) throw new Error("Render queue unavailable");
      const dispatched = await dispatchToLambda(owner, job);
      await deps.bindResult(owner, id, dispatched);
      return dispatched;
    },
    async get(owner: string, id: string) {
      if (!/^[a-f0-9]{24}$/i.test(id)) throw new NotFoundError();
      let item = await deps.renders.get(owner, id);
      if (!item) throw new NotFoundError();

      item = await reconcileLambda(owner, item);
      await sweep();
      if (item.status === "rendering" || item.status === "queued") {
        item = (await deps.renders.get(owner, id)) ?? item;
      }

      if (item.status === "ready") {
        await publishResults(owner, id).catch(() =>
          log("error", "render.publication-deferred", { renderId: id }),
        );
      }
      return item;
    },
    async retry(owner: string, id: string, ip?: string) {
      if (!/^[a-f0-9]{24}$/i.test(id)) throw new NotFoundError();
      const current = await deps.renders.get(owner, id);
      if (!current) throw new NotFoundError();
      if (current.status !== "failed") return current;
      await deps.limit(`render:${owner}`, 10);
      if (ip)
        await deps.limit(
          `render-ip:${createHash("sha256").update(ip).digest("hex")}`,
          30,
        );
      if (current.attempts >= 3)
        throw new RateLimitError(
          "This video has reached its retry limit. Change the content before exporting again.",
        );
      const retried = await deps.renders.retryById(owner, id);
      if (!retried) return (await deps.renders.get(owner, id)) ?? current;
      const dispatched = await dispatchToLambda(owner, retried);
      if (dispatched)
        await deps.bindResult(owner, dispatched.invitationId, dispatched);
      return dispatched;
    },
    async list(owner: string) {
      const items = await deps.renders.list(owner);
      await Promise.all(items.map((item) => reconcileLambda(owner, item)));
      await sweep();
      return deps.renders.list(owner);
    },
    sweep,
  };
}
export const renderService = createRenderService(defaultDependencies);
export const requestRender = renderService.request;
export const getRender = renderService.get;
export const retryRender = renderService.retry;
export const sweepRenders = renderService.sweep;

export async function listRenderJobs(owner: string) {
  return renderService.list(owner);
}
