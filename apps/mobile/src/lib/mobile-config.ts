function getTargetOS(): string {
  if (typeof process !== "undefined" && process.env?.EXPO_OS) {
    return process.env.EXPO_OS;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Platform } = require("react-native");
    return Platform?.OS ?? "unknown";
  } catch {
    return "unknown";
  }
}

function checkIsPhysicalDevice(): boolean {
  if (
    typeof process !== "undefined" &&
    process.env?.EXPO_PUBLIC_PHYSICAL_DEVICE !== undefined
  ) {
    return process.env.EXPO_PUBLIC_PHYSICAL_DEVICE === "true";
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Device = require("expo-device");
    return typeof Device?.isDevice === "boolean" ? Device.isDevice : false;
  } catch {
    return false;
  }
}

export function isLoopbackOrigin(urlOrHost?: string | null): boolean {
  if (!urlOrHost) return false;
  const trimmed = urlOrHost.trim();
  try {
    const url = new URL(
      trimmed.includes("://") ? trimmed : `http://${trimmed}`,
    );
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".localhost")
    );
  } catch {
    return trimmed.includes("localhost") || trimmed.includes("127.0.0.1");
  }
}

export function resolveWebOrigin(
  origin?: string | null,
  os = getTargetOS(),
  isPhysicalDevice = checkIsPhysicalDevice(),
): string {
  const configured = origin?.trim();

  if (isPhysicalDevice) {
    if (!configured || isLoopbackOrigin(configured)) {
      throw new Error(
        `Invalid EXPO_PUBLIC_WEB_ORIGIN for physical device (${configured || "unset"}). Localhost points back to the device itself. For real-device testing, set EXPO_PUBLIC_WEB_ORIGIN to your Mac's LAN IP (e.g. http://192.168.x.x:3000) or your deployed HTTPS origin.`,
      );
    }
    return configured.replace(/\/$/, "");
  }

  if (!configured) {
    return os === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";
  }

  const clean = configured.replace(/\/$/, "");
  if (os === "android" && isLoopbackOrigin(clean)) {
    return clean.replace(/localhost|127\.0\.0\.1/, "10.0.2.2");
  }
  return clean;
}

export let WEB_ORIGIN_ERROR: string | null = null;
export let WEB_ORIGIN: string = "http://localhost:3000";

try {
  WEB_ORIGIN = resolveWebOrigin(process.env.EXPO_PUBLIC_WEB_ORIGIN);
} catch (err) {
  WEB_ORIGIN_ERROR =
    err instanceof Error ? err.message : "Invalid web origin configuration";
}

export const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || null;

export function getClerkFrontendOrigin(publishableKey: string | null) {
  if (!publishableKey) return null;

  try {
    const encodedFrontendApi = publishableKey.split("_")[2];
    if (!encodedFrontendApi) return null;

    const decoded = globalThis.atob(encodedFrontendApi);
    if (!decoded.endsWith("$") || decoded.slice(0, -1).includes("$")) {
      return null;
    }

    return new URL(`https://${decoded.slice(0, -1)}`).origin;
  } catch {
    return null;
  }
}

export const CLERK_FRONTEND_ORIGIN = getClerkFrontendOrigin(
  CLERK_PUBLISHABLE_KEY,
);

export function hostedUrl(path = "/") {
  const url = new URL(path, `${WEB_ORIGIN}/`);
  url.searchParams.set("embed", "1");
  return url.toString();
}

export function buildEditorPath(templateId: string, draftId?: string) {
  return draftId
    ? `/create/${templateId}?draft=${draftId}`
    : `/create/${templateId}`;
}
