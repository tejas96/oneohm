'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { LossReason } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { followupKeys } from './followup-keys';

import { apiClient } from '@/lib/api/client';

/**
 * Close a site as lost.
 *
 * Per-property by design: one customer can have three sites, and losing one
 * must not pull the other two out of the pipeline.
 */
export function useMarkPropertyLost(): UseMutationResult<
  unknown,
  AxiosError,
  { propertyId: string; reason: string; lossReason?: LossReason }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyId, reason, lossReason }) => {
      const { data } = await apiClient.post(`/customer-properties/${propertyId}/lost`, {
        reason,
        lossReason,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: followupKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['properties'] });
      void queryClient.invalidateQueries({ queryKey: ['property'] });
    },
  });
}

/**
 * Undo a lost mark. The site returns exactly to Active — the loss reason and
 * note are cleared server-side, not archived, so nothing that reads the
 * property afterwards can still see them.
 */
export function useReopenProperty(): UseMutationResult<
  unknown,
  AxiosError,
  { propertyId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyId }) => {
      const { data } = await apiClient.post(`/customer-properties/${propertyId}/reopen`, {});
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: followupKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['properties'] });
      void queryClient.invalidateQueries({ queryKey: ['property'] });
    },
  });
}
