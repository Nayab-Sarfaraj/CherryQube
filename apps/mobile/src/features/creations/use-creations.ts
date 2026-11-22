import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  invitationDetailSchema,
  invitationListResponseSchema,
  renderJobSchema,
  type InvitationDetailDto,
  type InvitationListResponseDto,
  type RenderJobDto,
} from "@greetings/shared";
import { useApiClient } from "../../services/api/use-api-client";
import {
  flattenCreationPages,
  shouldPollCreations,
  shouldPollRender,
} from "./polling-rules";

export { flattenCreationPages, shouldPollCreations, shouldPollRender };

export function useCreations({
  enabled = true,
  isFocused = true,
  isForeground = true,
  limit = 50,
}: {
  enabled?: boolean;
  isFocused?: boolean;
  isForeground?: boolean;
  limit?: number;
} = {}) {
  const api = useApiClient();

  return useInfiniteQuery({
    queryKey: ["creations", { limit }],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (pageParam) params.set("cursor", pageParam);
      return api.get<InvitationListResponseDto>(
        `/api/invitations?${params.toString()}`,
        invitationListResponseSchema,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    refetchInterval: (query) => {
      const allItems = query.state.data?.pages.flatMap((page) => page.items);
      return shouldPollCreations(isFocused, isForeground, allItems);
    },
  });
}

export function useDeleteCreation() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/invitations/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["creations"] });
    },
  });
}

export function useCreationDetail(id: string, enabled = true) {
  const api = useApiClient();

  return useQuery({
    queryKey: ["creation", id],
    queryFn: () =>
      api.get<InvitationDetailDto>(
        `/api/invitations/${id}`,
        invitationDetailSchema,
      ),
    enabled: Boolean(id) && enabled,
  });
}

export function useRenderJob(
  renderId: string | undefined,
  {
    isFocused = true,
    isForeground = true,
  }: { isFocused?: boolean; isForeground?: boolean } = {},
) {
  const api = useApiClient();

  return useQuery({
    queryKey: ["render", renderId],
    queryFn: () =>
      api.get<RenderJobDto>(`/api/renders/${renderId}`, renderJobSchema),
    enabled: Boolean(renderId) && isFocused && isForeground,
    refetchInterval: (query) =>
      shouldPollRender(isFocused, isForeground, query.state.data?.status),
  });
}

export function useRetryRender() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (renderId: string) =>
      api.post<RenderJobDto>(
        `/api/renders/${renderId}`,
        undefined,
        renderJobSchema,
      ),
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.setQueryData(["render", data.id], data);
      }
      void queryClient.invalidateQueries({ queryKey: ["creations"] });
      void queryClient.invalidateQueries({ queryKey: ["creation"] });
    },
  });
}
