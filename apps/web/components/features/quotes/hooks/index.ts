'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LossReason, QuoteStatus } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { quoteKeys } from './use-quotes';

import { apiClient } from '@/lib/api/client';

// Re-export everything from use-quotes
export * from './use-quotes';

// Quote detail hooks
export { useQuoteDetail } from './use-quote-detail';

// Types
// Quote builder hooks
// ============================================================================
// Types
// ============================================================================

interface UpdateQuoteStatusPayload {
  status: QuoteStatus;
  rejectionReason?: string;
  customerSignature?: string;
  /** What happens to the site: "requote" keeps it, "close" marks it lost. */
  rejectionOutcome?: 'requote' | 'close';
  /** Only meaningful alongside rejectionOutcome: 'close'. */
  lossReason?: LossReason;
}

// ============================================================================
// API Functions
// ============================================================================

async function updateQuoteStatus(quoteId: string, payload: UpdateQuoteStatusPayload) {
  const { data } = await apiClient.patch(`/quotes/${quoteId}/status`, payload, {});
  return data;
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useAcceptQuote() {
  const queryClient = useQueryClient();

  return useMutation<unknown, AxiosError, { quoteId: string; customerSignature: string }>({
    mutationFn: ({ quoteId, customerSignature }) =>
      updateQuoteStatus(quoteId, { status: QuoteStatus.ACCEPTED, customerSignature }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all() });
    },
  });
}

export function useRejectQuote() {
  const queryClient = useQueryClient();

  return useMutation<
    unknown,
    AxiosError,
    {
      quoteId: string;
      rejectionReason: string;
      rejectionOutcome: 'requote' | 'close';
      lossReason?: LossReason;
    }
  >({
    mutationFn: ({ quoteId, rejectionReason, rejectionOutcome, lossReason }) =>
      updateQuoteStatus(quoteId, {
        status: QuoteStatus.REJECTED,
        rejectionReason,
        rejectionOutcome,
        lossReason,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all() });
    },
  });
}
