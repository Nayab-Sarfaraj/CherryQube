import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { mobileTheme } from "@/theme/theme";

type CardProps = ViewProps & {
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({ elevated, style, children, ...props }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated ? mobileTheme.shadows.cardElevated : mobileTheme.shadows.card,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.hairline,
    borderRadius: mobileTheme.radius.card,
    borderWidth: 1,
    overflow: "hidden",
  },
});
