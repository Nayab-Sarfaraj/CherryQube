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
      url.hostname === "0.0.0.0" ||
      url.hostname === "[::1]" ||
      url.hostname === "[::]" ||
      url.hostname.endsWith(".localhost")
    );
  } catch {
    return (
      trimmed.includes("localhost") ||
      trimmed.includes("127.0.0.1") ||
      trimmed.includes("0.0.0.0") ||
      trimmed.includes("::1")
    );
  }
}

export function rewriteToAndroidEmulatorHost(origin: string): string {
  try {
    const hasProtocol = origin.includes("://");
    const parsed = new URL(hasProtocol ? origin : `http://${origin}`);
    parsed.hostname = "10.0.2.2";
    const result = parsed.toString().replace(/\/$/, "");
    return hasProtocol ? result : result.replace(/^http:\/\//, "");
  } catch {
    return "http://10.0.2.2:3000";
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
    return rewriteToAndroidEmulatorHost(clean);
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

export function resolveMediaUrl(
  url?: string | null,
  origin = WEB_ORIGIN,
): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  try {
    const hasProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://");
    if (hasProtocol) {
      const parsed = new URL(trimmed);
      if (isLoopbackOrigin(parsed.hostname)) {
        const target = new URL(origin);
        parsed.protocol = target.protocol;
        parsed.hostname = target.hostname;
        parsed.port = target.port;
        return parsed.toString();
      }
      return trimmed;
    }
    return new URL(
      trimmed.startsWith("/") ? trimmed.slice(1) : trimmed,
      origin.endsWith("/") ? origin : `${origin}/`,
    ).toString();
  } catch {
    return trimmed;
  }
}

