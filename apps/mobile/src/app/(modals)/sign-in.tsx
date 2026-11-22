import { AuthView } from "@clerk/expo/native-components";
import { router } from "expo-router";
import { View } from "react-native";
import { CLERK_PUBLISHABLE_KEY } from "@/lib/mobile-config";
import { mobileTheme } from "@/theme/theme";

export default function SignInModal() {
  if (!CLERK_PUBLISHABLE_KEY)
    return (
      <View
        style={{ flex: 1, backgroundColor: mobileTheme.colors.background }}
      />
    );
  return <AuthView onDismiss={() => router.back()} />;
}
