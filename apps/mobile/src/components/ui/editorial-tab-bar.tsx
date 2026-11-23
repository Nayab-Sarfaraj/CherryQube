import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AccountTabIcon,
  CreationsTabIcon,
  HomeTabIcon,
} from "@/components/ui/tab-icons";
import { mobileTheme } from "@/theme/theme";

const tabContent = {
  index: { label: "Create", Icon: HomeTabIcon },
  creations: { label: "Library", Icon: CreationsTabIcon },
  account: { label: "Account", Icon: AccountTabIcon },
} as const;

type EditorialTabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigateToTab: (routeKey: string) => void;
};

export function EditorialTabBar({
  state,
  navigateToTab,
}: EditorialTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}
      accessibilityRole="tablist"
    >
      {state.routes.map((route, index) => {
        const content = tabContent[route.name as keyof typeof tabContent];
        if (!content) return null;
        const focused = state.index === index;
        const { Icon } = content;
        const onPress = () => navigateToTab(route.key);

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={content.label}
            onPress={onPress}
            style={({ pressed }) => [
              styles.item,
              pressed && styles.itemPressed,
            ]}
          >
            <Icon
              color={
                focused ? mobileTheme.colors.ink : mobileTheme.colors.quietInk
              }
              focused={focused}
              size={26}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.canvas,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 32,
    paddingTop: 12,
  },
  item: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 48,
  },
  itemPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
});
