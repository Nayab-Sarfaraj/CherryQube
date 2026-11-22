import { AuthView } from "@clerk/expo/native-components";
import { useCallback, useEffect, useReducer, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GreetingWebView } from "@/components/greeting-webview";
import {
  initialMobileAuthState,
  mobileAuthReducer,
} from "@/features/auth/mobile-auth-state";
import { useMobileAuth } from "@/hooks/use-mobile-auth";
import { CLERK_PUBLISHABLE_KEY, WEB_ORIGIN } from "@/lib/mobile-config";

function AuthFailure({
  message,
  onRetry,
  onSignOut,
}: {
  message: string;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <View style={styles.failure} accessibilityLiveRegion="polite">
      <Text style={styles.failureTitle}>We couldn’t finish signing you in</Text>
      <Text style={styles.failureCopy}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Retry</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onSignOut}>
        <Text style={styles.secondary}>Sign out</Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const { isLoaded, isSignedIn, getToken, signOut } = useMobileAuth();
  const [auth, dispatch] = useReducer(
    mobileAuthReducer,
    initialMobileAuthState,
  );
  const [authOpen, setAuthOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      dispatch({ type: "NATIVE_LOADING" });
      return;
    }
    dispatch({ type: isSignedIn ? "NATIVE_SIGNED_IN" : "SIGNED_OUT" });
  }, [isLoaded, isSignedIn]);

  const requestSignIn = useCallback(() => {
    if (!CLERK_PUBLISHABLE_KEY) return;
    if (isSignedIn) {
      dispatch({ type: "NATIVE_SIGNED_IN" });
      return;
    }
    dispatch({ type: "REQUEST_SIGN_IN" });
    setAuthOpen(true);
  }, [isSignedIn]);

  const finishSignOut = useCallback(async () => {
    setAccountOpen(false);
    setAuthOpen(false);
    try {
      await signOut();
    } finally {
      dispatch({ type: "SIGNED_OUT" });
      setSessionKey((current) => current + 1);
    }
  }, [signOut]);

  const restartInteractiveSignIn = useCallback(() => {
    void (async () => {
      await finishSignOut();
      if (!CLERK_PUBLISHABLE_KEY) return;
      dispatch({ type: "REQUEST_SIGN_IN" });
      setAuthOpen(true);
    })();
  }, [finishSignOut]);

  const deleteAccount = useCallback(() => {
    Alert.alert(
      "Delete your CherryQube account?",
      "This permanently deletes your creations, guests, renders, and stored photos. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                const token = await getToken();
                const response = await fetch(`${WEB_ORIGIN}/api/account`, {
                  method: "DELETE",
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!response.ok) throw new Error("Could not delete account");
                await finishSignOut();
              } catch {
                Alert.alert(
                  "Account deletion failed",
                  "Please check your connection and try again. You can also contact support for help.",
                );
              }
            })();
          },
        },
      ],
    );
  }, [finishSignOut, getToken]);

  if (!isLoaded)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#7A2430" />
      </View>
    );

  return (
    <View style={styles.container}>
      <GreetingWebView
        auth={auth}
        onAuthAction={dispatch}
        onRequestSignIn={requestSignIn}
        onSilentRetryExhausted={restartInteractiveSignIn}
        onSignOut={() => void finishSignOut()}
        sessionKey={sessionKey}
      />
      {isSignedIn && auth.status === "ready" && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account options"
          onPress={() => setAccountOpen(true)}
          style={styles.accountButton}
        >
          <Text style={styles.accountButtonText}>Account</Text>
        </Pressable>
      )}
      {auth.status === "error" && auth.error && (
        <AuthFailure
          message={auth.error}
          onRetry={() => dispatch({ type: "NATIVE_SIGNED_IN" })}
          onSignOut={() => void finishSignOut()}
        />
      )}
      {CLERK_PUBLISHABLE_KEY && (
        <Modal
          visible={authOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setAuthOpen(false)}
        >
          <AuthView
            onDismiss={() => {
              setAuthOpen(false);
              if (!isSignedIn) dispatch({ type: "SIGNED_OUT" });
            }}
          />
        </Modal>
      )}
      <Modal
        visible={accountOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountOpen(false)}
      >
        <View style={styles.accountSheet}>
          <View style={styles.accountCard}>
            <Text style={styles.accountTitle}>Account</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void finishSignOut()}
            >
              <Text style={styles.accountAction}>Sign out</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={deleteAccount}>
              <Text style={styles.deleteAction}>Delete account</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setAccountOpen(false)}
            >
              <Text style={styles.secondary}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8E8" },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8E8",
  },
  accountButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    borderRadius: 999,
    backgroundColor: "#173E31",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  accountButtonText: { color: "#FFF8E8", fontWeight: "700" },
  failure: {
    position: "absolute",
    inset: 24,
    alignSelf: "stretch",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#FFF8E8",
    padding: 24,
  },
  failureTitle: { color: "#173E31", fontSize: 24, fontWeight: "700" },
  failureCopy: {
    color: "#35584A",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  button: {
    alignItems: "center",
    backgroundColor: "#7A2430",
    borderRadius: 999,
    marginTop: 24,
    minHeight: 48,
    justifyContent: "center",
  },
  buttonText: { color: "#FFF8E8", fontSize: 16, fontWeight: "700" },
  secondary: {
    color: "#35584A",
    fontSize: 15,
    marginTop: 18,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  accountSheet: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
  },
  accountCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#FFF8E8",
    padding: 24,
  },
  accountTitle: { color: "#173E31", fontSize: 24, fontWeight: "700" },
  accountAction: {
    color: "#173E31",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 24,
  },
  deleteAction: {
    color: "#9D1F2E",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 22,
  },
});
