import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createApiClient } from "./api-client";

describe("api-client", () => {
  it("attaches Authorization header when token is available", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: "world" }),
    });

    const client = createApiClient({
      baseUrl: "https://api.example.com",
      getAuthToken: async () => "mock-jwt-token",
      fetchFn: fetchFn as any,
    });

    const res = await client.get<{ hello: string }>("/test");
    expect(res).toEqual({ hello: "world" });
    expect(fetchFn).toHaveBeenCalledWith("https://api.example.com/test", {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer mock-jwt-token",
      },
      body: undefined,
    });
  });

  it("handles 401 status, calls onUnauthorized, and throws ApiError", async () => {
    const onUnauthorized = vi.fn();
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: "UNAUTHORIZED", message: "Session expired" },
      }),
    });

    const client = createApiClient({
      baseUrl: "https://api.example.com",
      onUnauthorized,
      fetchFn: fetchFn as any,
    });

    await expect(client.get("/protected")).rejects.toThrow("Session expired");
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("validates response with Zod schema if provided", async () => {
    const schema = z.object({ count: z.number() });
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ count: 42 }),
    });

    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchFn: fetchFn as any,
    });

    const res = await client.get("/count", schema);
    expect(res).toEqual({ count: 42 });
  });

  it("throws ZodError when schema validation fails", async () => {
    const schema = z.object({ count: z.number() });
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ count: "not-a-number" }),
    });

    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchFn: fetchFn as any,
    });

    await expect(client.get("/count", schema)).rejects.toThrow();
  });

  it("returns undefined on 204 No Content response", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });

    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetchFn: fetchFn as any,
    });

    const res = await client.delete("/item/1");
    expect(res).toBeUndefined();
  });
});
