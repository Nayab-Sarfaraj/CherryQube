import { describe, expect, it, vi } from "vitest";
import {
  createDismissalGuard,
  evaluateOAuthResult,
  evaluateSignInResult,
  evaluateSignUpResult,
} from "./sign-in-rules";

describe("evaluateSignInResult", () => {
  it("returns success and sessionId when status is complete", () => {
    const outcome = evaluateSignInResult({
      status: "complete",
      createdSessionId: "sess_123",
    });
    expect(outcome).toEqual({
      success: true,
      sessionId: "sess_123",
    });
  });

  it("identifies needs_second_factor and provides clear 2FA message", () => {
    const outcome = evaluateSignInResult({
      status: "needs_second_factor",
    });
    expect(outcome.success).toBe(false);
    expect(outcome.error).toMatch(/two-factor authentication.*2fa/i);
  });

  it("identifies needs_identifier and prompts for email", () => {
    const outcome = evaluateSignInResult({
      status: "needs_identifier",
    });
    expect(outcome.success).toBe(false);
    expect(outcome.error).toMatch(/enter your email/i);
  });

  it("identifies missingFields and lists them explicitly", () => {
    const outcome = evaluateSignInResult({
      status: "missing_requirements",
      missingFields: ["phone_number", "backup_code"],
    });
    expect(outcome.success).toBe(false);
    expect(outcome.error).toContain("phone_number, backup_code");
  });

  it("provides fallback verification message for unhandled status", () => {
    const outcome = evaluateSignInResult({
      status: "unknown_status",
    });
    expect(outcome.success).toBe(false);
    expect(outcome.error).toMatch(/check your 6-digit code/i);
  });
});

describe("evaluateSignUpResult", () => {
  it("returns success and sessionId when sign-up completes", () => {
    const outcome = evaluateSignUpResult({
      status: "complete",
      createdSessionId: "sess_456",
    });
    expect(outcome).toEqual({
      success: true,
      sessionId: "sess_456",
    });
  });

  it("identifies missing_requirements with explicit missing fields", () => {
    const outcome = evaluateSignUpResult({
      status: "missing_requirements",
      missingFields: ["first_name", "last_name"],
    });
    expect(outcome.success).toBe(false);
    expect(outcome.error).toContain("first_name, last_name");
  });

  it("identifies missing_requirements without explicit fields", () => {
    const outcome = evaluateSignUpResult({
      status: "missing_requirements",
      missingFields: [],
    });
    expect(outcome.success).toBe(false);
    expect(outcome.error).toMatch(
      /account setup requires additional information/i,
    );
  });

  it("returns fallback message on verification failure", () => {
    const outcome = evaluateSignUpResult({
      status: "abandoned",
    });
    expect(outcome.success).toBe(false);
    expect(outcome.error).toMatch(/check your 6-digit code/i);
  });
});

describe("evaluateOAuthResult", () => {
  it("returns success when createdSessionId is present", () => {
    const outcome = evaluateOAuthResult({
      createdSessionId: "sess_oauth_789",
    });
    expect(outcome).toEqual({
      success: true,
      sessionId: "sess_oauth_789",
    });
  });

  it("identifies missing sign-up requirements from OAuth result", () => {
    const outcome = evaluateOAuthResult({
      createdSessionId: null,
      signUp: {
        status: "missing_requirements",
        missingFields: ["username"],
      },
    });
    expect(outcome.success).toBe(false);
    expect(outcome.error).toContain("username");
  });

  it("identifies 2FA requirement from OAuth sign-in attempt", () => {
    const outcome = evaluateOAuthResult({
      createdSessionId: null,
      signIn: {
        status: "needs_second_factor",
      },
    });
    expect(outcome.success).toBe(false);
    expect(outcome.error).toMatch(/two-factor authentication/i);
  });

  it("returns fallback message when OAuth result has no session and no recognized error", () => {
    const outcome = evaluateOAuthResult({
      createdSessionId: null,
    });
    expect(outcome.success).toBe(false);
    expect(outcome.error).toMatch(/google sign-in could not be completed/i);
  });
});

describe("createDismissalGuard", () => {
  it("calls dismiss exactly once even when invoked multiple times", () => {
    const dismissMock = vi.fn();
    const guard = createDismissalGuard(dismissMock);

    expect(guard()).toBe(true);
    expect(guard()).toBe(false);
    expect(guard()).toBe(false);

    expect(dismissMock).toHaveBeenCalledTimes(1);
  });
});
