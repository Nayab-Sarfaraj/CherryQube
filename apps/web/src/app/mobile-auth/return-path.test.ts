import { describe, expect, it } from "vitest";
import { safeMobileReturnPath } from "./return-path";

describe("safeMobileReturnPath", () => {
  it("accepts same-origin relative paths", () => {
    expect(safeMobileReturnPath("/create/harvest-card?embed=1")).toBe(
      "/create/harvest-card?embed=1",
    );
  });

  it.each([
    null,
    "https://attacker.test",
    "//attacker.test",
    "/\\attacker.test",
  ])("falls back for unsafe return paths", (value) =>
    expect(safeMobileReturnPath(value)).toBe("/"),
  );
});
