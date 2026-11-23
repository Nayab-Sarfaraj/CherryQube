export type VerificationResult = {
  status?: string | null;
  createdSessionId?: string | null;
  missingFields?: string[] | null;
};

export type OAuthResult = {
  createdSessionId?: string | null;
  signUp?: {
    status?: string | null;
    missingFields?: string[] | null;
  } | null;
  signIn?: {
    status?: string | null;
  } | null;
};

export type EvaluationOutcome = {
  success: boolean;
  sessionId?: string;
  error?: string;
};

export function evaluateSignInResult(
  result: VerificationResult,
): EvaluationOutcome {
  if (result.status === "complete" && result.createdSessionId) {
    return { success: true, sessionId: result.createdSessionId };
  }
  if (result.status === "needs_second_factor") {
    return {
      success: false,
      error:
        "Two-factor authentication (2FA) is enabled for this account. Please sign in on the web to complete verification, or sign in with Google.",
    };
  }
  if (result.status === "needs_identifier") {
    return {
      success: false,
      error: "Please enter your email address to continue.",
    };
  }
  if (result.missingFields && result.missingFields.length > 0) {
    return {
      success: false,
      error: `Additional account details required (${result.missingFields.join(", ")}). Please complete sign-in on the web.`,
    };
  }
  return {
    success: false,
    error:
      "Verification was not completed. Please check your 6-digit code and try again.",
  };
}

export function evaluateSignUpResult(
  result: VerificationResult,
): EvaluationOutcome {
  if (result.status === "complete" && result.createdSessionId) {
    return { success: true, sessionId: result.createdSessionId };
  }
  if (result.status === "missing_requirements") {
    const missing = result.missingFields;
    return {
      success: false,
      error:
        missing && missing.length > 0
          ? `Additional registration details required (${missing.join(", ")}). Please complete account setup on the web.`
          : "Account setup requires additional information. Please complete sign-up on the web.",
    };
  }
  return {
    success: false,
    error:
      "Verification was not completed. Please check your 6-digit code and try again.",
  };
}

export function evaluateOAuthResult(result: OAuthResult): EvaluationOutcome {
  if (result.createdSessionId) {
    return { success: true, sessionId: result.createdSessionId };
  }
  if (result.signUp?.status === "missing_requirements") {
    const missing = result.signUp.missingFields;
    return {
      success: false,
      error:
        missing && missing.length > 0
          ? `Additional registration details required (${missing.join(", ")}). Please complete sign-in on the web.`
          : "Additional registration details are required. Please complete sign-in on the web.",
    };
  }
  if (result.signIn?.status === "needs_second_factor") {
    return {
      success: false,
      error:
        "Two-factor authentication is required for this account. Please sign in on the web.",
    };
  }
  return {
    success: false,
    error:
      "Google sign-in could not be completed. Please try again or use email sign-in.",
  };
}

export type DismissalGuard = {
  dismiss: () => boolean;
  markDismissed: () => void;
  isDismissed: () => boolean;
};

export function createDismissalGuard(dismiss: () => void): DismissalGuard {
  let dismissed = false;
  return {
    dismiss: () => {
      if (dismissed) return false;
      dismissed = true;
      dismiss();
      return true;
    },
    markDismissed: () => {
      dismissed = true;
    },
    isDismissed: () => dismissed,
  };
}
