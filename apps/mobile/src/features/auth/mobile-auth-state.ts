export type MobileAuthStatus =
  | "loading"
  | "signed-out"
  | "signing-in"
  | "handoff-pending"
  | "ready"
  | "error";

export type MobileAuthState = {
  status: MobileAuthStatus;
  error: string | null;
  silentRetries: number;
  handoffAttempt: number;
};

export type MobileAuthAction =
  | { type: "NATIVE_LOADING" }
  | { type: "NATIVE_SESSION_AVAILABLE" }
  | { type: "SIGNED_OUT" }
  | { type: "REQUEST_SIGN_IN" }
  | { type: "NATIVE_SIGNED_IN" }
  | { type: "HANDOFF_READY" }
  | { type: "HANDOFF_FAILED"; message: string }
  | { type: "AUTH_EXPIRED" }
  | { type: "RESET_SILENT_RETRIES" };

export const initialMobileAuthState: MobileAuthState = {
  status: "loading",
  error: null,
  silentRetries: 0,
  handoffAttempt: 0,
};

export function actionForWebAuthStatus(
  state: MobileAuthState,
  nativeUserId: string | null,
  webUserId: string | null,
  awaitingEditorVerification: boolean,
): MobileAuthAction | null {
  if (nativeUserId && webUserId === nativeUserId)
    return { type: "HANDOFF_READY" };
  if (state.status === "signing-in" || state.status === "error") return null;
  if (state.status === "handoff-pending" && !awaitingEditorVerification)
    return null;
  if (!nativeUserId) return { type: "SIGNED_OUT" };
  if (state.silentRetries < 2) return { type: "AUTH_EXPIRED" };
  return {
    type: "HANDOFF_FAILED",
    message: "Could not sync your account. Try again.",
  };
}

export function mobileAuthReducer(
  state: MobileAuthState,
  action: MobileAuthAction,
): MobileAuthState {
  switch (action.type) {
    case "NATIVE_LOADING":
      return initialMobileAuthState;
    case "NATIVE_SESSION_AVAILABLE":
      return state.status === "loading"
        ? { ...state, status: "ready", error: null, silentRetries: 0 }
        : state;
    case "SIGNED_OUT":
      return {
        ...state,
        status: "signed-out",
        error: null,
        silentRetries: 0,
      };
    case "REQUEST_SIGN_IN":
      return { ...state, status: "signing-in", error: null };
    case "NATIVE_SIGNED_IN":
      return {
        ...state,
        status: "handoff-pending",
        error: null,
        silentRetries: 0,
        handoffAttempt: state.handoffAttempt + 1,
      };
    case "AUTH_EXPIRED":
      return {
        ...state,
        status: "handoff-pending",
        error: null,
        silentRetries: state.silentRetries + 1,
        handoffAttempt: state.handoffAttempt + 1,
      };
    case "HANDOFF_READY":
      return { ...state, status: "ready", error: null, silentRetries: 0 };
    case "HANDOFF_FAILED":
      return { ...state, status: "error", error: action.message };
    case "RESET_SILENT_RETRIES":
      return { ...state, silentRetries: 0 };
  }
}
