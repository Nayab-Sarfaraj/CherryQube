import { describe, expect, it } from "vitest";
import { getCreationStatusBadge, isSubmissionUncertain } from "./status";

describe("creation status mapping", () => {
  it("maps queued and rendering to rendering badge", () => {
    expect(getCreationStatusBadge("queued")).toEqual({
      variant: "rendering",
      label: "Rendering",
    });
    expect(getCreationStatusBadge("rendering")).toEqual({
      variant: "rendering",
      label: "Rendering",
    });
  });

  it("maps ready and failed correctly", () => {
    expect(getCreationStatusBadge("ready")).toEqual({
      variant: "ready",
      label: "Ready",
    });
    expect(getCreationStatusBadge("failed")).toEqual({
      variant: "failed",
      label: "Failed",
    });
  });

  it("maps submission_uncertain to Export recovery instead of Draft", () => {
    expect(getCreationStatusBadge("submission_uncertain")).toEqual({
      variant: "rendering",
      label: "Export recovery",
    });
    expect(getCreationStatusBadge("SUBMISSION_UNCERTAIN")).toEqual({
      variant: "rendering",
      label: "Export recovery",
    });
    expect(isSubmissionUncertain("submission_uncertain")).toBe(true);
    expect(isSubmissionUncertain("draft")).toBe(false);
  });

  it("falls back to Draft for draft and unknown statuses", () => {
    expect(getCreationStatusBadge("draft")).toEqual({
      variant: "draft",
      label: "Draft",
    });
    expect(getCreationStatusBadge(undefined)).toEqual({
      variant: "draft",
      label: "Draft",
    });
    expect(getCreationStatusBadge("unknown")).toEqual({
      variant: "draft",
      label: "Draft",
    });
  });
});
