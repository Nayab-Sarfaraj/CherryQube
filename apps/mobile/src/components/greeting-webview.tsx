import type {
  MobileAuthAction,
  MobileAuthState,
} from "@/features/auth/mobile-auth-state";
import { useMobileAuth } from "@/hooks/use-mobile-auth";
import {
  CLERK_FRONTEND_ORIGIN,
  hostedUrl,
  WEB_ORIGIN,
} from "@/lib/mobile-config";
import { shareCreation } from "@/lib/native-share";
import { pickAndUploadPhoto } from "@/lib/photo-upload";
import { mobileTheme } from "@/theme/theme";
import {
  CRYPTO_SUBTLE_POLYFILL_SCRIPT,
  parseWebToNativeBridgeMessage,
  type NativeToWebBridgeMessage,
} from "@greetings/shared";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type RefAttributes,
} from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import WebView, {
  type WebViewMessageEvent,
  type WebViewNavigation,
  type WebViewProps,
} from "react-native-webview";

// react-native-webview exposes an overloaded generic component under Expo's
// React type setup; this narrows it to its documented prop surface.
const NativeWebView = WebView as unknown as ComponentType<
  WebViewProps & RefAttributes<WebView>
>;

function isAllowed(url: string) {
  try {
    return new URL(url).origin === WEB_ORIGIN;
  } catch {
    return false;
  }
}

function isClerkHandshake(url: string) {
  if (!CLERK_FRONTEND_ORIGIN) return false;

  try {
    const parsed = new URL(url);
    return (
      parsed.origin === CLERK_FRONTEND_ORIGIN &&
      parsed.pathname === "/v1/client/handshake"
    );
  } catch {
    return false;
  }
}

type Props = {
  auth: MobileAuthState;
  onAuthAction: (action: MobileAuthAction) => void;
  onRequestSignIn: () => void;
  onSilentRetryExhausted: () => void;
  onSignOut: () => void;
  onExportRequested?: (invitationId: string, renderId: string) => void;
  onCloseEditor?: () => void;
  onDirtyChanged?: (dirty: boolean) => void;
  sessionKey: number;
  path?: string;
};

