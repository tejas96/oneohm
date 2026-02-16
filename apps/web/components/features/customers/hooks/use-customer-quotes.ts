'use client';

import { QuoteStatus } from '@oneohm-epc/shared-types';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Types
// ============================================================================

/**
 * Quote summary for display in customer detail page
 * Matches QuoteResponseDto from backend
 */
export interface CustomerQuote {
  id: string;
  organizationId: string;
  customerId: string;
  propertyId?: string;
  salesPersonId?: string;
  resellerId?: string;
  quoteNumber: string;
  quoteDate: string;
  validUntil: string;
  currentVersion: number;
  systemType: string;
  systemSizeKw: number;
  totalWattageWp: number;
  projectType: string;
  basePrice?: number;
  gstAmount?: number;
  totalPrice?: number;
  discountAmount?: number;
  finalPrice?: number;
  isSubsidyApplicable?: boolean;
  subsidyAmount?: number;
  effectivePrice?: number;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  // Enriched fields (from relations)
  customerName?: string;
  propertyName?: string;
  salesPersonName?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CustomerQuotesResponse {
  data: CustomerQuote[];
  meta: PaginationMeta;
}

// ============================================================================
// Query Keys
// ============================================================================

export const quoteKeys = {
  all: ['quotes'] as const,
  lists: () => [...quoteKeys.all, 'list'] as const,
  byCustomer: (customerId: string) => [...quoteKeys.all, 'customer', customerId] as const,
  detail: (id: string) => [...quoteKeys.all, 'detail', id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to fetch all quotes for a specific customer
 *
 * @param customerId - The customer UUID to fetch quotes for
 * @param options - Optional pagination and filter options
 * @returns Paginated quotes for the customer
 *
 * @example
 * const { data, isLoading } = useCustomerQuotes(customerId);
 * // Access quotes: data?.data
 * // Access meta: data?.meta
 */
export function useCustomerQuotes(
  customerId: string,
  options?: {
    page?: number;
    limit?: number;
    status?: QuoteStatus;
  }
): UseQueryResult<CustomerQuotesResponse, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;

  return useQuery({
    queryKey: [...quoteKeys.byCustomer(customerId), { page, limit, status: options?.status }],
    queryFn: async (): Promise<CustomerQuotesResponse> => {
      const params = new URLSearchParams();
      params.append('customerId', customerId);
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (options?.status) {
        params.append('status', options.status);
      }

      const { data } = await apiClient.get<CustomerQuotesResponse>(
        `/quotes?${params.toString()}`,
        { headers: { 'X-Organization-Id': organizationId } }
      );
      return data;
    },
    enabled: !!customerId && !!organizationId,
  });
}
