'use client';

import {
  QuoteStatus,
  type QuoteSortField,
  type SortOrder,
  type SystemType,
} from '@oneohm-epc/shared-types';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Types
// ============================================================================

/**
 * Quote filters for the list API
 * Supports pagination, search, filtering, and sorting
 */
export interface QuoteFilters {
  // Pagination
  page?: number;
  limit?: number;
  // Search
  search?: string;
  // Filters
  status?: QuoteStatus;
  customerId?: string;
  propertyId?: string;
  salesPersonId?: string;
  resellerId?: string;
  fromDate?: string;
  toDate?: string;
  // Sorting
  sortBy?: QuoteSortField;
  sortOrder?: SortOrder;
}

export interface QuoteListItem {
  id: string;
  quoteNumber: string;
  organizationId: string;
  customerId: string;
  customerName?: string;
  propertyId?: string;
  propertyName?: string;
  salesPersonId?: string;
  salesPersonName?: string;
  systemSizeKw: number;
  systemType: SystemType;
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
  validUntil: string;
  quoteDate: string;
  currentVersion: number;
  internalNotes?: string;
  customerNotes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface QuoteListResponse {
  data: QuoteListItem[];
  meta: PaginationMeta;
}

export interface QuoteStatusCounts {
  total: number;
  draft: number;
  sent: number;
  viewed: number;
  accepted: number;
  rejected: number;
  expired: number;
}

// ============================================================================
// Query Keys (single source of truth for all quote-related queries)
// ============================================================================

export const quoteKeys = {
  all: (orgId?: string) => ['quotes', orgId] as const,
  lists: (orgId?: string) => [...quoteKeys.all(orgId), 'list'] as const,
  list: (orgId: string | undefined, filters: Record<string, unknown>) =>
    [...quoteKeys.lists(orgId), filters] as const,
  details: (orgId?: string) => [...quoteKeys.all(orgId), 'detail'] as const,
  detail: (orgId: string | undefined, id: string) => [...quoteKeys.details(orgId), id] as const,
  byCustomer: (orgId: string | undefined, customerId: string) =>
    [...quoteKeys.all(orgId), 'customer', customerId] as const,
  byProperty: (orgId: string | undefined, propertyId: string) =>
    [...quoteKeys.all(orgId), 'property', propertyId] as const,
  statusCounts: (orgId?: string) => [...quoteKeys.all(orgId), 'statusCounts'] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch paginated quotes with filters, search, and sorting.
 * Server-side pagination - passes all params to backend.
 */
export function useQuotes(
  filters: QuoteFilters = {},
): UseQueryResult<QuoteListResponse, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: quoteKeys.list(organizationId, filters as Record<string, unknown>),
    queryFn: async (): Promise<QuoteListResponse> => {
      const params = new URLSearchParams();

      if (filters.page) params.append('page', String(filters.page));
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.search && filters.search.length >= 2) {
        params.append('search', filters.search);
      }
      if (filters.status) params.append('status', filters.status);
      if (filters.customerId) params.append('customerId', filters.customerId);
      if (filters.propertyId) params.append('propertyId', filters.propertyId);
      if (filters.salesPersonId) params.append('salesPersonId', filters.salesPersonId);
      if (filters.resellerId) params.append('resellerId', filters.resellerId);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const { data } = await apiClient.get<QuoteListResponse>(`/quotes?${params.toString()}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch a single quote by ID with all versions and line items.
 */
export function useQuote(id: string): UseQueryResult<QuoteListItem, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: quoteKeys.detail(organizationId, id),
    queryFn: async (): Promise<QuoteListItem> => {
      const { data } = await apiClient.get<QuoteListItem>(`/quotes/${id}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!id && !!organizationId,
  });
}

/**
 * Fetch quote counts per status via lightweight API calls.
 * Fires one call per status with limit=1 to get meta.total without loading data.
 */
export function useQuoteStatusCounts(): UseQueryResult<QuoteStatusCounts, AxiosError> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: quoteKeys.statusCounts(organizationId),
    queryFn: async (): Promise<QuoteStatusCounts> => {
      const headers = { 'X-Organization-Id': organizationId };

      const statuses = [
        QuoteStatus.DRAFT,
        QuoteStatus.SENT,
        QuoteStatus.VIEWED,
        QuoteStatus.ACCEPTED,
        QuoteStatus.REJECTED,
        QuoteStatus.EXPIRED,
      ] as const;

      const [totalRes, ...statusResults] = await Promise.all([
        apiClient.get<QuoteListResponse>('/quotes?limit=1', { headers }),
        ...statuses.map((s) =>
          apiClient.get<QuoteListResponse>(`/quotes?limit=1&status=${s}`, { headers }),
        ),
      ]);

      return {
        total: totalRes.data.meta.total,
        draft: statusResults[0]?.data.meta.total ?? 0,
        sent: statusResults[1]?.data.meta.total ?? 0,
        viewed: statusResults[2]?.data.meta.total ?? 0,
        accepted: statusResults[3]?.data.meta.total ?? 0,
        rejected: statusResults[4]?.data.meta.total ?? 0,
        expired: statusResults[5]?.data.meta.total ?? 0,
      };
    },
    enabled: !!organizationId,
    staleTime: 30_000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Send a quote (transition DRAFT -> SENT).
 */
export function useSendQuote(): UseMutationResult<unknown, AxiosError, string> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { data } = await apiClient.patch(
        `/quotes/${quoteId}/status`,
        { status: QuoteStatus.SENT },
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all(organizationId) });
    },
  });
}

/**
 * Soft-delete a quote.
 */
export function useDeleteQuote(): UseMutationResult<void, AxiosError, string> {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useMutation({
    mutationFn: async (quoteId: string): Promise<void> => {
      await apiClient.delete(`/quotes/${quoteId}`, {
        headers: { 'X-Organization-Id': organizationId },
      });
    },
    onSuccess: (_, quoteId) => {
      queryClient.removeQueries({ queryKey: quoteKeys.detail(organizationId, quoteId) });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all(organizationId) });
    },
  });
}
