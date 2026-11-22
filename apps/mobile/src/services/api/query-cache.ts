import type { QueryClient } from "@tanstack/react-query";

export function clearCacheForUserChange(
  client: QueryClient,
  previousUserId: string | null | undefined,
  nextUserId: string | null | undefined,
) {
  if (previousUserId !== undefined && previousUserId !== nextUserId)
    client.clear();
}
