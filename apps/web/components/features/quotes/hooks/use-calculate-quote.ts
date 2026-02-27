'use client';

import { useMutation } from '@tanstack/react-query';

import type { CalculateQuoteRequest, CalculateQuoteResponse } from '../types';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';


export function useCalculateQuote() {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation<CalculateQuoteResponse, Error, CalculateQuoteRequest>({
    mutationFn: async (request) => {
      const { data } = await apiClient.post<CalculateQuoteResponse>(
        '/quote-calculator/calculate',
        request,
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
  });
}
