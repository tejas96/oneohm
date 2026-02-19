'use client';

import { QuoteStatus } from '@oneohm-epc/shared-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';

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

export function useAcceptQuote() {
  const queryClient = useQueryClient();

  return useMutation<unknown, AxiosError, { quoteId: string; customerSignature?: string }>({
    mutationFn: ({ quoteId, customerSignature }) =>
      updateQuoteStatus(quoteId, {
        status: QuoteStatus.ACCEPTED,
        customerSignature,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useRejectQuote() {
  const queryClient = useQueryClient();

  return useMutation<unknown, AxiosError, { quoteId: string; rejectionReason: string }>({
    mutationFn: ({ quoteId, rejectionReason }) =>
      updateQuoteStatus(quoteId, {
        status: QuoteStatus.REJECTED,
        rejectionReason,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useConvertToProject() {
  const queryClient = useQueryClient();

  return useMutation<unknown, AxiosError, { quoteId: string; payload?: ConvertToProjectPayload }>({
    mutationFn: ({ quoteId, payload }) =>
      convertQuoteToProject(quoteId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['quotes'] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
