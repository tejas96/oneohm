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

export const propertyFollowupKeys = {
  all: () => ['property-followups'] as const,
  byProperty: (propertyId: string, filters?: Record<string, unknown>) =>
    [...propertyFollowupKeys.all(), propertyId, filters ?? {}] as const,
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
  const filters = {
    status: options?.status,
    from: options?.from,
    to: options?.to,
    limit: options?.limit,
  };

  return useQuery({
    queryKey: propertyFollowupKeys.byProperty(propertyId, filters),
    queryFn: async (): Promise<FollowupsListResponse> => {
      const params = new URLSearchParams();
      params.append('propertyId', propertyId);
      if (options?.status) params.append('status', options.status);
      if (options?.from) params.append('from', options.from);
      if (options?.to) params.append('to', options.to);
      if (options?.limit) params.append('limit', String(options.limit));

      const { data } = await apiClient.get<FollowupsListResponse>(
        `/followups?${params.toString()}`,
        {},
      );

      return data;
    },
    enabled: !!propertyId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useCreatePropertyFollowup(): UseMutationResult<
  FollowupResponse,
  AxiosError,
  CreateFollowupInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input): Promise<FollowupResponse> => {
      const { data } = await apiClient.post<FollowupResponse>('/followups', input, {});
      return data;
    },
    onSuccess: (data) => {
      if (data.propertyId) {
        void queryClient.invalidateQueries({
          queryKey: propertyFollowupKeys.byProperty(data.propertyId),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: followupKeys.byCustomer(data.customerId),
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

  return useMutation({
    mutationFn: async (id): Promise<FollowupResponse> => {
      const { data } = await apiClient.post<FollowupResponse>(`/followups/${id}/complete`, {});
      return data;
    },
    onSuccess: (data) => {
      if (data.propertyId) {
        void queryClient.invalidateQueries({
          queryKey: propertyFollowupKeys.byProperty(data.propertyId),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: followupKeys.byCustomer(data.customerId),
      });
    },
  });
}
