import { describe, expect, it } from "vitest";
import { getClerkFrontendOrigin } from "./mobile-config";

function publishableKey(frontendApi: string) {
  return `pk_test_${Buffer.from(`${frontendApi}$`).toString("base64")}`;
}

describe("getClerkFrontendOrigin", () => {
  it("derives the exact Clerk frontend origin from a publishable key", () => {
    expect(
      getClerkFrontendOrigin(
        publishableKey("example-instance.clerk.accounts.dev"),
      ),
    ).toBe("https://example-instance.clerk.accounts.dev");
  });

  it("rejects malformed publishable keys", () => {
    expect(getClerkFrontendOrigin("pk_test_not-base64")).toBeNull();
    expect(getClerkFrontendOrigin(null)).toBeNull();
  });
});
