import { describe, expect, it } from "vitest";
import { initialMobileAuthState, mobileAuthReducer } from "./mobile-auth-state";

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

  it("moves an already authenticated cold start into handoff-pending", () => {
    const readyForHandoff = mobileAuthReducer(initialMobileAuthState, {
      type: "NATIVE_SIGNED_IN",
    });
    expect(readyForHandoff).toMatchObject({
      status: "handoff-pending",
      error: null,
    });
  });

  it("counts silent renewal attempts", () => {
    const first = mobileAuthReducer(initialMobileAuthState, {
      type: "AUTH_EXPIRED",
    });
    expect(first).toMatchObject({
      status: "handoff-pending",
      silentRetries: 1,
    });
  });
});
