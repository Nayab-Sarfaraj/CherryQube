import { describe, expect, it } from "vitest";
import { visiblePublicRender } from "./result.repository";

describe("visiblePublicRender", () => {
  it("keeps the prior published video visible while a replacement is pending", () => {
    const published = { status: "ready", fileUrl: "old.mp4" };
    const pending = { status: "rendering", fileUrl: "new.mp4" };
    expect(visiblePublicRender(published, pending)).toBe(published);
  });
});
