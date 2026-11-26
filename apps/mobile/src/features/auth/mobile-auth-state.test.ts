import { describe, expect, it } from "vitest";
import {
  actionForWebAuthStatus,
  initialMobileAuthState,
  mobileAuthReducer,
} from "./mobile-auth-state";

describe("mobileAuthReducer", () => {
  it("moves an anonymous cold start to signed out", () => {
    expect(
      mobileAuthReducer(initialMobileAuthState, { type: "SIGNED_OUT" }),
    ).toMatchObject({ status: "signed-out", error: null });
  });

  it("follows a sign-in and handoff to ready", () => {
    const signingIn = mobileAuthReducer(initialMobileAuthState, {
      type: "REQUEST_SIGN_IN",
    });
    const handoff = mobileAuthReducer(signingIn, { type: "NATIVE_SIGNED_IN" });
    expect(mobileAuthReducer(handoff, { type: "HANDOFF_READY" })).toMatchObject(
      {
        status: "ready",
        silentRetries: 0,
      },
    );
  });

  it("keeps an already authenticated cold start ready when the web session is valid", () => {
    const readyForPreview = mobileAuthReducer(initialMobileAuthState, {
      type: "NATIVE_SESSION_AVAILABLE",
    });
    expect(readyForPreview).toMatchObject({
      status: "ready",
      error: null,
    });
  });

  it("does not let the cold-start session action overwrite a handoff queued in the same commit", () => {
    const handoff = mobileAuthReducer(initialMobileAuthState, {
      type: "AUTH_EXPIRED",
    });
    const afterParentEffect = mobileAuthReducer(handoff, {
      type: "NATIVE_SESSION_AVAILABLE",
    });
    expect(afterParentEffect).toMatchObject({
      status: "handoff-pending",
      handoffAttempt: 1,
    });
  });

  it("starts a single handoff when a restored native session finds no web session", () => {
    const restored = mobileAuthReducer(initialMobileAuthState, {
      type: "NATIVE_SESSION_AVAILABLE",
    });
    const first = mobileAuthReducer(restored, {
      type: "AUTH_EXPIRED",
    });
    expect(first).toMatchObject({
      status: "handoff-pending",
      silentRetries: 1,
      handoffAttempt: 1,
    });
    const second = mobileAuthReducer(first, { type: "AUTH_EXPIRED" });
    expect(second).toMatchObject({
      status: "handoff-pending",
      silentRetries: 2,
      handoffAttempt: 2,
    });
    const manualRetry = mobileAuthReducer(second, { type: "NATIVE_SIGNED_IN" });
    expect(manualRetry).toMatchObject({
      status: "handoff-pending",
      silentRetries: 0,
      handoffAttempt: 3,
    });
    expect(mobileAuthReducer(second, { type: "HANDOFF_READY" })).toMatchObject({
      status: "ready",
      silentRetries: 0,
    });
  });

  it("verifies the same web user before accepting a handoff", () => {
    const restored = mobileAuthReducer(initialMobileAuthState, {
      type: "NATIVE_SESSION_AVAILABLE",
    });
    expect(actionForWebAuthStatus(restored, "user-a", "user-a", false)).toEqual(
      {
        type: "HANDOFF_READY",
      },
    );
    expect(actionForWebAuthStatus(restored, "user-a", "user-b", false)).toEqual(
      {
        type: "AUTH_EXPIRED",
      },
    );
  });

  it("waits for the editor, then stops after two mismatched handoffs", () => {
    const pending = {
      status: "handoff-pending" as const,
      error: null,
      silentRetries: 2,
      handoffAttempt: 2,
    };
    expect(
      actionForWebAuthStatus(pending, "user-a", "user-b", false),
    ).toBeNull();
    expect(
      actionForWebAuthStatus(pending, "user-a", "user-b", true),
    ).toMatchObject({
      type: "HANDOFF_FAILED",
    });
    expect(actionForWebAuthStatus(pending, "user-a", "user-a", true)).toEqual({
      type: "HANDOFF_READY",
    });
  });

  it("starts handoff when the web session is absent and ignores duplicate signals while waiting", () => {
    const restored = mobileAuthReducer(initialMobileAuthState, {
      type: "NATIVE_SESSION_AVAILABLE",
    });
    expect(actionForWebAuthStatus(restored, "user-a", null, false)).toEqual({
      type: "AUTH_EXPIRED",
    });
    const pending = mobileAuthReducer(restored, { type: "AUTH_EXPIRED" });
    expect(actionForWebAuthStatus(pending, "user-a", null, false)).toBeNull();
  });

  it("does not hand off an anonymous native user or retry after failure", () => {
    expect(
      actionForWebAuthStatus(initialMobileAuthState, null, "user-b", false),
    ).toEqual({ type: "SIGNED_OUT" });
    const failed = mobileAuthReducer(initialMobileAuthState, {
      type: "HANDOFF_FAILED",
      message: "Could not sync your account.",
    });
    expect(actionForWebAuthStatus(failed, "user-a", null, true)).toBeNull();
    expect(actionForWebAuthStatus(failed, "user-a", "user-a", true)).toEqual({
      type: "HANDOFF_READY",
    });
  });
});
