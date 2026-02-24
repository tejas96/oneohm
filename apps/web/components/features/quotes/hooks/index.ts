'use client';

import { QuoteStatus } from '@oneohm-epc/shared-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { quoteKeys } from './use-quotes';

import { projectKeys } from '@/components/features/projects/hooks';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// Re-export everything from use-quotes
export * from './use-quotes';

// Quote builder hooks
export { useQuoteConfig } from './use-quote-config';
export type { PanelBrandOption, InverterBrandOption, PanelTechnologyVariant } from './use-quote-config';

export { useCalculateQuote } from './use-calculate-quote';
export { useSaveQuote } from './use-save-quote';
export { useQuoteFormLogic } from './use-quote-form-logic';
export type { UseQuoteFormLogicOptions, UseQuoteFormLogicReturn } from './use-quote-form-logic';
export { useQuotePdf } from './use-quote-pdf';

// ============================================================================
// Types
// ============================================================================

interface UpdateQuoteStatusPayload {
  status: QuoteStatus;
  rejectionReason?: string;
  customerSignature?: string;
}

interface ConvertToProjectPayload {
  projectManagerId?: string;
  teamMembers?: { userId: string; roleName: string }[];
  startDate?: string;
  endDate?: string;
  priority?: string;
}

// ============================================================================
// API Functions
// ============================================================================

async function updateQuoteStatus(
  quoteId: string,
  payload: UpdateQuoteStatusPayload,
) {
  const { data } = await apiClient.patch(`/quotes/${quoteId}/status`, payload);
  return data;
}

async function convertQuoteToProject(
  quoteId: string,
  payload?: ConvertToProjectPayload,
) {
  const { data } = await apiClient.post(
    `/projects/convert-from-quote/${quoteId}`,
    payload ?? {},
  );
  return data;
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useAcceptQuote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation<unknown, AxiosError, { quoteId: string; customerSignature?: string }>({
    mutationFn: ({ quoteId, customerSignature }) =>
      updateQuoteStatus(quoteId, {
        status: QuoteStatus.ACCEPTED,
        customerSignature,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all(organizationId) });
    },
  });
}

export function useRejectQuote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation<unknown, AxiosError, { quoteId: string; rejectionReason: string }>({
    mutationFn: ({ quoteId, rejectionReason }) =>
      updateQuoteStatus(quoteId, {
        status: QuoteStatus.REJECTED,
        rejectionReason,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all(organizationId) });
    },
  });
}

export function useConvertToProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation<unknown, AxiosError, { quoteId: string; payload?: ConvertToProjectPayload }>({
    mutationFn: ({ quoteId, payload }) =>
      convertQuoteToProject(quoteId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all(organizationId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all(organizationId) });
    },
  });
}
