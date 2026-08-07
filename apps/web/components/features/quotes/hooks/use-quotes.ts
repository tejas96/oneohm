'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  DocumentEntityType,
  type PaginationMeta,
  QuoteStatus,
  type QuoteSortField,
  type SortOrder,
  type SystemType,
} from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { generatePdfBlob } from '../services/quote-pdf.service';
import type { QuotePdfData } from '../types';

import { apiClient } from '@/lib/api/client';
import { getDocuments } from '@/lib/api/documents';

const WHATSAPP_SHARE_TIMEOUT_MS = 120_000;

interface ShareQuoteWhatsappResult {
  messageId: string;
  status: string;
  documentId: string;
  quoteStatus: string;
}

interface WhatsappMessagingHealth {
  canSend: boolean;
  errors: Array<{ code?: string | number; description?: string }>;
}

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
  // Query control
  enabled?: boolean;
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
  internalNotes?: string;
  customerNotes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  actualSystemSizeKw?: number;
}

export interface PropertyQuoteVersionItem {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  createdAt: string;
  quoteDate: string;
  systemSizeKw?: number;
  totalWattageWp?: number;
  actualSystemSizeKw?: number;
  effectivePrice?: number;
}

export type { PaginationMeta };

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
  all: () => ['quotes'] as const,
  lists: () => [...quoteKeys.all(), 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...quoteKeys.lists(), filters] as const,
  details: () => [...quoteKeys.all(), 'detail'] as const,
  detail: (id: string) => [...quoteKeys.details(), id] as const,
  byCustomer: (customerId: string) =>
    [...quoteKeys.all(), 'customer', customerId] as const,
  byProperty: (propertyId: string) =>
    [...quoteKeys.all(), 'property', propertyId] as const,
  propertyVersions: (propertyId: string) =>
    [...quoteKeys.all(), 'property-versions', propertyId] as const,
  statusCounts: () => [...quoteKeys.all(), 'statusCounts'] as const,
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
  const { enabled: callerEnabled, ...queryFilters } = filters;

  return useQuery({
    queryKey: quoteKeys.list(queryFilters as Record<string, unknown>),
    queryFn: async (): Promise<QuoteListResponse> => {
      const params = new URLSearchParams();

      if (queryFilters.page) params.append('page', String(queryFilters.page));
      if (queryFilters.limit) params.append('limit', String(queryFilters.limit));
      if (queryFilters.search && queryFilters.search.length >= 2) {
        params.append('search', queryFilters.search);
      }
      if (queryFilters.status) params.append('status', queryFilters.status);
      if (queryFilters.customerId) params.append('customerId', queryFilters.customerId);
      if (queryFilters.propertyId) params.append('propertyId', queryFilters.propertyId);
      if (queryFilters.salesPersonId) params.append('salesPersonId', queryFilters.salesPersonId);
      if (queryFilters.resellerId) params.append('resellerId', queryFilters.resellerId);
      if (queryFilters.fromDate) params.append('fromDate', queryFilters.fromDate);
      if (queryFilters.toDate) params.append('toDate', queryFilters.toDate);
      if (queryFilters.sortBy) params.append('sortBy', queryFilters.sortBy);
      if (queryFilters.sortOrder) params.append('sortOrder', queryFilters.sortOrder);

      const { data } = await apiClient.get<QuoteListResponse>(`/quotes?${params.toString()}`, {
      });
      return data;
    },
    enabled: callerEnabled !== false,
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch a single quote by ID with all versions.
 */
export function useQuote(id: string): UseQueryResult<QuoteListItem, AxiosError> {

  return useQuery({
    queryKey: quoteKeys.detail(id),
    queryFn: async (): Promise<QuoteListItem> => {
      const { data } = await apiClient.get<QuoteListItem>(`/quotes/${id}`, {
      });
      return data;
    },
    enabled: !!id,
  });
}

/**
 * Fetch quote counts per status via lightweight API calls.
 * Fires one call per status with limit=1 to get meta.total without loading data.
 */
export function useQuoteStatusCounts(): UseQueryResult<QuoteStatusCounts, AxiosError> {

  return useQuery({
    queryKey: quoteKeys.statusCounts(),
    queryFn: async (): Promise<QuoteStatusCounts> => {

      const statuses = [
        QuoteStatus.DRAFT,
        QuoteStatus.SENT,
        QuoteStatus.VIEWED,
        QuoteStatus.ACCEPTED,
        QuoteStatus.REJECTED,
        QuoteStatus.EXPIRED,
      ] as const;

      const [totalRes, ...statusResults] = await Promise.all([
        apiClient.get<QuoteListResponse>('/quotes?limit=1'),
        ...statuses.map((s) =>
          apiClient.get<QuoteListResponse>(`/quotes?limit=1&status=${s}`),
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

  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { data } = await apiClient.patch(
        `/quotes/${quoteId}/status`,
        { status: QuoteStatus.SENT },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all() });
    },
  });
}

interface ShareQuoteWhatsappInput {
  quoteId: string;
  pdfData: QuotePdfData;
  quoteStatus: QuoteStatus;
  to?: string;
}

async function shareQuoteOnWhatsapp(
  input: ShareQuoteWhatsappInput,
): Promise<ShareQuoteWhatsappResult> {
  const requestConfig = { timeout: WHATSAPP_SHARE_TIMEOUT_MS };

  if (input.quoteStatus !== QuoteStatus.DRAFT) {
    const documents = await getDocuments({
      entityType: DocumentEntityType.QUOTE,
      entityId: input.quoteId,
      tag: 'quote_pdf',
    });
    const latestPdf = documents
      .filter((doc) => doc.mimeType === 'application/pdf')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (latestPdf) {
      const { data } = await apiClient.post<ShareQuoteWhatsappResult>(
        `/quotes/${input.quoteId}/share/whatsapp`,
        {
          documentId: latestPdf.id,
          ...(input.to ? { to: input.to } : {}),
        },
        requestConfig,
      );
      return data;
    }
  }

  const { blob, filename } = await generatePdfBlob(input.pdfData);
  const formData = new FormData();
  formData.append('file', new File([blob], filename, { type: 'application/pdf' }));
  if (input.to) {
    formData.append('to', input.to);
  }

  const { data } = await apiClient.post<ShareQuoteWhatsappResult>(
    `/quotes/${input.quoteId}/share/whatsapp`,
    formData,
    requestConfig,
  );
  return data;
}

export function useShareQuoteWhatsapp(): UseMutationResult<
  ShareQuoteWhatsappResult,
  AxiosError,
  ShareQuoteWhatsappInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quoteId, pdfData, quoteStatus, to }: ShareQuoteWhatsappInput) => {
      return shareQuoteOnWhatsapp({ quoteId, pdfData, quoteStatus, to });
    },
    onSuccess: (_, { quoteId }) => {
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all() });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.detail(quoteId) });
    },
  });
}

