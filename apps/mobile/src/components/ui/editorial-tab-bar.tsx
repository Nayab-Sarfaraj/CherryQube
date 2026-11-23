import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AccountTabIcon,
  CreationsTabIcon,
  HomeTabIcon,
} from "@/components/ui/tab-icons";
import { mobileTheme } from "@/theme/theme";
import {
  triggerTabPress,
  type TabBarNavigation,
} from "./editorial-tab-bar-rules";

export type { TabBarNavigation };

const tabContent = {
  index: { label: "Create", Icon: HomeTabIcon },
  creations: { label: "Library", Icon: CreationsTabIcon },
  account: { label: "Account", Icon: AccountTabIcon },
} as const;

export type EditorialTabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation?: TabBarNavigation;
  navigateToTab?: (routeKey: string) => void;
  descriptors?: Record<string, unknown>;
  insets?: { top?: number; right?: number; bottom?: number; left?: number };
};

export function EditorialTabBar({
  state,
  navigation,
  navigateToTab,
}: EditorialTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 14);

  return (
    <View
      style={[styles.bar, { paddingBottom: bottomPadding }]}
      accessibilityRole="tablist"
    >
      {state.routes.map((route, index) => {
        const content = tabContent[route.name as keyof typeof tabContent];
        if (!content) return null;
        const focused = state.index === index;
        const { Icon } = content;
        const onPress = () =>
          triggerTabPress({
            route,
            focused,
            navigation,
            navigateToTab,
          });

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
    paddingHorizontal: 28,
    paddingTop: 10,
  },
  item: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  itemPressed: {
    opacity: 0.7,
  },
});
