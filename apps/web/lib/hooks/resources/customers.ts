'use client';

import { useQuery } from '@tanstack/react-query';

import { createResourceKeys, useResourceDetail } from '../core';

import { customerKeys } from '@/components/features/customers/hooks/use-create-customer';
import { Customer } from '@/components/features/customers/hooks/use-customers';
import { apiClient } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────

export type { Customer };
export { customerKeys };

interface CustomerListResponse {
  data: Customer[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const customerResourceKeys = createResourceKeys('customers');

// ── Hooks ──────────────────────────────────────────────────────

/**
 * Search customers by name, phone, or email.
 * Uses direct useQuery so the search string is reactive in the query key —
 * every keystroke fires a new request. Bypasses useResourceList which only
 * reads defaultFilters once on mount.
 */
export function useCustomerSearch(search: string): {
  items: Customer[];
  isFetching: boolean;
  isError: boolean;
} {
  const enabled = search.length >= 2;

  const query = useQuery<CustomerListResponse>({
    queryKey: customerResourceKeys.list({ search, limit: 20 }),
    queryFn: async (): Promise<CustomerListResponse> => {
      const params = new URLSearchParams({ search, limit: '20', page: '1' });
      const { data } = await apiClient.get<CustomerListResponse>(
        `/customers?${params.toString()}`,
      );
      return data as CustomerListResponse;
    },
    enabled,
    staleTime: 30_000,
  });

  return {
    items: query.data?.data ?? [],
    isFetching: query.isFetching,
    isError: query.isError,
  };
}

/**
 * Fetch a single customer by ID.
 * Used by the project creation wizard's deep-link pre-fill.
 */
export function useCustomerDetail(id: string): ReturnType<typeof useResourceDetail<Customer>> {
  return useResourceDetail<Customer>({
    resource: 'customers',
    endpoint: '/customers',
    id,
  });
}
