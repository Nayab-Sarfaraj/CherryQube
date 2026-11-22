import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { mobileTheme } from "@/theme/theme";

type Props = Omit<PressableProps, "style"> & { label: string };

export function PrimaryButton({ label, ...props }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      {...props}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: mobileTheme.colors.accent,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 20,
  },
  label: { color: mobileTheme.colors.surface, fontFamily: "Figtree_600SemiBold", fontSize: 16 },
  pressed: { opacity: 0.82 },
});
