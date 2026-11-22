import type { QueryClient } from "@tanstack/react-query";

/**
 * Format read-only credit balance for user display.
 */
export function formatCreditBalance(balance?: number | null): string {
  if (balance === undefined || balance === null) return "—";
  if (balance === 0) return "0 export credits";
  if (balance === 1) return "1 HD export credit";
  return `${balance} HD export credits`;
}

/**
 * Perform sign out and complete cache purge.
 */
export async function performSignOut(
  signOutFn: () => Promise<void>,
  queryClient: QueryClient,
): Promise<void> {
  await signOutFn();
  queryClient.clear();
}

/**
 * Perform account purge via API, sign out of Clerk, and clear cache.
 */
export async function performDeleteAccount(
  deleteAccountApiFn: () => Promise<void>,
  signOutFn: () => Promise<void>,
  queryClient: QueryClient,
): Promise<void> {
  await deleteAccountApiFn();
  try {
    await signOutFn();
  } catch {
    // If the account was already purged server-side, native signOut may fail
    // on an invalidated session; treat as completed deletion.
  } finally {
    queryClient.clear();
  }
}
