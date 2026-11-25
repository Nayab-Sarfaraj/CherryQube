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
};

export function mobileAuthReducer(
  state: MobileAuthState,
  action: MobileAuthAction,
): MobileAuthState {
  switch (action.type) {
    case "NATIVE_LOADING":
      return initialMobileAuthState;
    case "NATIVE_SESSION_AVAILABLE":
      return { status: "ready", error: null, silentRetries: 0 };
    case "SIGNED_OUT":
      return { status: "signed-out", error: null, silentRetries: 0 };
    case "REQUEST_SIGN_IN":
      return { ...state, status: "signing-in", error: null };
    case "NATIVE_SIGNED_IN":
    case "AUTH_EXPIRED":
      return {
        status: "handoff-pending",
        error: null,
        silentRetries:
          action.type === "AUTH_EXPIRED"
            ? state.silentRetries + 1
            : state.silentRetries,
      };
    case "HANDOFF_READY":
      return { status: "ready", error: null, silentRetries: 0 };
    case "HANDOFF_FAILED":
      return { ...state, status: "error", error: action.message };
    case "RESET_SILENT_RETRIES":
      return { ...state, silentRetries: 0 };
  }
}