export function GreetingWebView({
  auth,
  onAuthAction,
  onRequestSignIn,
  onSilentRetryExhausted,
  onSignOut,
  onExportRequested,
  onCloseEditor,
  onDirtyChanged,
  path = "/",
  sessionKey,
}: Props) {
  const webViewRef = useRef<WebView>(null);
  const currentUrlRef = useRef(hostedUrl(path));
  const { getToken, isSignedIn } = useMobileAuth();
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState<string | null>(null);
  const [handoffDestination, setHandoffDestination] = useState<{
    returnPath: string;
    destination: string;
  } | null>(null);
  const destinationPath =
    handoffDestination?.returnPath === path
      ? handoffDestination.destination
      : path;
  const source = useMemo(() => {
    if (!ticket) return { uri: hostedUrl(destinationPath) };
    const params = new URLSearchParams({ ticket, returnTo: path });
    return { uri: hostedUrl(`/mobile-auth?${params.toString()}`) };
  }, [destinationPath, path, ticket]);
  const send = useCallback((message: NativeToWebBridgeMessage) => {
    webViewRef.current?.postMessage(JSON.stringify(message));
  }, []);
  const pickPhoto = useCallback(async () => {
    try {
      const url = await pickAndUploadPhoto(getToken);
      if (url) send({ type: "PHOTO_PICKED", url });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not add that photo.",
      );
    }
  }, [getToken, send]);

  useEffect(() => {
    if (auth.status !== "handoff-pending" || !isSignedIn) return;
    let active = true;
    void (async () => {
      try {
        let token: string | null = null;
        for (const delayMs of [0, 500, 1_000]) {
          if (delayMs)
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          token = await getToken();
          if (token) break;
        }
        if (!token) throw new Error("No active mobile session");
        const response = await fetch(`${WEB_ORIGIN}/api/mobile/auth-ticket`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = (await response.json()) as { ticket?: string };
        if (!response.ok || !body.ticket) throw new Error("Ticket unavailable");
        if (active) setTicket(body.ticket);
      } catch {
        if (active)
          onAuthAction({
            type: "HANDOFF_FAILED",
            message:
              "Could not connect your mobile account. Check your connection and retry.",
          });
      }
    })();
    return () => {
      active = false;
    };
  }, [auth.status, getToken, isSignedIn, onAuthAction]);

  function handleNavigation(request: WebViewNavigation) {
    if (isAllowed(request.url) || isClerkHandshake(request.url)) return true;
    if (/^(mailto:|sms:|https:\/\/wa\.me\/)/i.test(request.url)) {
      void Linking.openURL(request.url).catch(() =>
        setError("This link could not be opened."),
      );
    }
    return false;
  }

  function handleMessage(event: WebViewMessageEvent) {
    const reportedUrl = event.nativeEvent.url;
    if (
      !reportedUrl ||
      !isAllowed(reportedUrl) ||
      !isAllowed(currentUrlRef.current)
    )
      return;
    try {
      const parsed = parseWebToNativeBridgeMessage(
        JSON.parse(event.nativeEvent.data),
      );
      if (!parsed.success) return;
      if (parsed.data.type === "PHOTO_PICKED") void pickPhoto();
      if (parsed.data.type === "REQUEST_SHARE")
        void shareCreation(parsed.data.fileUrl, parsed.data.linkUrl).catch(() =>
          setError("The video could not be shared."),
        );
      if (parsed.data.type === "REQUEST_PAYWALL")
        setError("In-app purchases will be available in the next app update.");
      if (parsed.data.type === "REQUEST_AUTH") onRequestSignIn();
      if (parsed.data.type === "AUTH_HANDOFF_COMPLETE") {
        onAuthAction({ type: "HANDOFF_READY" });
      }
      if (parsed.data.type === "REQUEST_SIGN_OUT") onSignOut();
      if (parsed.data.type === "EXPORT_REQUESTED")
        onExportRequested?.(parsed.data.invitationId, parsed.data.renderId);
      if (parsed.data.type === "CLOSE_EDITOR") onCloseEditor?.();
      if (parsed.data.type === "EDITOR_DIRTY_CHANGED")
        onDirtyChanged?.(parsed.data.dirty);
      if (parsed.data.type === "AUTH_EXPIRED") {
        setTicket(null);
        if (!isSignedIn) onAuthAction({ type: "SIGNED_OUT" });
        else if (auth.silentRetries < 2) onAuthAction({ type: "AUTH_EXPIRED" });
        else onSilentRetryExhausted();
      }
    } catch {
      // Malformed and unknown messages are ignored deliberately.
    }
  }

  return (
    <View style={styles.container}>
      <NativeWebView
        key={sessionKey}
        ref={webViewRef}
        source={source}
        originWhitelist={[
          WEB_ORIGIN,
          ...(CLERK_FRONTEND_ORIGIN ? [CLERK_FRONTEND_ORIGIN] : []),
        ]}
        injectedJavaScriptBeforeContentLoaded={CRYPTO_SUBTLE_POLYFILL_SCRIPT}
        onShouldStartLoadWithRequest={handleNavigation}
        onNavigationStateChange={(state: WebViewNavigation) => {
          currentUrlRef.current = state.url;
          if (!isAllowed(state.url)) return;
          try {
            if (new URL(state.url).searchParams.get("nativeSession") === "1") {
              const destination = new URL(state.url);
              setHandoffDestination({
                returnPath: path,
                destination: `${destination.pathname}${destination.search}${destination.hash}`,
              });
              setTicket(null);
              onAuthAction({ type: "HANDOFF_READY" });
            }
          } catch {
            // Ignore malformed WebView URLs.
          }
        }}
        onMessage={handleMessage}
        onError={() =>
          setError(
            "The editor could not load. Check your connection and try again.",
          )
        }
        onHttpError={() =>
          setError("The editor is temporarily unavailable. Try again shortly.")
        }
        androidLayerType="hardware"
        allowsInlineMediaPlayback
        cacheEnabled={false}
        domStorageEnabled
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        startInLoadingState
        style={styles.webView}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={mobileTheme.colors.border} />
            <Text style={styles.loadingText}>
              Loading your greeting studio…
            </Text>
          </View>
        )}
      />
      {error && (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setError("");
              webViewRef.current?.reload();
            }}
          >
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      )}
      {auth.status === "signed-out" && (
        <View style={styles.signedOut}>
          <Text style={styles.signedOutText}>
            Sign in to save, export, and add photos.
          </Text>
          <Pressable accessibilityRole="button" onPress={onRequestSignIn}>
            <Text style={styles.signIn}>Sign in</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: mobileTheme.colors.background },
  webView: { backgroundColor: mobileTheme.colors.background },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: mobileTheme.colors.background,
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: mobileTheme.colors.ink, fontSize: 15 },
  error: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: 12,
    backgroundColor: mobileTheme.colors.ink,
    padding: 16,
  },
  errorText: { color: mobileTheme.colors.surface, fontSize: 14 },
  retry: {
    color: mobileTheme.colors.palette.marigold,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  signedOut: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 12,
    borderRadius: mobileTheme.radius.pill,
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...mobileTheme.shadows.floating,
  },
  signedOutText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_500Medium",
    fontSize: 13,
    flex: 1,
  },
  signIn: {
    color: mobileTheme.colors.accent,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 14,
    paddingLeft: 8,
  },
});
