import { AuthView } from "@clerk/expo/native-components";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { FloralSprig } from "@/components/ui/floral-sprig";
import { CLERK_PUBLISHABLE_KEY } from "@/lib/mobile-config";
import { mobileTheme } from "@/theme/theme";

function CherryQubeMark() {
  return (
    <View style={styles.brand} accessibilityLabel="CherryQube">
      <FloralSprig size={30} />
      <Text style={styles.brandName}>CherryQube</Text>
    </View>
  );
}

export default function SignInModal() {
  if (!CLERK_PUBLISHABLE_KEY)
    return (
      <View
        style={{ flex: 1, backgroundColor: mobileTheme.colors.background }}
      />
    );
  return (
    <View style={styles.screen}>
      <AuthView
        logo={<CherryQubeMark />}
        onDismiss={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: mobileTheme.colors.background },
  brand: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  brandName: {
    color: mobileTheme.colors.ink,
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 24,
  },
});
