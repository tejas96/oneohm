'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import {
  type FollowupOutcome,
  type FollowupPriority,
  type FollowupType,
} from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { followupKeys } from './followup-keys';
import { type FollowupResponse } from './use-followups';

import { apiClient } from '@/lib/api/client';

export interface NextFollowupInput {
  scheduledAt: string;
  assignedToUserId: string;
  subject: string;
  type?: FollowupType;
  priority?: FollowupPriority;
  notes?: string;
}

export interface CompleteFollowupInput {
  id: string;
  outcome: FollowupOutcome;
  notes?: string;
  /** Omitted only when siblings remain pending, or when terminal is set. */
  next?: NextFollowupInput;
  terminal?: 'accepted' | 'lost';
  lostReason?: string;
}

export interface CreateFollowupInput {
  customerId: string;
  /** Omit for a customer-level followup — a lead with no property yet. */
  propertyId?: string;
  type: FollowupType;
  subject: string;
  scheduledAt: string;
  assignedToUserId: string;
  priority?: FollowupPriority;
  notes?: string;
}

/**
 * Invalidates every followup surface plus the badge.
 *
 * Blunt on purpose: a completion changes the property tab, the customer tab,
 * the /followups buckets and the counts at once, and a partially-stale view of
 * "what do I owe today" is worse than a refetch.
 */
function useInvalidateFollowups(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: followupKeys.all });
  };
}

export function useCompleteFollowup(): UseMutationResult<
  FollowupResponse,
  AxiosError,
  CompleteFollowupInput
> {
  const invalidate = useInvalidateFollowups();
  return useMutation({
    mutationFn: async ({ id, ...body }: CompleteFollowupInput) => {
      const { data } = await apiClient.post<FollowupResponse>(`/followups/${id}/complete`, body);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useRescheduleFollowup(): UseMutationResult<
  FollowupResponse,
  AxiosError,
  { id: string; scheduledAt: string }
> {
  const invalidate = useInvalidateFollowups();
  return useMutation({
    mutationFn: async ({ id, scheduledAt }) => {
      const { data } = await apiClient.post<FollowupResponse>(`/followups/${id}/reschedule`, {
        scheduledAt,
      });
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useReassignFollowup(): UseMutationResult<
  FollowupResponse,
  AxiosError,
  { id: string; assignedToUserId: string }
> {
  const invalidate = useInvalidateFollowups();
  return useMutation({
    mutationFn: async ({ id, assignedToUserId }) => {
      const { data } = await apiClient.post<FollowupResponse>(`/followups/${id}/reassign`, {
        assignedToUserId,
      });
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useReassignFollowupsBulk(): UseMutationResult<
  { updated: number },
  AxiosError,
  { ids: string[]; assignedToUserId: string }
> {
  const invalidate = useInvalidateFollowups();
  return useMutation({
    mutationFn: async (body) => {
      const { data } = await apiClient.post<{ updated: number }>('/followups/reassign', body);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useCreateFollowup(): UseMutationResult<
  FollowupResponse,
  AxiosError,
  CreateFollowupInput
> {
  const invalidate = useInvalidateFollowups();
  return useMutation({
    mutationFn: async (body) => {
      const { data } = await apiClient.post<FollowupResponse>('/followups', body);
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useCancelFollowup(): UseMutationResult<FollowupResponse, AxiosError, string> {
  const invalidate = useInvalidateFollowups();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post<FollowupResponse>(`/followups/${id}/cancel`, {});
      return data;
    },
    onSuccess: invalidate,
  });
}
