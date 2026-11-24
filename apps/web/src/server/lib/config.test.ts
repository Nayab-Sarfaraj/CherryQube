import { describe, expect, it, vi } from "vitest";
import { cronSecret, getConfig } from "./config";
describe("config", () => {
  it("names a missing required variable", () => {
    vi.stubEnv("MONGODB_URI", "");
    expect(() => getConfig()).toThrow("MONGODB_URI");
    vi.unstubAllEnvs();
  });

  it("reads cronSecret when set and trims whitespace", () => {
    vi.stubEnv("CRON_SECRET", "  secret-123  ");
    expect(cronSecret()).toBe("secret-123");
    vi.stubEnv("CRON_SECRET", "");
    expect(cronSecret()).toBeNull();
    vi.unstubAllEnvs();
  });
});
