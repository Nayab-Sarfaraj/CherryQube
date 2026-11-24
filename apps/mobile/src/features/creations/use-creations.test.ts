import { describe, expect, it } from "vitest";
import {
  flattenCreationPages,
  shouldPollCreations,
  shouldPollRender,
} from "./polling-rules";

describe("flattenCreationPages", () => {
  it("concatenates items across multiple pages, preserving earlier creations", () => {
    const page1 = {
      items: [
        { id: "1", title: "Card 1" },
        { id: "2", title: "Card 2" },
      ],
      nextCursor: "cursor-2",
    };
    const page2 = {
      items: [{ id: "3", title: "Card 3" }],
      nextCursor: null,
    };

    const combined = flattenCreationPages([page1, page2]);
    expect(combined).toHaveLength(3);
    expect(combined.map((c) => c.id)).toEqual(["1", "2", "3"]);
  });

  it("handles undefined or empty pages safely", () => {
    expect(flattenCreationPages(undefined)).toEqual([]);
    expect(flattenCreationPages([])).toEqual([]);
  });
});

describe("creations polling rules", () => {
  it("polls creations only while focused, foregrounded, and at least one item is rendering/queued", () => {
    expect(shouldPollCreations(false, true, [{ status: "rendering" }])).toBe(
      false,
    );
    expect(shouldPollCreations(true, false, [{ status: "rendering" }])).toBe(
      false,
    );
    expect(
      shouldPollCreations(true, true, [
        { status: "ready" },
        { status: "draft" },
      ]),
    ).toBe(false);
    expect(
      shouldPollCreations(true, true, [
        { status: "ready" },
        { status: "queued" },
      ]),
    ).toBe(3000);
    expect(shouldPollCreations(true, true, [{ status: "rendering" }])).toBe(
      3000,
    );
    expect(shouldPollCreations(true, true, undefined)).toBe(false);
  });
});

describe("render detail polling rules", () => {
  it("stops polling entirely when unfocused or backgrounded", () => {
    expect(shouldPollRender(false, true, "rendering")).toBe(false);
    expect(shouldPollRender(true, false, "rendering")).toBe(false);
    expect(shouldPollRender(false, false, "queued")).toBe(false);
  });

  it("stops polling on terminal status ready, failed, or submission_uncertain", () => {
    expect(shouldPollRender(true, true, "ready")).toBe(false);
    expect(shouldPollRender(true, true, "failed")).toBe(false);
    expect(shouldPollRender(true, true, "submission_uncertain")).toBe(false);
  });

  it("polls every 2000ms when in progress, focused, and foregrounded", () => {
    expect(shouldPollRender(true, true, "queued")).toBe(2000);
    expect(shouldPollRender(true, true, "rendering")).toBe(2000);
  });
});
