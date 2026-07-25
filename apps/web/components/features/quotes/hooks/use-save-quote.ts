'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { quoteKeys } from './use-quotes';
import type { CreateFromCalculationRequest, SaveQuoteResponse } from '../types';

import { propertyKeys } from '@/components/features/properties/hooks/property-keys';
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
    onSuccess: (_data, request) => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all(organizationId) });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.statusCounts(organizationId) });
      // A saved quote changes latestQuoteId/Status/SystemSizeKw/FinalPrice on
      // the property it belongs to. Every surface that embeds that info —
      // this customer's nested sites panel, their detail page's Properties
      // tab, the quote builder's own property picker — reads it from
      // `propertyKeys.byCustomer`, which nothing here previously touched.
      // Without this, that cache keeps serving the pre-quote snapshot for up
      // to `staleTime` (60s), so a quote you just saved doesn't show up until
      // a hard refresh.
      void queryClient.invalidateQueries({
        queryKey: propertyKeys.byCustomer(organizationId, request.customerId),
      });
      void queryClient.invalidateQueries({
        queryKey: propertyKeys.detail(organizationId, request.propertyId),
      });
    },
  });
}
