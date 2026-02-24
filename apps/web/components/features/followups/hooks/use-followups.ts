'use client';

import {
  FollowupPriority,
  FollowupStatus,
  FollowupType,
} from '@oneohm-epc/shared-types';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { propertyKeys } from '@/components/features/properties/hooks';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Types
// ============================================================================

/**
 * Followup response matching backend FollowupResponseDto
 */
export interface FollowupResponse {
  id: string;
  organizationId: string;
  customerId: string;
  propertyId?: string;
  type: FollowupType;
  subject: string;
  scheduledAt: string;
  status: FollowupStatus;
  priority: FollowupPriority;
  notes?: string;
  assignedToUserId: string;
  // Nested relations
  customer?: { id: string; firstName: string; lastName?: string; phone?: string };
  property?: { id: string; propertyName?: string; city?: string };
  assignedToUser?: { id: string; firstName: string; lastName?: string };
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface FollowupListResponse {
  data: FollowupResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FollowupFilters {
  propertyId?: string;
  customerId?: string;
  status?: FollowupStatus;
  assignedToUserId?: string;
  priority?: FollowupPriority;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface CreateFollowupData {
  customerId: string;
  propertyId?: string;
  type: FollowupType;
  subject: string;
  scheduledAt: string;
  assignedToUserId: string;
  priority?: FollowupPriority;
  notes?: string;
}

export interface UpdateFollowupData {
  type?: FollowupType;
  subject?: string;
  scheduledAt?: string;
  assignedToUserId?: string;
  priority?: FollowupPriority;
  notes?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const followupKeys = {
  all: (orgId?: string) => ['followups', orgId] as const,
  lists: (orgId?: string) => [...followupKeys.all(orgId), 'list'] as const,
  list: (orgId: string | undefined, filters: Record<string, unknown>) =>
    [...followupKeys.lists(orgId), filters] as const,
  detail: (orgId: string | undefined, id: string) =>
    [...followupKeys.all(orgId), 'detail', id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch followups with filters
 * Supports filtering by propertyId, customerId, status, etc.
 */
export function useFollowups(
  filters: FollowupFilters = {},
): UseQueryResult<FollowupListResponse, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: followupKeys.list(organizationId, filters as Record<string, unknown>),
    queryFn: async (): Promise<FollowupListResponse> => {
      const params = new URLSearchParams();

      if (filters.propertyId) params.append('propertyId', filters.propertyId);
      if (filters.customerId) params.append('customerId', filters.customerId);
      if (filters.status) params.append('status', filters.status);
      if (filters.assignedToUserId) params.append('assignedToUserId', filters.assignedToUserId);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));

      const { data } = await apiClient.get<FollowupListResponse>(
        `/followups?${params.toString()}`,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    enabled: !!organizationId && !!(filters.propertyId || filters.customerId),
  });
}

/**
 * Hook to create a new followup
 * Invalidates followup list queries on success
 */
export function useCreateFollowup(): UseMutationResult<
  FollowupResponse,
  AxiosError,
  CreateFollowupData
> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async (data: CreateFollowupData): Promise<FollowupResponse> => {
      const { data: response } = await apiClient.post<FollowupResponse>(
        '/followups',
        data,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: followupKeys.lists(organizationId) });
    },
  });
}

/**
 * Hook to update a followup
 * Invalidates list and detail queries on success
 */
export function useUpdateFollowup(): UseMutationResult<
  FollowupResponse,
  AxiosError,
  { id: string; data: UpdateFollowupData }
> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateFollowupData;
    }): Promise<FollowupResponse> => {
      const { data: response } = await apiClient.patch<FollowupResponse>(
        `/followups/${id}`,
        data,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: followupKeys.lists(organizationId) });
      void queryClient.invalidateQueries({ queryKey: followupKeys.detail(organizationId, variables.id) });
    },
  });
}

/**
 * Hook to mark a followup as completed
 * Invalidates followup lists and the related property detail
 */
export function useMarkFollowupComplete(): UseMutationResult<
  FollowupResponse,
  AxiosError,
  { id: string; propertyId?: string }
> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async ({ id }: { id: string; propertyId?: string }): Promise<FollowupResponse> => {
      const { data: response } = await apiClient.patch<FollowupResponse>(
        `/followups/${id}/complete`,
        {},
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: followupKeys.lists(organizationId) });
      if (variables.propertyId) {
        void queryClient.invalidateQueries({
          queryKey: propertyKeys.detail(organizationId, variables.propertyId),
        });
      }
    },
  });
}

/**
 * Hook to mark a followup as cancelled
 * Invalidates followup list queries on success
 */
export function useMarkFollowupCancelled(): UseMutationResult<
  FollowupResponse,
  AxiosError,
  { id: string }
> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async ({ id }: { id: string }): Promise<FollowupResponse> => {
      const { data: response } = await apiClient.patch<FollowupResponse>(
        `/followups/${id}/cancel`,
        {},
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: followupKeys.lists(organizationId) });
    },
  });
}

/**
 * Hook to delete a followup (soft delete)
 * Invalidates followup list queries on success
 */
export function useDeleteFollowup(): UseMutationResult<void, AxiosError, string> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/followups/${id}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: followupKeys.lists(organizationId) });
    },
  });
}
