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
import { View } from "react-native";
import { CLERK_PUBLISHABLE_KEY } from "@/lib/mobile-config";
import { useMobileAuth } from "@/hooks/use-mobile-auth";
import { mobileTheme } from "@/theme/theme";
import { clearCacheForUserChange } from "@/services/api/query-cache";

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

export default function RootLayout() {
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
