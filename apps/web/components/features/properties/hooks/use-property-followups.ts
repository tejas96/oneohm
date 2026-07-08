'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { type FollowupStatus } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import {
  followupKeys,
  type CreateFollowupInput,
  type FollowupResponse,
  type FollowupsListResponse,
} from '@/components/features/customers/hooks';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export const propertyFollowupKeys = {
  all: (orgId?: string) => ['property-followups', orgId] as const,
  byProperty: (orgId: string | undefined, propertyId: string, filters?: Record<string, unknown>) =>
    [...propertyFollowupKeys.all(orgId), propertyId, filters ?? {}] as const,
};

export function usePropertyFollowups(
  propertyId: string,
  options?: {
    enabled?: boolean;
    status?: FollowupStatus;
    from?: string;
    to?: string;
    limit?: number;
  },
): UseQueryResult<FollowupsListResponse, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  const filters = {
    status: options?.status,
    from: options?.from,
    to: options?.to,
    limit: options?.limit,
  };

  return useQuery({
    queryKey: propertyFollowupKeys.byProperty(organizationId, propertyId, filters),
    queryFn: async (): Promise<FollowupsListResponse> => {
      const params = new URLSearchParams();
      params.append('propertyId', propertyId);
      if (options?.status) params.append('status', options.status);
      if (options?.from) params.append('from', options.from);
      if (options?.to) params.append('to', options.to);
      if (options?.limit) params.append('limit', String(options.limit));

      const { data } = await apiClient.get<FollowupsListResponse>(
        `/followups?${params.toString()}`,
        {
          headers: { 'X-Organization-Id': organizationId },
        },
      );

      return data;
    },
    enabled: !!propertyId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useCreatePropertyFollowup(): UseMutationResult<
  FollowupResponse,
  AxiosError,
  CreateFollowupInput
> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async (input): Promise<FollowupResponse> => {
      const { data } = await apiClient.post<FollowupResponse>('/followups', input, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    onSuccess: (data) => {
      if (data.propertyId) {
        void queryClient.invalidateQueries({
          queryKey: propertyFollowupKeys.byProperty(organizationId, data.propertyId),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: followupKeys.byCustomer(organizationId, data.customerId),
      });
    },
  });
}

export function useCompletePropertyFollowup(): UseMutationResult<
  FollowupResponse,
  AxiosError,
  string
> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async (id): Promise<FollowupResponse> => {
      const { data } = await apiClient.post<FollowupResponse>(
        `/followups/${id}/complete`,
        {},
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    onSuccess: (data) => {
      if (data.propertyId) {
        void queryClient.invalidateQueries({
          queryKey: propertyFollowupKeys.byProperty(organizationId, data.propertyId),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: followupKeys.byCustomer(organizationId, data.customerId),
      });
    },
  });
}
