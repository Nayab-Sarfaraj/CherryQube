import { describe, expect, it } from "vitest";
import { parseWebToNativeBridgeMessage } from "./mobile-bridge";

describe("web auth status bridge message", () => {
  it("accepts an anonymous session and a Clerk user ID", () => {
    expect(
      parseWebToNativeBridgeMessage({ type: "WEB_AUTH_STATUS", userId: null })
        .success,
    ).toBe(true);
    expect(
      parseWebToNativeBridgeMessage({
        type: "WEB_AUTH_STATUS",
        userId: "user_123",
      }).success,
    ).toBe(true);
  });

  it.each(["", "x".repeat(256), 42, undefined])(
    "rejects an invalid web user ID: %s",
    (userId) => {
      expect(
        parseWebToNativeBridgeMessage({ type: "WEB_AUTH_STATUS", userId })
          .success,
      ).toBe(false);
    },
  );
});
