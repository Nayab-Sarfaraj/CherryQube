import { describe, expect, it } from "vitest";
import {
  computeSha1Buffer,
  computeSha256Buffer,
  installCryptoSubtlePolyfill,
} from "./crypto-subtle-polyfill";

describe("crypto-subtle-polyfill re-export in web", () => {
  it("re-exports working SHA-256 and SHA-1 implementations", async () => {
    const buf256 = computeSha256Buffer("hello");
    expect(buf256.byteLength).toBe(32);
    const buf1 = computeSha1Buffer("hello");
    expect(buf1.byteLength).toBe(20);

    const mockTarget: { crypto?: { subtle?: { digest?: unknown } } } = {};
    installCryptoSubtlePolyfill(mockTarget as unknown as Window);
    expect(mockTarget.crypto?.subtle?.digest).toBeTypeOf("function");
  });
});
