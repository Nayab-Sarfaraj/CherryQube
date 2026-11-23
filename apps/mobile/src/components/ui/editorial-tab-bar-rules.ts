export type TabBarNavigation = {
  navigate: (name: string, params?: unknown) => void;
  emit?: (event: {
    type: string;
    target: string;
    canPreventDefault: boolean;
  }) => { defaultPrevented?: boolean };
};

export function triggerTabPress({
  route,
  focused,
  navigation,
  navigateToTab,
}: {
  route: { key: string; name: string };
  focused: boolean;
  navigation?: TabBarNavigation;
  navigateToTab?: (routeKey: string) => void;
}): boolean {
  const event = navigation?.emit?.({
    type: "tabPress",
    target: route.key,
    canPreventDefault: true,
  });

  if (!focused && !event?.defaultPrevented) {
    if (navigation?.navigate) {
      navigation.navigate(route.name);
      return true;
    }
    if (navigateToTab) {
      navigateToTab(route.key);
      return true;
    }
  }

  return false;
}
