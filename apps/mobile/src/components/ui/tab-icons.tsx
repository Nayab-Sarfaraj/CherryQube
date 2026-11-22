import Svg, { Path, Circle } from "react-native-svg";
import { mobileTheme } from "@/theme/theme";

type IconProps = {
  color?: string | null;
  size?: number;
};

export function HomeTabIcon({ color, size = 24 }: IconProps) {
  const strokeColor = color ?? mobileTheme.colors.ink;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={strokeColor}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z" />
    </Svg>
  );
}

export function CreationsTabIcon({ color, size = 24 }: IconProps) {
  const strokeColor = color ?? mobileTheme.colors.ink;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={strokeColor}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      <Path d="M15 10l5-3v10l-5-3v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4z" />
    </Svg>
  );
}

export function AccountTabIcon({ color, size = 24 }: IconProps) {
  const strokeColor = color ?? mobileTheme.colors.ink;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={strokeColor}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Svg>
  );
}
