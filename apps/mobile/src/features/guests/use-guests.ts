import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  guestAddResponseSchema,
  guestImportResponseSchema,
  guestListResponseSchema,
  type GuestAddResponseDto,
  type GuestImportResponseDto,
  type GuestItemDto,
} from "@greetings/shared";
import { useApiClient } from "../../services/api/use-api-client";

export function useGuests(invitationId: string, enabled = true) {
  const api = useApiClient();

  return useQuery({
    queryKey: ["guests", invitationId],
    queryFn: () =>
      api.get<GuestItemDto[]>(
        `/api/invitations/${invitationId}/guests`,
        guestListResponseSchema,
      ),
    enabled: Boolean(invitationId) && enabled,
  });
}

export function useAddGuest(invitationId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      name: string;
      contact?: { method: "email" | "phone"; value: string };
    }) =>
      api.post<GuestAddResponseDto>(
        `/api/invitations/${invitationId}/guests`,
        input,
        guestAddResponseSchema,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["guests", invitationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["creation", invitationId],
      });
      void queryClient.invalidateQueries({ queryKey: ["creations"] });
    },
  });
}

export function useImportGuests(invitationId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (guests: { name: string }[]) =>
      api.post<GuestImportResponseDto>(
        `/api/invitations/${invitationId}/guests/import`,
        { guests },
        guestImportResponseSchema,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["guests", invitationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["creation", invitationId],
      });
      void queryClient.invalidateQueries({ queryKey: ["creations"] });
    },
  });
}

export function useDeleteGuest(invitationId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (guestId: string) =>
      api.delete<void>(`/api/invitations/${invitationId}/guests/${guestId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["guests", invitationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["creation", invitationId],
      });
      void queryClient.invalidateQueries({ queryKey: ["creations"] });
    },
  });
}

export function useDeleteAllGuests(invitationId: string) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api.delete<{ deleted: number }>(
        `/api/invitations/${invitationId}/guests`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["guests", invitationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["creation", invitationId],
      });
      void queryClient.invalidateQueries({ queryKey: ["creations"] });
    },
  });
}
