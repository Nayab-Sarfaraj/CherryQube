import { describe, expect, it, vi, beforeEach } from "vitest";
import { sweep } from "./render.router";
import * as renderService from "./render.service";

vi.mock("./render.service", async () => {
  const actual = await vi.importActual<typeof renderService>("./render.service");
  return {
    ...actual,
    sweepRenders: vi.fn().mockResolvedValue(undefined),
  };
});

describe("render.router sweep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("executes sweep successfully when CRON_SECRET matches Bearer authorization", async () => {
    vi.stubEnv("CRON_SECRET", "my-cron-secret");
    const request = new Request("http://localhost/api/cron/sweep", {
      headers: {
        authorization: "Bearer my-cron-secret",
      },
    });

    const response = await sweep(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.sweptAt).toBeDefined();
    expect(renderService.sweepRenders).toHaveBeenCalledOnce();
  });

  it("executes sweep successfully when CRON_SECRET matches x-cron-secret header", async () => {
    vi.stubEnv("CRON_SECRET", "my-cron-secret");
    const request = new Request("http://localhost/api/cron/sweep", {
      headers: {
        "x-cron-secret": "my-cron-secret",
      },
    });

    const response = await sweep(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(renderService.sweepRenders).toHaveBeenCalledOnce();
  });

  it("returns 403 when authorization secret is invalid", async () => {
    vi.stubEnv("CRON_SECRET", "my-cron-secret");
    const request = new Request("http://localhost/api/cron/sweep", {
      headers: {
        authorization: "Bearer wrong-secret",
      },
    });

    const response = await sweep(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error?.code).toBe("FORBIDDEN");
    expect(renderService.sweepRenders).not.toHaveBeenCalled();
  });

  it("returns 403 in production when CRON_SECRET is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "");
    const request = new Request("http://localhost/api/cron/sweep");

    const response = await sweep(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error?.code).toBe("FORBIDDEN");
    expect(renderService.sweepRenders).not.toHaveBeenCalled();
  });
});
