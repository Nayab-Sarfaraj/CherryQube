import { Image, type ImageStyle } from "expo-image";
import type { StyleProp, ViewStyle } from "react-native";

type FloralSprigProps = {
  size?: number;
  color?: string;
  accentColor?: string;
  style?: StyleProp<ImageStyle | ViewStyle>;
};

export function FloralSprig({
  size = 40,
  style,
}: FloralSprigProps) {
  return (
    <Image
      source={require("../../../assets/images/brand-logo.png")}
      style={[
        {
          width: size,
          height: Math.round(size * 1.06),
        },
        style as StyleProp<ImageStyle>,
      ]}
      contentFit="contain"
      accessibilityLabel="CherryQube"
    />
  );
}

export const BrandLogo = FloralSprig;
