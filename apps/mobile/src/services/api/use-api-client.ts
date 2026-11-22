import { useMemo } from "react";
import { router } from "expo-router";
import { useMobileAuth } from "@/hooks/use-mobile-auth";
import { createApiClient } from "./api-client";

export function useApiClient() {
  const { getToken } = useMobileAuth();

  return useMemo(() => {
    return createApiClient({
      getAuthToken: getToken,
      onUnauthorized: () => {
        router.push("/(modals)/sign-in");
      },
    });
  }, [getToken]);
}
