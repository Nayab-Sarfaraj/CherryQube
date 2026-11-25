import { describe, expect, it } from "vitest";
import {
  computeSha1Buffer,
  computeSha256Buffer,
  installCryptoSubtlePolyfill,
} from "./crypto-subtle-polyfill";

describe("crypto-subtle-polyfill in shared", () => {
  it("computes accurate SHA-256 hash matching standard test vectors", () => {
    const buffer = computeSha256Buffer("hello");
    const hex = Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    expect(hex).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("computes accurate SHA-1 hash matching standard test vectors", () => {
    const buffer = computeSha1Buffer("hello");
    const hex = Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    expect(hex).toBe("aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d");
  });

  it("installs subtle.digest on targets missing subtle", async () => {
    const mockWindow: { crypto?: { subtle?: { digest?: unknown } } } = {};
    installCryptoSubtlePolyfill(mockWindow as unknown as Window);

    expect(mockWindow.crypto?.subtle).toBeDefined();
    const digestFn = mockWindow.crypto?.subtle?.digest as (
      algo: string,
      data: unknown,
    ) => Promise<ArrayBuffer>;
    const res = await digestFn("SHA-256", "test");
    const hex = Array.from(new Uint8Array(res))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    expect(hex).toBe(
      "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    );
  });
});