export function useWhatsappMessagingHealth(): UseQueryResult<
  WhatsappMessagingHealth | null,
  AxiosError
> {

  return useQuery({
    queryKey: ['whatsapp-messaging-health'],
    queryFn: async (): Promise<WhatsappMessagingHealth | null> => {
      try {
        const { data } = await apiClient.get<WhatsappMessagingHealth>('/quotes/whatsapp/health');
        return data;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });
}

/**
 * Soft-delete a quote.
 */
export function useDeleteQuote(): UseMutationResult<void, AxiosError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteId: string): Promise<void> => {
      await apiClient.delete(`/quotes/${quoteId}`, {
      });
    },
    onSuccess: (_, quoteId) => {
      queryClient.removeQueries({ queryKey: quoteKeys.detail(quoteId) });
      void queryClient.invalidateQueries({ queryKey: quoteKeys.all() });
    },
  });
}

/**
 * Fetch all quotes for a property ordered by creation date (latest first).
 */
export function usePropertyQuoteVersions(
  propertyId: string | undefined,
): UseQueryResult<PropertyQuoteVersionItem[], AxiosError> {

  return useQuery({
    queryKey: quoteKeys.propertyVersions(propertyId ?? ''),
    queryFn: async (): Promise<PropertyQuoteVersionItem[]> => {
      if (!propertyId) return [];
      const { data } = await apiClient.get<PropertyQuoteVersionItem[]>(
        `/quotes/property/${propertyId}/versions`,
      );
      return data;
    },
    enabled: !!propertyId,
    staleTime: 30_000,
  });
}

/**
 * Check if a property is locked (has an accepted quote).
 */
export function usePropertyLockStatus(
  propertyId: string | undefined,
): UseQueryResult<{ locked: boolean; acceptedQuoteNumber?: string }, AxiosError> {

  return useQuery({
    queryKey: [...quoteKeys.all(), 'property-lock', propertyId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ locked: boolean; acceptedQuoteNumber?: string }>(
        '/quotes/property-lock-status',
        {
          params: { propertyId },
        },
      );
      return data;
    },
    enabled: !!propertyId,
  });
}
