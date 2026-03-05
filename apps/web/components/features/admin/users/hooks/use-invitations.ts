'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

export interface Invitation {
  id: string;
  email: string;
  status: string;
  organizationId: string;
  organizationName?: string;
  roleId: string;
  roleName?: string;
  expiresAt: string;
  invitedBy?: string;
  createdAt: string;
}

interface InvitationsResponse {
  data: Invitation[];
  total: number;
  page: number;
  pageSize: number;
}

export const invitationKeys = {
  all: ['invitations'] as const,
  list: (filters: Record<string, unknown>) => [...invitationKeys.all, filters] as const,
};

export function useInvitations(
  params: { page?: number; pageSize?: number; organizationId?: string; status?: string } = {},
) {
  const { page = 1, pageSize = 10, organizationId, status } = params;

  return useQuery<InvitationsResponse>({
    queryKey: invitationKeys.list({ page, pageSize, organizationId, status }),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(page));
      queryParams.set('pageSize', String(pageSize));
      if (organizationId) queryParams.set('organizationId', organizationId);
      if (status) queryParams.set('status', status);

      const { data } = await apiClient.get<InvitationsResponse>(
        `/invitations?${queryParams.toString()}`,
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; organizationId: string; roleId: string }) => {
      const response = await apiClient.post('/invitations', data);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationKeys.all });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/invitations/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationKeys.all });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/invitations/${id}/resend`);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invitationKeys.all });
    },
  });
}
