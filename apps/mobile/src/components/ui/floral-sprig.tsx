import Svg, { Circle, Path } from "react-native-svg";
import type { StyleProp, ViewStyle } from "react-native";
import { mobileTheme } from "@/theme/theme";

type FloralSprigProps = {
  size?: number;
  color?: string;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function FloralSprig({
  size = 40,
  color = mobileTheme.colors.border,
  accentColor = mobileTheme.colors.accent,
  style,
}: FloralSprigProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      style={style}
      aria-hidden={true}
    >
      {/* Central botanical stem */}
      <Path
        d="M10 40C16 32 24 20 38 10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Left Leaf 1 */}
      <Path
        d="M18 30C16 24 20 22 24 25C22 29 20 31 18 30Z"
        fill={color}
        opacity={0.8}
      />
      {/* Right Leaf 2 */}
      <Path
        d="M26 21C30 17 33 20 31 24C28 25 26 23 26 21Z"
        fill={color}
        opacity={0.8}
      />
      {/* Top Leaf 3 */}
      <Path
        d="M32 14C35 9 40 10 39 15C36 17 33 16 32 14Z"
        fill={color}
        opacity={0.8}
      />
      {/* Botanical Berries */}
      <Circle cx="21" cy="22" r="2.5" fill={accentColor} />
      <Circle cx="29" cy="16" r="2.5" fill={accentColor} />
      <Circle cx="37" cy="9" r="2" fill={accentColor} />
    </Svg>
  );
}
