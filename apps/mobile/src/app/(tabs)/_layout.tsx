import { Tabs } from "expo-router";
import { mobileTheme } from "@/theme/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: mobileTheme.colors.accent,
        tabBarInactiveTintColor: mobileTheme.colors.ink,
        tabBarStyle: { backgroundColor: mobileTheme.colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="creations" options={{ title: "My creations" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
