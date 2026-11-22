import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import {
  formatCreditBalance,
  performDeleteAccount,
  performSignOut,
} from "./account-rules";

describe("account-rules", () => {
  describe("formatCreditBalance", () => {
    it("formats zero, singular, plural, and undefined balances", () => {
      expect(formatCreditBalance(undefined)).toBe("—");
      expect(formatCreditBalance(null)).toBe("—");
      expect(formatCreditBalance(0)).toBe("0 export credits");
      expect(formatCreditBalance(1)).toBe("1 HD export credit");
      expect(formatCreditBalance(5)).toBe("5 HD export credits");
    });
  });

  describe("performSignOut", () => {
    it("signs out of Clerk and purges the query cache completely", async () => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["creations"], [{ id: "c-1" }]);
      queryClient.setQueryData(["entitlements"], { balance: 2 });

      const signOutMock = vi.fn().mockResolvedValue(undefined);

      await performSignOut(signOutMock, queryClient);

      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(queryClient.getQueryData(["creations"])).toBeUndefined();
      expect(queryClient.getQueryData(["entitlements"])).toBeUndefined();
    });
  });

  describe("performDeleteAccount", () => {
    it("calls API delete, then signs out and purges the query cache", async () => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["creations"], [{ id: "c-1" }]);

      const deleteApiMock = vi.fn().mockResolvedValue(undefined);
      const signOutMock = vi.fn().mockResolvedValue(undefined);

      await performDeleteAccount(deleteApiMock, signOutMock, queryClient);

      expect(deleteApiMock).toHaveBeenCalledTimes(1);
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(queryClient.getQueryData(["creations"])).toBeUndefined();
    });

    it("clears query cache and succeeds even when signOutFn rejects after API delete succeeds", async () => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["creations"], [{ id: "c-1" }]);

      const deleteApiMock = vi.fn().mockResolvedValue(undefined);
      const signOutMock = vi
        .fn()
        .mockRejectedValue(new Error("Clerk session deleted"));

      await expect(
        performDeleteAccount(deleteApiMock, signOutMock, queryClient),
      ).resolves.toBeUndefined();

      expect(deleteApiMock).toHaveBeenCalledTimes(1);
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(queryClient.getQueryData(["creations"])).toBeUndefined();
    });

    it("propagates API deletion errors without signing out or purging cache prematurely", async () => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["creations"], [{ id: "c-1" }]);

      const deleteApiMock = vi
        .fn()
        .mockRejectedValue(new Error("Network error"));
      const signOutMock = vi.fn();

      await expect(
        performDeleteAccount(deleteApiMock, signOutMock, queryClient),
      ).rejects.toThrow("Network error");

      expect(signOutMock).not.toHaveBeenCalled();
      expect(queryClient.getQueryData(["creations"])).toBeDefined();
    });
  });
});
