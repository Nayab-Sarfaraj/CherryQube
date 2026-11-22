import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
} from "@expo-google-fonts/figtree";
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CLERK_PUBLISHABLE_KEY, WEB_ORIGIN_ERROR } from "@/lib/mobile-config";
import { useMobileAuth } from "@/hooks/use-mobile-auth";
import { mobileTheme } from "@/theme/theme";
import { clearCacheForUserChange } from "@/services/api/query-cache";
import { FloralSprig } from "@/components/ui/floral-sprig";

WebBrowser.maybeCompleteAuthSession();

function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 15_000 },
          mutations: { retry: 0 },
        },
      }),
  );
  const { userId } = useMobileAuth();
  const previousUser = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    clearCacheForUserChange(client, previousUser.current, userId);
    previousUser.current = userId;
  }, [client, userId]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function Navigator() {
  const [loaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Fraunces_600SemiBold,
  });
  if (!loaded)
    return (
      <View
        style={{ flex: 1, backgroundColor: mobileTheme.colors.background }}
      />
    );
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="editor/[templateId]"
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="(modals)/sign-in"
        options={{ presentation: "modal" }}
      />
    </Stack>
  );
}

function OriginConfigurationError({ error }: { error: string }) {
  return (
    <SafeAreaView style={styles.errorContainer}>
      <View style={styles.errorCard}>
        <FloralSprig size={40} style={{ marginBottom: 12 }} />
        <Text style={styles.errorKicker}>Configuration Required</Text>
        <Text style={styles.errorTitle}>Invalid Web Origin</Text>
        <Text style={styles.errorDescription}>{error}</Text>
        <View style={styles.errorHelpBox}>
          <Text style={styles.errorHelpTitle}>
            How to fix for physical device testing:
          </Text>
          <Text style={styles.errorHelpStep}>
            1. Find your computer’s local network IP (e.g. 192.168.1.50)
          </Text>
          <Text style={styles.errorHelpStep}>
            2. In apps/mobile/.env.local, set:
          </Text>
          <Text style={styles.errorHelpCode}>
            EXPO_PUBLIC_WEB_ORIGIN=http://192.168.1.50:3000
          </Text>
          <Text style={styles.errorHelpStep}>
            Or point to your deployed HTTPS Vercel URL.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  if (WEB_ORIGIN_ERROR) {
    return <OriginConfigurationError error={WEB_ORIGIN_ERROR} />;
  }

  if (!CLERK_PUBLISHABLE_KEY)
    return (
      <QueryProvider>
        <Navigator />
      </QueryProvider>
    );
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <QueryProvider>
        <Navigator />
      </QueryProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorCard: {
    backgroundColor: mobileTheme.colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border + "44",
    alignItems: "center",
    width: "100%",
    maxWidth: 440,
  },
  errorKicker: {
    color: mobileTheme.colors.accent,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  errorTitle: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 22,
    marginBottom: 12,
    textAlign: "center",
  },
  errorDescription: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },
  errorHelpBox: {
    backgroundColor: mobileTheme.colors.background,
    borderRadius: 8,
    padding: 14,
    width: "100%",
    borderWidth: 1,
    borderColor: mobileTheme.colors.border + "33",
  },
  errorHelpTitle: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 13,
    color: mobileTheme.colors.ink,
    marginBottom: 6,
  },
  errorHelpStep: {
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    color: mobileTheme.colors.muted,
    lineHeight: 18,
    marginBottom: 4,
  },
  errorHelpCode: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 12,
    color: mobileTheme.colors.accent,
    backgroundColor: mobileTheme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginVertical: 4,
    textAlign: "center",
  },
});
