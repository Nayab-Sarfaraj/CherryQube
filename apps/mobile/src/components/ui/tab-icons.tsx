import Svg, { Circle, Path, Rect } from "react-native-svg";
import { mobileTheme } from "@/theme/theme";

type IconProps = {
  color?: string | null;
  size?: number;
  focused?: boolean;
};

export function HomeTabIcon({ color, size = 26, focused = false }: IconProps) {
  const strokeColor =
    color ?? (focused ? mobileTheme.colors.ink : mobileTheme.colors.quietInk);

  if (focused) {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={strokeColor}
        aria-hidden={true}
      >
        <Path d="M12 3L2 10.5V20a1 1 0 0 0 1 1h6v-6h6v6h6a1 1 0 0 0 1-1V10.5L12 3z" />
      </Svg>
    );
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={strokeColor}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      <Path d="M3 10L12 3.5L21 10V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V10z" />
    </Svg>
  );
}

export function CreationsTabIcon({
  color,
  size = 26,
  focused = false,
}: IconProps) {
  const strokeColor =
    color ?? (focused ? mobileTheme.colors.ink : mobileTheme.colors.quietInk);

  if (focused) {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={strokeColor}
        aria-hidden={true}
      >
        <Path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm6 4v8l6-4-6-4z" />
      </Svg>
    );
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={strokeColor}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      <Rect x={3} y={4} width={18} height={16} rx={2} />
      <Path d="M10 8.5L16 12L10 15.5V8.5Z" />
    </Svg>
  );
}

export function AccountTabIcon({
  color,
  size = 26,
  focused = false,
}: IconProps) {
  const strokeColor =
    color ?? (focused ? mobileTheme.colors.ink : mobileTheme.colors.quietInk);

  if (focused) {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={strokeColor}
        aria-hidden={true}
      >
        <Circle cx={12} cy={8} r={4.5} />
        <Path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8v1H4v-1z" />
      </Svg>
    );
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={strokeColor}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      <Circle cx={12} cy={8} r={4} />
      <Path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </Svg>
  );
}
