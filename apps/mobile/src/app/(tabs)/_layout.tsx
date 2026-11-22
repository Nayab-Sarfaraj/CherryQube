import { Tabs } from "expo-router";
import {
  AccountTabIcon,
  CreationsTabIcon,
  HomeTabIcon,
} from "@/components/ui/tab-icons";
import { mobileTheme } from "@/theme/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: mobileTheme.colors.accent,
        tabBarInactiveTintColor: mobileTheme.colors.muted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: "Figtree_600SemiBold",
          fontSize: 11,
          marginBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: mobileTheme.colors.surface,
          borderTopColor: mobileTheme.colors.border + "33",
          borderTopWidth: 1,
          height: 60,
          paddingTop: 6,
          paddingBottom: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <HomeTabIcon color={String(color)} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="creations"
        options={{
          title: "My creations",
          tabBarIcon: ({ color }) => (
            <CreationsTabIcon color={String(color)} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => (
            <AccountTabIcon color={String(color)} size={22} />
          ),
        }}
      />
    </Tabs>
  );
}
