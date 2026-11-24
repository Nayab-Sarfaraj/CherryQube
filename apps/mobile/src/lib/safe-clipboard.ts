let expoClipboard: typeof import("expo-clipboard") | null = null;

try {
  // Safe optional load to prevent crashing when native module is not compiled into the APK
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  expoClipboard = require("expo-clipboard");
} catch {
  expoClipboard = null;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (expoClipboard && typeof expoClipboard.setStringAsync === "function") {
      await expoClipboard.setStringAsync(text);
      return true;
    }
  } catch {
    // Fallback if native call fails
  }
  return false;
}
