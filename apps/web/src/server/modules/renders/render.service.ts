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
  publishResults,
  reserveHd: paidRenderRepository.reserve,
  environment: () => paymentSettings().environment,
  isLambdaEnabled: remotionLambdaEnabled,
  getLambdaClient: createRemotionLambdaClient,
};
export function createRenderService(deps: typeof defaultDependencies) {
  type RenderJob = NonNullable<Awaited<ReturnType<typeof deps.renders.get>>>;

  async function pMap<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    concurrency = 3,
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let index = 0;
    const workers = Array.from(
      { length: Math.min(concurrency, items.length) },
      async () => {
        while (index < items.length) {
          const currentIndex = index++;
          results[currentIndex] = await fn(items[currentIndex]);
        }
      },
    );
    const settled = await Promise.allSettled(workers);
    const rejected = settled.find(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    if (rejected) throw rejected.reason;
    return results;
  }

  async function dispatchToLambda(
    owner: string,
    job: RenderJob,
  ): Promise<RenderJob> {
    if (!deps.isLambdaEnabled?.()) return job;

    const id = String(job._id);
    const claimed = await deps.renders.claimLambda(id);
    if (!claimed) return (await deps.renders.get(owner, id)) ?? job;

    let submitted: { renderId: string; bucketName: string } | undefined;
    try {
      const lambda = deps.getLambdaClient();
      if (lambda.renderStill && claimed.posterKey) {
        try {
          await lambda.renderStill(
            invitationInput.parse(claimed.input),
            claimed.posterKey,
          );
        } catch (posterErr) {
          log("warn", "render.lambda.poster-start-failed", {
            id,
            error:
              posterErr instanceof Error
                ? posterErr.message
                : String(posterErr),
          });
        }
      }
      submitted = await lambda.renderMedia(
        invitationInput.parse(claimed.input),
        claimed.tier,
        claimed.outputKey,
      );
      const updated = await deps.renders.updateLambdaJob(
        id,
        claimed.attemptId!,
        submitted.renderId,
        submitted.bucketName,
        claimed.outputKey,
        claimed.posterKey,
      );
      if (!updated) {
        throw new Error("Failed to persist Lambda render identifiers");
      }
      return updated;
    } catch (error) {
      log("error", "render.lambda.start-failed", {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      if (submitted) {
        let cancelled = false;
        try {
          const lambda = deps.getLambdaClient();
          if (lambda.cancelRender) {
            await lambda.cancelRender(
              submitted.renderId,
              submitted.bucketName,
            );
            cancelled = true;
          }
        } catch (cancelError) {
          log("error", "render.lambda.cancel-failed", {
            id,
            error:
              cancelError instanceof Error
                ? cancelError.message
                : String(cancelError),
          });
        }
        if (cancelled) {
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

        log("warn", "render.lambda.submission-uncertain", {
          id,
          attemptId: claimed.attemptId ?? "",
          submittedAt: claimed.submittedAt?.toISOString() ?? "",
          outputKey: claimed.outputKey ?? "",
          lambdaRenderId: submitted.renderId,
          bucketName: submitted.bucketName,
        });

        try {
          await deps.renders.recordUncertainRecoveryData?.(
            id,
            claimed.attemptId!,
            submitted.renderId,
            submitted.bucketName,
          );
        } catch (persistError) {
          log("error", "render.lambda.record-uncertain-failed", {
            id,
            error:
              persistError instanceof Error
                ? persistError.message
                : String(persistError),
          });
        }

        const current = (await deps.renders.get(owner, id)) ?? claimed;
        return {
          ...current,
          status: "submission_uncertain",
          error:
            "We could not confirm this export. Do not retry; it is being recovered.",
        };
      }
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

  async function reconcileUncertainJob(job: RenderJob): Promise<RenderJob> {
    if (
      job.status !== "submission_uncertain" ||
      !job.outputKey ||
      !job.attemptId
    ) {
      return job;
    }

    const id = String(job._id);
    const attemptId = job.attemptId;
    const outputKey = job.outputKey;
    const posterKey = job.posterKey ?? `posters/${id}/${attemptId}.png`;

    try {
      const lambda = deps.getLambdaClient();
      const outputCheck = await lambda.checkOutputExists?.(
        outputKey,
        job.bucketName,
      );
      const posterCheck = await lambda.checkOutputExists?.(
        posterKey,
        job.bucketName,
      );

      if (
        outputCheck?.exists &&
        outputCheck.url &&
        posterCheck?.exists &&
        posterCheck.url
      ) {
        const recovered = await deps.renders.recoverUncertainJob?.(
          id,
          attemptId,
          outputCheck.url,
          posterCheck.url,
        );
        if (recovered) {
          log("info", "render.uncertain.recovered", {
            id,
            attemptId,
            outputKey,
            posterKey,
          });
          if (deps.publishResults) {
            await deps.publishResults(job.ownerClerkId, id).catch(() =>
              log("error", "render.publication-deferred", { renderId: id }),
            );
          }
          return recovered;
        }
      }
    } catch (checkError) {
      log("error", "render.uncertain.check-failed", {
        id,
        attemptId,
        error:
          checkError instanceof Error ? checkError.message : String(checkError),
      });
    }

    await deps.renders.touchUncertainJob?.(id, attemptId);

    const submittedAt =
      job.submittedAt || job.startedAt || (job as { createdAt?: Date }).createdAt;
    const isPastBuffer =
      submittedAt &&
      Date.now() - new Date(submittedAt).getTime() >= 600000;

    if (isPastBuffer) {
      log("warn", "render.uncertain.blocked", {
        id,
        attemptId,
        outputKey,
        message:
          "Render output not found after timeout buffer. Awaiting explicit operator recovery.",
      });
    }

    return job;
  }

  async function reconcileLambda(
    owner: string,
    item: RenderJob,
  ): Promise<RenderJob> {
    if (!item) return item;
    if (item.status === "submission_uncertain") {
      return reconcileUncertainJob(item);
    }
    if (item.status !== "rendering" || !item.lambdaRenderId)
      return item;

    const id = String(item._id);
    const lambdaRenderId = item.lambdaRenderId;
    const isTimedOut =
      item.startedAt &&
      Date.now() - new Date(item.startedAt).getTime() >= 600000;

    if (!deps.isLambdaEnabled?.()) {
      if (isTimedOut) {
        return (
          (await deps.renders.failLambda(
            id,
            lambdaRenderId,
            item.tier === "hd"
              ? "Rendering timed out. Your export credit was returned."
              : "Rendering timed out. Try exporting again.",
          )) ?? item
        );
      }
      return item;
    }

    try {
      const lambda = deps.getLambdaClient();
      const progress = await lambda.getProgress(
        lambdaRenderId,
        item.bucketName ?? undefined,
      );
      if (progress.done && progress.fileUrl) {
        let posterUrl = item.posterUrl;
        if (!posterUrl && lambda.renderStill) {
          try {
            posterUrl = await lambda.renderStill(
              invitationInput.parse(item.input),
              item.posterKey,
            );
          } catch {
            // ignore
          }
        }
        const updated = await deps.renders.completeLambda(
          id,
          lambdaRenderId,
          progress.fileUrl,
          ...(posterUrl ? [posterUrl] : []),
        );
        if (updated) {
          if (deps.publishResults) {
            await deps.publishResults(owner, id).catch(() =>
              log("error", "render.publication-deferred", { renderId: id }),
            );
          }
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

  let inFlightSweep: Promise<void> | null = null;

  async function sweep() {
    if (inFlightSweep) return inFlightSweep;

    inFlightSweep = (async () => {
      try {
        const lambdaEnabled = Boolean(deps.isLambdaEnabled?.());
        if (lambdaEnabled) {
          const cutoff = new Date(Date.now() - 600000);
          const expiredLambda =
            await deps.renders.findExpiredLambdaRenders?.(cutoff, 10);
          if (expiredLambda?.length) {
            await pMap(
              expiredLambda,
              (job) => reconcileLambda(job.ownerClerkId, job),
              3,
            );
          }

          const uncertainJobs = await deps.renders.findUncertainJobs?.(10);
          if (uncertainJobs?.length) {
            await pMap(
              uncertainJobs,
              (job) => reconcileUncertainJob(job),
              3,
            );
          }
        }
        await deps.renders.sweep(!lambdaEnabled);
      } finally {
        inFlightSweep = null;
      }
    })();

    return inFlightSweep;
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

      if (item.status === "ready") {
        if (deps.publishResults) {
          await deps.publishResults(owner, id).catch(() =>
            log("error", "render.publication-deferred", { renderId: id }),
          );
        }
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
      const activeLambda = items.filter(
        (it) => it.status === "rendering" && it.lambdaRenderId,
      );
      if (activeLambda.length > 0) {
        await pMap(
          activeLambda,
          async (item) => {
            const fullRecord = await deps.renders.get(owner, String(item._id));
            if (fullRecord) {
              await reconcileLambda(owner, fullRecord);
            }
          },
          3,
        );
      }
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
