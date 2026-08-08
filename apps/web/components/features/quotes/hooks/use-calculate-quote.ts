'use client';

import { useMutation } from '@tanstack/react-query';

import type { CalculateQuoteRequest, CalculateQuoteResponse } from '../types';

import { apiClient } from '@/lib/api/client';

export function useCalculateQuote() {
  return useMutation<CalculateQuoteResponse, Error, CalculateQuoteRequest>({
    mutationFn: async (request) => {
      const { data } = await apiClient.post<CalculateQuoteResponse>(
        '/quote-calculator/calculate',
        request,
      );
      return data;
    },
  });
}
