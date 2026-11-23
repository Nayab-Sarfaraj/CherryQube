import { Pressable, StyleSheet, Text, View } from "react-native";
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
  return (
    <View style={styles.bar} accessibilityRole="tablist">
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
            style={styles.item}
          >
            <Icon
              color={
                focused ? mobileTheme.colors.ink : mobileTheme.colors.quietInk
              }
              size={20}
            />
            <Text style={[styles.label, focused && styles.labelActive]}>
              {content.label}
            </Text>
            <View style={[styles.marker, focused && styles.markerActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: "flex-start",
    backgroundColor: mobileTheme.colors.canvas,
    borderTopColor: mobileTheme.colors.hairline,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 68,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  item: { alignItems: "center", flex: 1, gap: 3, minHeight: 52 },
  label: {
    color: mobileTheme.colors.quietInk,
    fontFamily: "Figtree_500Medium",
    fontSize: 11,
  },
  labelActive: {
    color: mobileTheme.colors.ink,
    fontFamily: "Figtree_600SemiBold",
  },
  marker: {
    backgroundColor: "transparent",
    borderRadius: 99,
    height: 2,
    marginTop: 1,
    width: 16,
  },
  markerActive: { backgroundColor: mobileTheme.colors.accent },
});
