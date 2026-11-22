import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  entitlementsResponseSchema,
  type EntitlementsResponseDto,
} from "@greetings/shared";
import { useApiClient } from "../../services/api/use-api-client";

export function useEntitlements(enabled = true) {
  const api = useApiClient();

  return useQuery({
    queryKey: ["entitlements"],
    queryFn: () =>
      api.get<EntitlementsResponseDto>(
        "/api/entitlements",
        entitlementsResponseSchema,
      ),
    enabled,
  });
}

export function useDeleteAccount() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete<void>("/api/account"),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
