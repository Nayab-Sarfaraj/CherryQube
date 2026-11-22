import { describe, expect, it } from "vitest";
import {
  buildEditorPath,
  getClerkFrontendOrigin,
  isLoopbackOrigin,
  resolveWebOrigin,
} from "./mobile-config";

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

describe("buildEditorPath", () => {
  it("builds fresh create path when draftId is omitted", () => {
    expect(buildEditorPath("harvest-card")).toBe("/create/harvest-card");
  });

  it("builds editing path with draft query parameter when draftId is provided", () => {
    expect(buildEditorPath("harvest-card", "inv-123")).toBe(
      "/create/harvest-card?draft=inv-123",
    );
  });
});

describe("resolveWebOrigin", () => {
  describe("Android emulator (isPhysicalDevice: false)", () => {
    it("translates localhost to 10.0.2.2 on Android emulator", () => {
      expect(resolveWebOrigin("http://localhost:3000", "android", false)).toBe(
        "http://10.0.2.2:3000",
      );
    });

    it("defaults to 10.0.2.2:3000 when unconfigured on Android emulator", () => {
      expect(resolveWebOrigin(undefined, "android", false)).toBe(
        "http://10.0.2.2:3000",
      );
    });

    it("preserves production domains on Android emulator without altering them", () => {
      expect(
        resolveWebOrigin("https://cherryqube.vercel.app", "android", false),
      ).toBe("https://cherryqube.vercel.app");
    });

    it("preserves LAN IP addresses on Android emulator without altering them", () => {
      expect(
        resolveWebOrigin("http://192.168.1.100:3000", "android", false),
      ).toBe("http://192.168.1.100:3000");
    });
  });

  describe("Physical Android device (isPhysicalDevice: true)", () => {
    it("rejects localhost with a descriptive error on physical devices", () => {
      expect(() =>
        resolveWebOrigin("http://localhost:3000", "android", true),
      ).toThrowError(/physical device.*localhost/i);
    });

    it("rejects 127.0.0.1 with a descriptive error on physical devices", () => {
      expect(() =>
        resolveWebOrigin("http://127.0.0.1:3000", "android", true),
      ).toThrowError(/physical device/i);
    });

    it("rejects unset origin with a descriptive error on physical devices", () => {
      expect(() => resolveWebOrigin(undefined, "android", true)).toThrowError(
        /physical device.*unset/i,
      );
    });

    it("preserves explicit LAN IP addresses for real-device testing", () => {
      expect(
        resolveWebOrigin("http://192.168.1.100:3000", "android", true),
      ).toBe("http://192.168.1.100:3000");
    });

    it("preserves deployed origins on physical devices", () => {
      expect(
        resolveWebOrigin("https://cherryqube.vercel.app", "android", true),
      ).toBe("https://cherryqube.vercel.app");
    });
  });

  describe("Non-Android platforms", () => {
    it("keeps localhost as-is on iOS", () => {
      expect(resolveWebOrigin("http://localhost:3000", "ios", false)).toBe(
        "http://localhost:3000",
      );
    });

    it("defaults to localhost:3000 when unconfigured on iOS", () => {
      expect(resolveWebOrigin(undefined, "ios", false)).toBe(
        "http://localhost:3000",
      );
    });
  });
});

describe("isLoopbackOrigin", () => {
  it("identifies localhost, 127.0.0.1, and loopback subdomains", () => {
    expect(isLoopbackOrigin("http://localhost:3000")).toBe(true);
    expect(isLoopbackOrigin("http://127.0.0.1:3000")).toBe(true);
    expect(isLoopbackOrigin("localhost:3000")).toBe(true);
    expect(isLoopbackOrigin("http://test.localhost:3000")).toBe(true);
  });

  it("identifies LAN IPs and public domains as non-loopback", () => {
    expect(isLoopbackOrigin("http://192.168.1.100:3000")).toBe(false);
    expect(isLoopbackOrigin("https://cherryqube.vercel.app")).toBe(false);
    expect(isLoopbackOrigin(undefined)).toBe(false);
    expect(isLoopbackOrigin(null)).toBe(false);
  });
});
