import { describe, expect, it, vi } from "vitest";
import { createRenderService, canonical } from "./render.service";
import { createResultService } from "../results/result.service";
import { NotFoundError } from "../../lib/errors";
import { InsufficientBalance } from "../entitlements/entitlement.repository";
import { renderChoice } from "./render.schema";
import { templates } from "@greetings/remotion/templates";
function setup() {
  const invitations = {
    get: vi.fn().mockResolvedValue({
      templateId: "harvest-card",
      props: templates[0].defaultProps,
    }),
  };
  const renders = {
    attach: vi.fn(),
    find: vi.fn().mockResolvedValue(null),
    enqueue: vi.fn().mockResolvedValue({ status: "queued" }),
    retry: vi.fn(),
    retryById: vi.fn(),
    get: vi.fn(),
    sweep: vi.fn(),
  };
  const limit = vi.fn();
  const checkPhoto = vi.fn();
  const deps = {
    invitations,
    renders,
    limit,
    checkPhoto,
    bindResult: vi.fn(),
    reserveHd: vi.fn(),
    environment: () => "sandbox" as const,
  };
  return {
    ...deps,
    service: createRenderService(
      deps as unknown as Parameters<typeof createRenderService>[0],
    ),
  };
}
describe("render safeguards", () => {
  it("ignores client paid and watermark flags", () => {
    expect(renderChoice.parse({ paid: true, watermark: false })).toEqual({
      quality: "free",
    });
  });
  it("requires a credit reservation for a new HD render", async () => {
    const t = setup();
    t.reserveHd.mockRejectedValue(new InsufficientBalance());
    await expect(
      t.service.request("owner", "id", undefined, "hd"),
    ).rejects.toMatchObject({ status: 402 });
    expect(t.renders.enqueue).not.toHaveBeenCalled();
  });
  it("canonicalizes object key order", () => {
    expect(canonical({ b: 1, a: { d: 2, c: 3 } })).toBe(
      canonical({ a: { c: 3, d: 2 }, b: 1 }),
    );
  });
  it("returns cached jobs without enqueueing or consuming quota", async () => {
    const t = setup();
    const cached = { status: "ready" };
    t.renders.find.mockResolvedValue(cached);
    expect(await t.service.request("owner", "id")).toBe(cached);
    expect(t.renders.enqueue).not.toHaveBeenCalled();
    expect(t.limit).not.toHaveBeenCalled();
  });
  it("rejects foreign photos before starting work", async () => {
    const t = setup();
    t.invitations.get.mockResolvedValue({
      templateId: "harvest-card",
      props: {
        ...templates[0].defaultProps,
        photoUrl: "https://foreign.invalid/photo.jpg",
      },
    });
    t.checkPhoto.mockRejectedValue(new Error("foreign"));
    await expect(t.service.request("owner", "id")).rejects.toThrow(
      "Photo does not belong",
    );
    expect(t.renders.enqueue).not.toHaveBeenCalled();
  });
  it("keeps denied ownership checks ahead of rendering", async () => {
    const t = setup();
    t.invitations.get.mockRejectedValue(new NotFoundError());
    await expect(t.service.request("other", "id")).rejects.toThrow("Not found");
    expect(t.renders.find).not.toHaveBeenCalled();
  });
  it("blocks over-limit requests before enqueueing", async () => {
    const t = setup();
    t.limit.mockRejectedValue(new Error("limited"));
    await expect(t.service.request("owner", "id")).rejects.toThrow("limited");
    expect(t.renders.enqueue).not.toHaveBeenCalled();
  });
  it("rejects invalid saved props before enqueueing", async () => {
    const t = setup();
    t.invitations.get.mockResolvedValue({
      templateId: "harvest-card",
      props: { ...templates[0].defaultProps, message: "x".repeat(241) },
    });
    await expect(t.service.request("owner", "id")).rejects.toThrow();
    expect(t.renders.enqueue).not.toHaveBeenCalled();
  });
  it("caps failed-job retries", async () => {
    const t = setup();
    t.renders.find.mockResolvedValue({ status: "failed" });
    t.renders.retry.mockResolvedValue(null);
    await expect(t.service.request("owner", "id")).rejects.toThrow(
      "retry limit",
    );
  });
  it("requeues a failed render by its id without reserving another credit", async () => {
    const t = setup();
    const failed = {
      _id: "a".repeat(24),
      invitationId: "b".repeat(24),
      status: "failed",
      attempts: 1,
      tier: "hd",
    };
    t.renders.get.mockResolvedValue(failed);
    t.renders.retryById.mockResolvedValue({ ...failed, status: "queued" });
    await expect(
      t.service.retry("owner", "a".repeat(24)),
    ).resolves.toMatchObject({
      status: "queued",
      tier: "hd",
    });
    expect(t.reserveHd).not.toHaveBeenCalled();
    expect(t.renders.retryById).toHaveBeenCalledWith("owner", "a".repeat(24));
    expect(t.bindResult).toHaveBeenCalledOnce();
  });
  it("returns an in-progress retry unchanged, making retry idempotent", async () => {
    const t = setup();
    const queued = { _id: "a".repeat(24), status: "queued", attempts: 1 };
    t.renders.get.mockResolvedValue(queued);
    await expect(t.service.retry("owner", "a".repeat(24))).resolves.toBe(
      queued,
    );
    expect(t.renders.retryById).not.toHaveBeenCalled();
  });
  it("separates render hashes by owner", async () => {
    const t = setup();
    await t.service.request("one", "id");
    await t.service.request("two", "id");
    expect(t.renders.enqueue.mock.calls[0][2]).not.toBe(
      t.renders.enqueue.mock.calls[1][2],
    );
  });

  it("does not let a stale Lambda failure overwrite a retried render", async () => {
    const id = "a".repeat(24);
    let record: {
      _id: string;
      invitationId: string;
      status: "queued" | "rendering" | "failed";
      lambdaRenderId?: string;
      bucketName?: string;
      attempts: number;
      tier: "free";
      input: {
        templateId: string;
        props: (typeof templates)[number]["defaultProps"];
      };
    } = {
      _id: id,
      invitationId: "b".repeat(24),
      status: "rendering" as const,
      lambdaRenderId: "lambda-old",
      bucketName: "bucket",
      attempts: 1,
      tier: "free" as const,
      input: {
        templateId: "harvest-card",
        props: templates[0].defaultProps,
      },
    };
    let releaseStalePoll!: () => void;
    const staleProgress = new Promise<{ error: string }>((resolve) => {
      releaseStalePoll = () => resolve({ error: "Lambda failed" });
    });
    const renders = {
      get: vi.fn().mockImplementation(async () => ({ ...record })),
      sweep: vi.fn(),
      failLambda: vi.fn(async (_id: string, lambdaRenderId: string) => {
        if (
          record.status !== "rendering" ||
          record.lambdaRenderId !== lambdaRenderId
        )
          return null;
        record = { ...record, status: "failed" as const };
        return { ...record };
      }),
      retryById: vi.fn(async () => {
        record = {
          ...record,
          status: "queued" as const,
          lambdaRenderId: undefined,
          bucketName: undefined,
        };
        return { ...record };
      }),
      completeLambda: vi.fn(),
      updateProgress: vi.fn(),
    };
    let progressCalls = 0;
    const deps = {
      invitations: { get: vi.fn() },
      renders,
      limit: vi.fn(),
      checkPhoto: vi.fn(),
      bindResult: vi.fn(),
      reserveHd: vi.fn(),
      environment: () => "sandbox" as const,
      isLambdaEnabled: () => true,
      getLambdaClient: () => ({
        renderMedia: vi.fn(),
        getProgress: vi.fn(() => {
          progressCalls += 1;
          return progressCalls === 1
            ? staleProgress
            : Promise.resolve({
                done: false,
                progress: 0,
                error: "Lambda failed",
              });
        }),
      }),
    };
    const service = createRenderService(
      deps as unknown as Parameters<typeof createRenderService>[0],
    );

    const stalePoll = service.get("owner", id);
    await vi.waitFor(() => expect(progressCalls).toBe(1));
    await service.get("owner", id);
    await renders.retryById();
    releaseStalePoll();

    await expect(stalePoll).resolves.toMatchObject({ status: "queued" });
    expect(record.status).toBe("queued");
    expect(record.lambdaRenderId).toBeUndefined();
    expect(renders.failLambda).toHaveBeenCalledWith(
      id,
      "lambda-old",
      "Lambda failed",
    );
  });

  it("times out a stuck Lambda render after 10 minutes", async () => {
    const id = "c".repeat(24);
    const tenMinutesAgo = new Date(Date.now() - 650000);
    let record: {
      _id: string;
      invitationId: string;
      status: "rendering" | "failed";
      lambdaRenderId: string;
      bucketName: string;
      attempts: number;
      tier: "hd";
      startedAt: Date;
      input: {
        templateId: string;
        props: (typeof templates)[number]["defaultProps"];
      };
    } = {
      _id: id,
      invitationId: "b".repeat(24),
      status: "rendering" as const,
      lambdaRenderId: "lambda-stuck",
      bucketName: "bucket",
      attempts: 1,
      tier: "hd" as const,
      startedAt: tenMinutesAgo,
      input: {
        templateId: "harvest-card",
        props: templates[0].defaultProps,
      },
    };
    const renders = {
      get: vi.fn().mockImplementation(async () => ({ ...record })),
      sweep: vi.fn(),
      failLambda: vi.fn(async () => {
        record = {
          ...record,
          status: "failed" as const,
        };
        return {
          ...record,
          error: "Rendering timed out. Your export credit was returned.",
        };
      }),
      completeLambda: vi.fn(),
      updateProgress: vi.fn(),
    };
    const deps = {
      invitations: { get: vi.fn() },
      renders,
      limit: vi.fn(),
      checkPhoto: vi.fn(),
      bindResult: vi.fn(),
      reserveHd: vi.fn(),
      environment: () => "sandbox" as const,
      isLambdaEnabled: () => true,
      getLambdaClient: () => ({
        renderMedia: vi.fn(),
        getProgress: vi.fn().mockResolvedValue({
          done: false,
          progress: 50,
        }),
      }),
    };
    const service = createRenderService(
      deps as unknown as Parameters<typeof createRenderService>[0],
    );

    const result = await service.get("owner", id);
    expect(renders.failLambda).toHaveBeenCalledWith(
      id,
      "lambda-stuck",
      "Rendering timed out. Your export credit was returned.",
    );
    expect(result.status).toBe("failed");
  });

  it("completes an expired Lambda render if Lambda finished", async () => {
    const id = "d".repeat(24);
    const tenMinutesAgo = new Date(Date.now() - 650000);
    let record: {
      _id: string;
      invitationId: string;
      status: "rendering" | "ready";
      lambdaRenderId: string;
      bucketName: string;
      attempts: number;
      tier: "free";
      startedAt: Date;
      input: {
        templateId: string;
        props: (typeof templates)[number]["defaultProps"];
      };
    } = {
      _id: id,
      invitationId: "b".repeat(24),
      status: "rendering" as const,
      lambdaRenderId: "lambda-done",
      bucketName: "bucket",
      attempts: 1,
      tier: "free" as const,
      startedAt: tenMinutesAgo,
      input: {
        templateId: "harvest-card",
        props: templates[0].defaultProps,
      },
    };
    const renders = {
      get: vi.fn().mockImplementation(async () => ({ ...record })),
      sweep: vi.fn(),
      failLambda: vi.fn(),
      completeLambda: vi.fn(async () => {
        record = {
          ...record,
          status: "ready" as const,
        };
        return {
          ...record,
          fileUrl: "https://example.com/video.mp4",
        };
      }),
      updateProgress: vi.fn(),
    };
    const deps = {
      invitations: { get: vi.fn() },
      renders,
      limit: vi.fn(),
      checkPhoto: vi.fn(),
      bindResult: vi.fn(),
      reserveHd: vi.fn(),
      environment: () => "sandbox" as const,
      isLambdaEnabled: () => true,
      getLambdaClient: () => ({
        renderMedia: vi.fn(),
        getProgress: vi.fn().mockResolvedValue({
          done: true,
          progress: 100,
          fileUrl: "https://example.com/video.mp4",
        }),
      }),
    };
    const service = createRenderService(
      deps as unknown as Parameters<typeof createRenderService>[0],
    );

    const result = await service.get("owner", id);
    expect(renders.completeLambda).toHaveBeenCalledWith(
      id,
      "lambda-done",
      "https://example.com/video.mp4",
    );
    expect(renders.failLambda).not.toHaveBeenCalled();
    expect(result.status).toBe("ready");
  });

  it("times out and refunds a Lambda record when Lambda is disabled", async () => {
    const id = "e".repeat(24);
    const tenMinutesAgo = new Date(Date.now() - 650000);
    const record = {
      _id: id,
      invitationId: "b".repeat(24),
      status: "rendering" as const,
      lambdaRenderId: "lambda-disabled",
      bucketName: "bucket",
      attempts: 1,
      tier: "hd" as const,
      startedAt: tenMinutesAgo,
      input: {
        templateId: "harvest-card",
        props: templates[0].defaultProps,
      },
    };
    const renders = {
      get: vi.fn().mockResolvedValue(record),
      sweep: vi.fn(),
      failLambda: vi.fn().mockResolvedValue({
        ...record,
        status: "failed" as const,
        error: "Rendering timed out. Your export credit was returned.",
      }),
      completeLambda: vi.fn(),
      updateProgress: vi.fn(),
    };
    const deps = {
      invitations: { get: vi.fn() },
      renders,
      limit: vi.fn(),
      checkPhoto: vi.fn(),
      bindResult: vi.fn(),
      reserveHd: vi.fn(),
      environment: () => "sandbox" as const,
      isLambdaEnabled: () => false,
      getLambdaClient: vi.fn(),
    };
    const service = createRenderService(
      deps as unknown as Parameters<typeof createRenderService>[0],
    );

    const result = await service.get("owner", id);
    expect(renders.failLambda).toHaveBeenCalledWith(
      id,
      "lambda-disabled",
      "Rendering timed out. Your export credit was returned.",
    );
    expect(result.status).toBe("failed");
  });

  it("cancels remote render if updateLambdaJob fails after submission", async () => {
    const id = "f".repeat(24);
    const cancelRender = vi.fn().mockResolvedValue(undefined);
    const renders = {
      attach: vi.fn(),
      find: vi.fn().mockResolvedValue(null),
      enqueue: vi.fn().mockResolvedValue({
        _id: id,
        invitationId: "b".repeat(24),
        status: "queued" as const,
        tier: "free" as const,
        input: {
          templateId: "harvest-card",
          props: templates[0].defaultProps,
        },
      }),
      claimLambda: vi.fn().mockResolvedValue({
        _id: id,
        attemptId: "att-1",
        tier: "free" as const,
        input: {
          templateId: "harvest-card",
          props: templates[0].defaultProps,
        },
      }),
      updateLambdaJob: vi.fn().mockResolvedValue(null), // persistence fails!
      failLambdaStart: vi.fn().mockResolvedValue({
        _id: id,
        status: "failed" as const,
      }),
      get: vi.fn(),
      sweep: vi.fn(),
    };
    const deps = {
      invitations: {
        get: vi.fn().mockResolvedValue({
          templateId: "harvest-card",
          props: templates[0].defaultProps,
        }),
      },
      renders,
      limit: vi.fn(),
      checkPhoto: vi.fn(),
      bindResult: vi.fn(),
      reserveHd: vi.fn(),
      environment: () => "sandbox" as const,
      isLambdaEnabled: () => true,
      getLambdaClient: () => ({
        renderMedia: vi.fn().mockResolvedValue({
          renderId: "remote-render-123",
          bucketName: "remote-bucket",
        }),
        getProgress: vi.fn(),
        cancelRender,
      }),
    };
    const service = createRenderService(
      deps as unknown as Parameters<typeof createRenderService>[0],
    );

    const result = await service.request("owner", "inv-1");
    expect(cancelRender).toHaveBeenCalledWith(
      "remote-render-123",
      "remote-bucket",
    );
    expect(renders.failLambdaStart).toHaveBeenCalledWith(
      id,
      "att-1",
      "The video could not be started. Try exporting again.",
    );
    expect(result.status).toBe("failed");
  });

  it("if cancellation fails after submission, preserves Lambda identifiers in submission_uncertain status and blocks fresh retry", async () => {
    const id = "a".repeat(24);
    const cancelRender = vi.fn().mockRejectedValue(new Error("AWS timeout"));
    const recordUncertainRecoveryData = vi.fn().mockResolvedValue({
      _id: id,
      attemptId: "att-1",
      lambdaRenderId: "remote-render-123",
      bucketName: "remote-bucket",
      status: "submission_uncertain" as "submission_uncertain" | "ready",
      progress: 5,
    });
    const renders = {
      attach: vi.fn(),
      find: vi.fn().mockResolvedValue(null),
      enqueue: vi.fn().mockResolvedValue({
        _id: id,
        invitationId: "b".repeat(24),
        status: "queued" as const,
        tier: "free" as const,
        input: {
          templateId: "harvest-card",
          props: templates[0].defaultProps,
        },
      }),
      claimLambda: vi.fn().mockResolvedValue({
        _id: id,
        attemptId: "att-1",
        tier: "free" as const,
        input: {
          templateId: "harvest-card",
          props: templates[0].defaultProps,
        },
      }),
      updateLambdaJob: vi.fn().mockResolvedValue(null), // persistence fails!
      recordUncertainRecoveryData,
      failLambdaStart: vi.fn(),
      get: vi.fn().mockResolvedValue({
        _id: id,
        lambdaRenderId: "remote-render-123",
        bucketName: "remote-bucket",
        status: "submission_uncertain" as "submission_uncertain" | "ready",
      }),
      sweep: vi.fn(),
    };
    const deps = {
      invitations: {
        get: vi.fn().mockResolvedValue({
          templateId: "harvest-card",
          props: templates[0].defaultProps,
        }),
      },
      renders,
      limit: vi.fn(),
      checkPhoto: vi.fn(),
      bindResult: vi.fn(),
      reserveHd: vi.fn(),
      environment: () => "sandbox" as const,
      isLambdaEnabled: () => true,
      getLambdaClient: () => ({
        renderMedia: vi.fn().mockResolvedValue({
          renderId: "remote-render-123",
          bucketName: "remote-bucket",
        }),
        getProgress: vi.fn(),
        cancelRender,
      }),
    };
    const service = createRenderService(
      deps as unknown as Parameters<typeof createRenderService>[0],
    );

    const result = await service.request("owner", "inv-1");
    expect(cancelRender).toHaveBeenCalledWith(
      "remote-render-123",
      "remote-bucket",
    );
    expect(recordUncertainRecoveryData).toHaveBeenCalledWith(
      id,
      "att-1",
      "remote-render-123",
      "remote-bucket",
    );
    expect(renders.failLambdaStart).not.toHaveBeenCalled();
    expect(result.status).toBe("submission_uncertain");

    // Retry must be blocked while status is not failed
    const retryResult = await service.retry("owner", id);
    expect(retryResult.status).toBe("submission_uncertain");
  });

  it("renderMedia succeeds → updateLambdaJob fails → cancelRender fails → recordPendingLambdaSubmission fails → retry is rejected and no second Lambda submission occurs", async () => {
    const id = "a".repeat(24);
    const cancelRender = vi.fn().mockRejectedValue(new Error("AWS timeout"));
    const renderMedia = vi.fn().mockResolvedValue({
      renderId: "remote-render-123",
      bucketName: "remote-bucket",
    });
    let dbStatus:
      | "queued"
      | "submission_uncertain"
      | "rendering"
      | "failed" = "queued";
    let attempts = 0;

    const renders = {
      attach: vi.fn(),
      find: vi.fn().mockImplementation(() =>
        Promise.resolve({
          _id: id,
          status: dbStatus,
          propsHash: "hash-1",
        }),
      ),
      enqueue: vi.fn().mockResolvedValue({
        _id: id,
        invitationId: "b".repeat(24),
        status: "queued" as const,
        tier: "free" as const,
        input: {
          templateId: "harvest-card",
          props: templates[0].defaultProps,
        },
      }),
      claimLambda: vi.fn().mockImplementation(() => {
        dbStatus = "submission_uncertain";
        attempts++;
        return Promise.resolve({
          _id: id,
          attemptId: "att-1",
          status: "submission_uncertain" as "submission_uncertain" | "ready",
          tier: "free" as const,
          attempts,
          input: {
            templateId: "harvest-card",
            props: templates[0].defaultProps,
          },
        });
      }),
      updateLambdaJob: vi
        .fn()
        .mockRejectedValue(new Error("Mongo connection timeout")),
      recordUncertainRecoveryData: vi
        .fn()
        .mockRejectedValue(new Error("Mongo secondary failure")),
      failLambdaStart: vi.fn(),
      get: vi.fn().mockImplementation(() =>
        Promise.resolve({
          _id: id,
          status: dbStatus,
          tier: "free" as const,
          attempts,
        }),
      ),
      retryById: vi.fn(),
      sweep: vi.fn(),
    };

    const deps = {
      invitations: {
        get: vi.fn().mockResolvedValue({
          templateId: "harvest-card",
          props: templates[0].defaultProps,
        }),
      },
      renders,
      limit: vi.fn(),
      checkPhoto: vi.fn(),
      bindResult: vi.fn(),
      reserveHd: vi.fn(),
      environment: () => "sandbox" as const,
      isLambdaEnabled: () => true,
      getLambdaClient: () => ({
        renderMedia,
        getProgress: vi.fn(),
        cancelRender,
      }),
    };
    const service = createRenderService(
      deps as unknown as Parameters<typeof createRenderService>[0],
    );

    // Initial request: renderMedia succeeds, updateLambdaJob fails, cancelRender fails, recordPendingLambdaSubmission fails
    const result = await service.request("owner", "inv-1");

    expect(renderMedia).toHaveBeenCalledTimes(1);
    expect(cancelRender).toHaveBeenCalledWith(
      "remote-render-123",
      "remote-bucket",
    );
    expect(renders.recordUncertainRecoveryData).toHaveBeenCalledWith(
      id,
      "att-1",
      "remote-render-123",
      "remote-bucket",
    );
    expect(renders.failLambdaStart).not.toHaveBeenCalled();
    expect(result.status).toBe("submission_uncertain");
    expect(dbStatus).toBe("submission_uncertain");

    // Retry must be rejected and must NOT call renderMedia a second time
    const retryResult = await service.retry("owner", id);
    expect(retryResult.status).toBe("submission_uncertain");
    expect(renders.retryById).not.toHaveBeenCalled();
    expect(renderMedia).toHaveBeenCalledTimes(1);

    // Repeated requestRender returns existing record and must NOT submit to Lambda again
    const repeatedRequest = await service.request("owner", "inv-1");
    expect(repeatedRequest.status).toBe("submission_uncertain");
    expect(renderMedia).toHaveBeenCalledTimes(1);
  });

  it("coalesces global sweep and does not run global sweep on get", async () => {
    const sweepFn = vi.fn().mockResolvedValue(undefined);
    const findExpiredLambdaRenders = vi
      .fn()
      .mockResolvedValue([]);
    const renders = {
      get: vi.fn().mockResolvedValue({
        _id: "1".repeat(24),
        status: "ready" as const,
      }),
      sweep: sweepFn,
      findExpiredLambdaRenders,
    };
    const deps = {
      invitations: { get: vi.fn() },
      renders,
      limit: vi.fn(),
      checkPhoto: vi.fn(),
      bindResult: vi.fn(),
      reserveHd: vi.fn(),
      environment: () => "sandbox" as const,
      isLambdaEnabled: () => true,
      getLambdaClient: vi.fn(),
    };
    const service = createRenderService(
      deps as unknown as Parameters<typeof createRenderService>[0],
    );

    // get() does not call global sweep
    await service.get("owner", "1".repeat(24));
    expect(sweepFn).not.toHaveBeenCalled();
    expect(findExpiredLambdaRenders).not.toHaveBeenCalled();

    // Calling sweep concurrently coalesces
    await Promise.all([service.sweep(), service.sweep()]);
    expect(sweepFn).toHaveBeenCalledTimes(1);
    expect(findExpiredLambdaRenders).toHaveBeenCalledTimes(1);
  });

  it("recovers poster with uncertain render and allows public result to display video and poster", async () => {
    const id = "f".repeat(24);
    const attemptId = "attempt-recovery-123";
    const outputKey = `renders/${id}/${attemptId}.mp4`;
    const posterKey = `posters/${id}/${attemptId}.png`;

    let record = {
      _id: id,
      invitationId: "b".repeat(24),
      ownerClerkId: "owner",
      status: "submission_uncertain" as "submission_uncertain" | "ready",
      attemptId,
      outputKey,
      posterKey,
      attempts: 1,
      tier: "free" as const,
      input: {
        templateId: "harvest-card",
        props: {
          ...templates[0].defaultProps,
          type: "card" as const,
          senderName: "Nayab",
          themeId: "thanksgiving",
        },
      },
      fileUrl: undefined as string | undefined,
      posterUrl: undefined as string | undefined,
    };

    let posterExists = false;
    const checkOutputExists = vi.fn(async (key: string) => {
      if (key === outputKey) {
        return { exists: true, url: "https://media.test/video.mp4" };
      }
      if (key === posterKey) {
        return posterExists
          ? { exists: true, url: "https://media.test/poster.png" }
          : { exists: false };
      }
      return { exists: false };
    });

    const renders = {
      get: vi.fn().mockImplementation(async () => ({ ...record })),
      sweep: vi.fn().mockResolvedValue(undefined),
      findUncertainJobs: vi.fn().mockImplementation(async () => [record]),
      recoverUncertainJob: vi.fn(
        async (
          jobId: string,
          attId: string,
          fileUrl: string,
          posterUrl?: string,
        ) => {
          if (
            jobId === id &&
            attId === attemptId &&
            record.status === "submission_uncertain"
          ) {
            record = {
              ...record,
              status: "ready" as const,
              fileUrl,
              posterUrl,
            };
            return { ...record };
          }
          return null;
        },
      ),
    };

    const deps = {
      invitations: { get: vi.fn() },
      renders,
      limit: vi.fn(),
      checkPhoto: vi.fn(),
      bindResult: vi.fn(),
      reserveHd: vi.fn(),
      environment: () => "sandbox" as const,
      isLambdaEnabled: () => true,
      getLambdaClient: () => ({
        renderMedia: vi.fn(),
        getProgress: vi.fn(),
        checkOutputExists,
      }),
    };

    const service = createRenderService(
      deps as unknown as Parameters<typeof createRenderService>[0],
    );

    // 1. When poster does not exist yet in S3, recovery does NOT mark ready
    await service.sweep();
    expect(renders.recoverUncertainJob).not.toHaveBeenCalled();
    expect(record.status).toBe("submission_uncertain");

    // 2. When poster exists too, recovery marks ready and saves both URLs
    posterExists = true;
    await service.sweep();
    expect(renders.recoverUncertainJob).toHaveBeenCalledWith(
      id,
      attemptId,
      "https://media.test/video.mp4",
      "https://media.test/poster.png",
    );
    expect(record.status).toBe("ready");
    expect(record.fileUrl).toBe("https://media.test/video.mp4");
    expect(record.posterUrl).toBe("https://media.test/poster.png");

    // 3. Public result lookup requires both videoUrl and posterUrl to display the video
    const mockResultRepo = {
      find: vi.fn().mockResolvedValue({
        shareId: "share-token-1234567890",
        render: record,
      }),
    };
    const resultService = createResultService(
      mockResultRepo as unknown as Parameters<typeof createResultService>[0],
    );
    const publicResult = await resultService.get("share-token-1234567890");

    expect(publicResult.status).toBe("ready");
    expect(publicResult.videoUrl).toBe("https://media.test/video.mp4");
    expect(publicResult.posterUrl).toBe("https://media.test/poster.png");
  });
});
