import { describe, expect, it, vi } from "vitest";
import { createRenderService, canonical } from "./render.service";
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
});
