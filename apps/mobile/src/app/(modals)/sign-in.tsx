import { AuthView } from "@clerk/expo/native-components";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FloralSprig } from "@/components/ui/floral-sprig";
import { CLERK_PUBLISHABLE_KEY } from "@/lib/mobile-config";
import { mobileTheme } from "@/theme/theme";

function CherryQubeMark() {
  return (
    <View style={styles.wordmark}>
      <FloralSprig size={34} />
      <Text style={styles.wordmarkText}>CherryQube</Text>
    </View>
  );
}

export default function SignInModal() {
  const [showAuth, setShowAuth] = useState(false);
  if (!CLERK_PUBLISHABLE_KEY) return <View style={styles.blank} />;
  if (showAuth)
    return (
      <View style={styles.authScreen}>
        <AuthView logo={<CherryQubeMark />} onDismiss={() => router.back()} />
      </View>
    );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <View style={styles.mist} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close sign in"
        onPress={() => router.back()}
        style={styles.close}
      >
        <Text style={styles.closeText}>Close</Text>
      </Pressable>
      <View style={styles.content}>
        <FloralSprig
          size={88}
          color={mobileTheme.colors.quietInk}
          accentColor={mobileTheme.colors.palette.marigold}
        />
        <Text style={styles.brand}>CherryQube</Text>
        <Text style={styles.title}>Keep your celebrations close.</Text>
        <Text style={styles.copy}>
          Sign in to save your designs, manage guest links, and return to every
          celebration.
        </Text>
      </View>
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowAuth(true)}
          style={styles.continue}
        >
          <Text style={styles.continueText}>Continue to sign in</Text>
        </Pressable>
        <Text style={styles.footnote}>
          Your designs stay private to your account.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: mobileTheme.colors.canvas },
  screen: {
    backgroundColor: mobileTheme.colors.canvas,
    flex: 1,
    overflow: "hidden",
  },
  mist: {
    backgroundColor: mobileTheme.colors.palette.marigold + "40",
    borderRadius: 999,
    height: 360,
    position: "absolute",
    right: -120,
    top: -90,
    width: 360,
  },
  close: {
    alignSelf: "flex-end",
    minHeight: 48,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  closeText: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 14,
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  wordmark: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  wordmarkText: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 24,
  },
  brand: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 27,
    marginTop: 18,
  },
  title: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 34,
    lineHeight: 40,
    marginTop: 38,
    textAlign: "center",
  },
  copy: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
    textAlign: "center",
  },
  footer: { paddingHorizontal: 24, paddingBottom: 12 },
  continue: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.accent,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 24,
  },
  continueText: {
    color: mobileTheme.colors.surface,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 16,
  },
  footnote: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_400Regular",
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
  },
  authScreen: { backgroundColor: mobileTheme.colors.canvas, flex: 1 },
});
