'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { createResourceKeys } from '../core';

import type { CustomerPropertyResponse } from '@/components/features/customers/hooks/use-customer-properties';
import { apiClient } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────

export type { CustomerPropertyResponse };

// ── Query Keys ─────────────────────────────────────────────────

const cpKeys = createResourceKeys('customer-properties');

// ── Hooks ──────────────────────────────────────────────────────

/**
 * Fetch all properties for a specific customer.
 * Returns a flat array (not paginated).
 * Endpoint: GET /customer-properties/customer/:customerId
 */
export function useCustomerPropertiesByCustomer(
  customerId: string,
): UseQueryResult<CustomerPropertyResponse[]> {
  return useQuery<CustomerPropertyResponse[]>({
    queryKey: cpKeys.list({ customerId }),
    queryFn: async (): Promise<CustomerPropertyResponse[]> => {
      const { data } = await apiClient.get<CustomerPropertyResponse[]>(
        `/customer-properties/customer/${customerId}`,
      );
      return data as CustomerPropertyResponse[];
    },
    enabled: !!customerId,
  });
}
