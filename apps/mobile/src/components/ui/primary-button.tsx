import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { mobileTheme } from "@/theme/theme";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type Props = Omit<PressableProps, "style"> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
};

export function PrimaryButton({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  style,
  icon,
  ...props
}: Props) {
  const isOutline = variant === "outline";
  const isSecondary = variant === "secondary";
  const isGhost = variant === "ghost";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        styles[size],
        mobileTheme.shadows.pill,
        isGhost && styles.noShadow,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            isOutline || isSecondary || isGhost
              ? mobileTheme.colors.ink
              : mobileTheme.colors.surface
          }
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.label,
              isOutline && styles.outlineLabel,
              isSecondary && styles.secondaryLabel,
              isGhost && styles.ghostLabel,
              size === "sm" && styles.smLabel,
              size === "lg" && styles.lgLabel,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: mobileTheme.radius.pill,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  primary: {
    backgroundColor: mobileTheme.colors.accent,
  },
  secondary: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderWidth: 1,
  },
  outline: {
    backgroundColor: "transparent",
    borderColor: mobileTheme.colors.ink,
    borderWidth: 1.2,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  sm: {
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  md: {
    minHeight: 48,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  lg: {
    minHeight: 54,
    paddingHorizontal: 28,
    paddingVertical: 15,
  },
  label: {
    color: mobileTheme.colors.surface,
    fontFamily: "Figtree_600SemiBold",
    fontSize: 15,
    textAlign: "center",
  },
  secondaryLabel: {
    color: mobileTheme.colors.ink,
  },
  outlineLabel: {
    color: mobileTheme.colors.ink,
  },
  ghostLabel: {
    color: mobileTheme.colors.quietInk,
  },
  smLabel: {
    fontSize: 13,
  },
  lgLabel: {
    fontSize: 17,
  },
  noShadow: {
    elevation: 0,
    shadowOpacity: 0,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
});
