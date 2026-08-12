'use client';

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { PaginatedResponse, PaymentTermStatus } from '@tejas96/shared/types';
import type { AxiosError } from 'axios';

import { apiClient } from '@/lib/api/client';

// ============================================================================
// Public types — mirror backend DTOs in apps/backend/src/modules/finance/dto/.
//
// This file once carried seven org-finance hooks. Five of them (dashboard,
// receipts, expenses, vendors-spend, profitability) read the pre-ledger tables
// and had no component consuming them, so both they and their endpoints were
// removed. The two that remain are the ones the customer Finance tab and
// Overview money card render.
// ============================================================================

export type AgingBucket = 'current' | '0-30' | '31-60' | '61-90' | '90+';

export interface DateRangeFilter {
  from?: string;
  to?: string;
}

// ---- Outstanding terms ------------------------------------------------------

export interface OutstandingTerm {
  id: string;
  projectId: string;
  projectNumber: string;
  projectName: string;
  customerId: string;
  customerName: string;
  stage: string;
  name: string;
  dueDate?: string | null;
  expectedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: PaymentTermStatus;
  daysOverdue: number | null;
  agingBucket: AgingBucket;
  createdAt: string;
}

/**
 * Rows come back ordered by days overdue, descending — the only ordering the
 * endpoint implements. `bucket`, `search`, `sort` and `sortOrder` were removed
 * along with the legacy query that claimed to support them; the API validates
 * with forbidNonWhitelisted, so sending one now fails rather than being
 * silently dropped.
 */
export interface OutstandingFilters {
  customerId?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}

// ---- Customers AR -----------------------------------------------------------

export interface CustomerAging {
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  totalOutstanding: number;
  current: number;
  bucket0to30: number;
  bucket31to60: number;
  bucket61to90: number;
  bucket90plus: number;
  lastReceiptDate?: string | null;
  openTermCount: number;
}

// ============================================================================
// Query keys
// ============================================================================

export const orgFinanceKeys = {
  root: () => ['finance-org'] as const,
  outstanding: (filters: OutstandingFilters) =>
    [...orgFinanceKeys.root(), 'outstanding', filters] as const,
  customersAr: () => [...orgFinanceKeys.root(), 'customers-ar'] as const,
};

// ============================================================================
// Hooks — read-only. placeholderData: keepPreviousData so filter/page changes
// feel snappy (no skeleton flash). staleTime 30s reduces tab-focus refetches.
// ============================================================================

const STALE_MS = 30_000;

/**
 * Removes undefined values so the React-Query key doesn't churn between
 * `{}` and `{x: undefined}` (which serialize differently).
 */
function compact<T extends object>(input: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined && v !== '') out[k] = v;
  }
  return out as Partial<T>;
}

export function useOrgOutstanding(
  filters: OutstandingFilters = {},
  options?: { enabled?: boolean },
): UseQueryResult<PaginatedResponse<OutstandingTerm>, AxiosError> {
  const params = compact(filters);
  return useQuery({
    queryKey: orgFinanceKeys.outstanding(params),
    queryFn: async ({ signal }): Promise<PaginatedResponse<OutstandingTerm>> => {
      const { data } = await apiClient.get<PaginatedResponse<OutstandingTerm>>(
        '/finance/outstanding',
        { params, signal },
      );
      return data;
    },
    enabled: options?.enabled !== false,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}

/**
 * Ageing is always as of today. The old `asOfDate` argument was removed rather
 * than kept as a no-op: no caller ever passed it, and the ledger view computes
 * days overdue against the current date.
 */
export function useOrgCustomersAr(
  options?: { enabled?: boolean },
): UseQueryResult<CustomerAging[], AxiosError> {
  return useQuery({
    queryKey: orgFinanceKeys.customersAr(),
    queryFn: async ({ signal }): Promise<CustomerAging[]> => {
      const { data } = await apiClient.get<CustomerAging[]>('/finance/customers/ar', { signal });
      return data;
    },
    enabled: options?.enabled !== false,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  });
}
