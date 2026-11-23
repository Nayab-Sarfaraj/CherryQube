import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { mobileTheme } from "@/theme/theme";

export type PillBadgeVariant =
  "default" | "draft" | "rendering" | "ready" | "failed" | "accent" | "sage";

type PillBadgeProps = ViewProps & {
  label: string;
  variant?: PillBadgeVariant;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function PillBadge({
  label,
  variant = "default",
  size = "sm",
  style,
  textStyle,
  ...props
}: PillBadgeProps) {
  return (
    <View
      style={[styles.badge, styles[variant], styles[size], style]}
      {...props}
    >
      <Text
        style={[
          styles.text,
          styles[`${variant}Text` as keyof typeof styles],
          size === "md" && styles.textMd,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    borderRadius: mobileTheme.radius.badge,
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sm: {
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  md: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  default: {
    backgroundColor: mobileTheme.colors.surfaceMuted,
  },
  draft: {
    backgroundColor: mobileTheme.colors.status.draftBg,
  },
  rendering: {
    backgroundColor: mobileTheme.colors.status.renderingBg,
  },
  ready: {
    backgroundColor: mobileTheme.colors.status.readyBg,
  },
  failed: {
    backgroundColor: mobileTheme.colors.status.failedBg,
  },
  accent: {
    backgroundColor: mobileTheme.colors.accent + "1A",
  },
  sage: {
    backgroundColor: mobileTheme.colors.quietInk + "20",
  },
  text: {
    fontFamily: "Figtree_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  textMd: {
    fontSize: 13,
  },
  defaultText: {
    color: mobileTheme.colors.ink,
  },
  draftText: {
    color: mobileTheme.colors.status.draftText,
  },
  renderingText: {
    color: mobileTheme.colors.status.renderingText,
  },
  readyText: {
    color: mobileTheme.colors.status.readyText,
  },
  failedText: {
    color: mobileTheme.colors.status.failedText,
  },
  accentText: {
    color: mobileTheme.colors.accent,
  },
  sageText: {
    color: mobileTheme.colors.quietInk,
  },
});
