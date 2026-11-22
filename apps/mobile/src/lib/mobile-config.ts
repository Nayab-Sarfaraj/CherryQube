const configuredOrigin = process.env.EXPO_PUBLIC_WEB_ORIGIN?.trim();

export const WEB_ORIGIN = (configuredOrigin || "http://10.0.2.2:3000").replace(
  /\/$/,
  "",
);

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
