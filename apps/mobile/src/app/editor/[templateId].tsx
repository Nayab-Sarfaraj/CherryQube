import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { Alert, BackHandler, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GreetingWebView } from "@/components/greeting-webview";
import { initialMobileAuthState, mobileAuthReducer } from "@/features/auth/mobile-auth-state";
import { useMobileAuth } from "@/hooks/use-mobile-auth";
import { CLERK_PUBLISHABLE_KEY } from "@/lib/mobile-config";
import { mobileTheme } from "@/theme/theme";

export default function EditorRoute() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn, signOut } = useMobileAuth();
  const [auth, dispatch] = useReducer(mobileAuthReducer, initialMobileAuthState);
  const dirty = useRef(false);
  const allowingExit = useRef(false);

  useEffect(() => {
    if (!isLoaded) dispatch({ type: "NATIVE_LOADING" });
    else dispatch({ type: isSignedIn ? "HANDOFF_READY" : "SIGNED_OUT" });
  }, [isLoaded, isSignedIn]);
  useEffect(() => {
    if (isSignedIn && auth.status === "signing-in") dispatch({ type: "NATIVE_SIGNED_IN" });
  }, [auth.status, isSignedIn]);

  const leave = useCallback(() => {
    if (!dirty.current) {
      allowingExit.current = true;
      router.back();
      return;
    }
    Alert.alert("Discard unsaved changes?", "Your text edits will stay as a local draft, but the photo is only held in memory and will be lost if this editor reloads.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => { allowingExit.current = true; router.back(); } },
    ]);
  }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      leave();
      return true;
    });
    return () => subscription.remove();
  }, [leave]);

  const requestSignIn = useCallback(() => {
    if (!CLERK_PUBLISHABLE_KEY) return;
    if (isSignedIn) { dispatch({ type: "NATIVE_SIGNED_IN" }); return; }
    dispatch({ type: "REQUEST_SIGN_IN" });
    router.push("/(modals)/sign-in");
  }, [isSignedIn]);
  const finishSignOut = useCallback(async () => {
    await signOut();
    queryClient.clear();
    dispatch({ type: "SIGNED_OUT" });
  }, [queryClient, signOut]);
  const exported = useCallback((invitationId: string, renderId: string) => {
    dirty.current = false;
    router.replace({ pathname: "/creation/[id]", params: { id: invitationId, renderId } });
  }, []);

  return <SafeAreaView edges={["top", "bottom"]} style={styles.screen}><GreetingWebView auth={auth} onAuthAction={dispatch} onRequestSignIn={requestSignIn} onSilentRetryExhausted={requestSignIn} onSignOut={() => void finishSignOut()} onExportRequested={exported} onCloseEditor={leave} onDirtyChanged={(value) => { dirty.current = value; }} path={`/create/${templateId}`} sessionKey={0} /></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: mobileTheme.colors.background } });
