'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  FollowupPriority,
  FollowupStatus,
  FollowupType,
  type PaginationMeta,
} from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export interface FollowupResponse {
  id: string;
  organizationId: string;
  customerId: string;
  propertyId?: string | null;
  type: FollowupType;
  subject: string;
  scheduledAt: string;
  assignedToUserId: string;
  status: FollowupStatus;
  priority: FollowupPriority;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  property?: { id: string; propertyName?: string; city?: string };
  assignedToUser?: { id: string; firstName: string; lastName?: string };
}

export interface FollowupsListResponse {
  data: FollowupResponse[];
  meta?: PaginationMeta;
}

export interface CreateFollowupInput {
  customerId: string;
  propertyId?: string | null;
  type: FollowupType;
  subject: string;
  scheduledAt: string;
  assignedToUserId: string;
  priority?: FollowupPriority;
  notes?: string;
}

export const followupKeys = {
  all: (orgId?: string) => ['followups', orgId] as const,
  byCustomer: (orgId: string | undefined, customerId: string, filters?: Record<string, unknown>) =>
    [...followupKeys.all(orgId), 'customer', customerId, filters ?? {}] as const,
};

export function useCustomerFollowups(
  customerId: string,
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
    queryKey: followupKeys.byCustomer(organizationId, customerId, filters),
    queryFn: async (): Promise<FollowupsListResponse> => {
      const params = new URLSearchParams();
      params.append('customerId', customerId);
      if (options?.status) params.append('status', options.status);
      if (options?.from) params.append('from', options.from);
      if (options?.to) params.append('to', options.to);
      if (options?.limit) params.append('limit', String(options.limit));

      const { data } = await apiClient.get<
        FollowupsListResponse | { data: FollowupResponse[]; meta?: PaginationMeta }
      >(`/followups?${params.toString()}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      if (Array.isArray(data)) {
        return { data };
      }
      if ('data' in data && Array.isArray(data.data)) {
        return { data: data.data, meta: data.meta };
      }
      return { data: [] };
    },
    enabled: !!customerId && !!organizationId && options?.enabled !== false,
    staleTime: 30_000,
  });
}

export function useCreateFollowup(): UseMutationResult<
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
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: followupKeys.byCustomer(organizationId, variables.customerId),
      });
    },
  });
}

export function useCompleteFollowup(): UseMutationResult<FollowupResponse, AxiosError, string> {
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
      void queryClient.invalidateQueries({
        queryKey: followupKeys.byCustomer(organizationId, data.customerId),
      });
    },
  });
}
