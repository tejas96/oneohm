'use client';

import { useMemo } from 'react';

import { useCustomers, type Customer } from '@/components/features/customers/hooks/use-customers';

interface UseCustomerLookupResult {
  /** The exact-match customer for this phone number, or undefined if none/not looked up yet. */
  customer: Customer | undefined;
  isLoading: boolean;
  isFetched: boolean;
}

/**
 * Exact-match customer lookup by 10-digit phone number.
 * Wraps the existing customers search (`GET /customers?search=`) — a full
 * 10-digit substring match against the stored `+91`-prefixed phone is
 * effectively unique, so no dedicated backend endpoint is needed.
 *
 * Used both for the wizard's initial phone lookup (find-or-create) and for
 * the "this number is already on a profile" duplicate check while typing a
 * new customer's phone.
 */
export function useCustomerLookup(
  phone: string,
  options?: { enabled?: boolean },
): UseCustomerLookupResult {
  const enabled = phone.length === 10 && options?.enabled !== false;

  const { data, isLoading, isFetched } = useCustomers({ search: phone, limit: 5, enabled });

  const customer = useMemo(() => {
    if (!enabled) return undefined;
    return data?.data.find((c) => c.phone.replace(/^\+91/, '') === phone);
  }, [data, phone, enabled]);

  return { customer, isLoading, isFetched };
}
