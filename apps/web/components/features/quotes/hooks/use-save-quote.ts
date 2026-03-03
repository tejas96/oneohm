'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { quoteKeys } from './use-quotes';
import type { CreateFromCalculationRequest, SaveQuoteResponse } from '../types';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

export function useSaveQuote() {
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const queryClient = useQueryClient();

  return useMutation<SaveQuoteResponse, Error, CreateFromCalculationRequest>({
    mutationFn: async (request) => {
      const { data } = await apiClient.post<SaveQuoteResponse>(
        '/quote-calculator/create-from-calculation',
        request,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all(organizationId) });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.statusCounts(organizationId) });
    },
  });
}
