import { describe, expect, it, vi } from "vitest";
import { cronSecret, getConfig, s3UploadsConfig } from "./config";
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

  it("uses no S3 adapter when the uploads bucket is unset", () => {
    vi.stubEnv("S3_UPLOADS_BUCKET", "");
    expect(s3UploadsConfig()).toBeNull();
    vi.unstubAllEnvs();
  });

  it("validates the configured private uploads bucket", () => {
    vi.stubEnv("S3_UPLOADS_BUCKET", "cherryqube-uploads");
    vi.stubEnv("AWS_REGION", "us-east-1");
    expect(s3UploadsConfig()).toEqual({
      bucketName: "cherryqube-uploads",
      region: "us-east-1",
    });
    vi.stubEnv("S3_UPLOADS_BUCKET", "INVALID_BUCKET");
    expect(() => s3UploadsConfig()).toThrow("Invalid S3 uploads configuration");
    vi.unstubAllEnvs();
  });
});
