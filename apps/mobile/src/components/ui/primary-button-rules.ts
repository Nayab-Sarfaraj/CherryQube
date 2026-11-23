export function resolveButtonAccessibilityLabel(
  label: string,
  callerAccessibilityLabel?: string,
): string {
  return callerAccessibilityLabel ?? label;
}
