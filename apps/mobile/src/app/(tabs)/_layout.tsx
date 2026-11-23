import { Tabs } from "expo-router";
import {
  AccountTabIcon,
  CreationsTabIcon,
  HomeTabIcon,
} from "@/components/ui/tab-icons";
import { EditorialTabBar } from "@/components/ui/editorial-tab-bar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <EditorialTabBar {...props} />}
      screenOptions={{ headerShown: false }}
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
