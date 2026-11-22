import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { clearCacheForUserChange } from "./query-cache";

describe("clearCacheForUserChange", () => {
  it("does not expose user A data after a user B session begins", () => {
    const client = new QueryClient();
    client.setQueryData(["invitations"], [{ id: "owned-by-a" }]);
    clearCacheForUserChange(client, "user-a", "user-b");
    expect(client.getQueryData(["invitations"])).toBeUndefined();
  });
});
