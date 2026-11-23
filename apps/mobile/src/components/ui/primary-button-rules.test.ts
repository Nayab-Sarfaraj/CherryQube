import { describe, expect, it } from "vitest";
import { resolveButtonAccessibilityLabel } from "./primary-button-rules";

describe("resolveButtonAccessibilityLabel", () => {
  it("defaults to label when caller does not provide custom accessibilityLabel", () => {
    expect(resolveButtonAccessibilityLabel("Continue with email")).toBe(
      "Continue with email",
    );
  });

  it("defaults to label when caller supplies undefined", () => {
    expect(resolveButtonAccessibilityLabel("Sign in", undefined)).toBe(
      "Sign in",
    );
  });

  it("uses caller accessibilityLabel when provided", () => {
    expect(
      resolveButtonAccessibilityLabel("Save", "Save greeting card to account"),
    ).toBe("Save greeting card to account");
  });
});
