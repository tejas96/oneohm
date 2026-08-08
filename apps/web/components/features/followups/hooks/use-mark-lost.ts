'use client';

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
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
  { propertyId: string; reason: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyId, reason }) => {
      const { data } = await apiClient.post(`/customer-properties/${propertyId}/lost`, { reason });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: followupKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['properties'] });
      void queryClient.invalidateQueries({ queryKey: ['property'] });
    },
  });
}

/** Close an enquiry that never got a site. */
export function useMarkCustomerLost(): UseMutationResult<
  unknown,
  AxiosError,
  { customerId: string; reason: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ customerId, reason }) => {
      const { data } = await apiClient.post(`/customers/${customerId}/lost`, { reason });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: followupKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      void queryClient.invalidateQueries({ queryKey: ['customer'] });
    },
  });
}
