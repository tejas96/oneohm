'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { STALE_TIMES, useOrgContext } from '../core';

import { apiClient } from '@/lib/api/client';

/**
 * FDAL hook for the federated inventory search endpoint introduced in
 * Part 5 (`GET /inventory/search?q=&types=`). The backend fans out
 * across products / vendors / warehouses / purchase-orders /
 * material-dispatches in parallel with per-bucket caps and a 2 s
 * timeout; the frontend's job here is purely to:
 *
 *   * debounce the query so we don't fire a request on every keystroke;
 *   * skip below the backend's 2-character minimum (saves a 400);
 *   * cache results per (orgId, q, types) tuple so re-typing the same
 *     query while the modal stays open is instant;
 *   * surface the `degraded` array so the consumer (the cmdk palette)
 *     can show a "results may be incomplete" hint when one bucket
 *     timed out or errored.
 */

export type InventorySearchType =
  | 'product'
  | 'vendor'
  | 'warehouse'
  | 'purchase-order'
  | 'dispatch';

export interface InventorySearchHit {
  type: InventorySearchType;
  id: string;
  /** Primary label (product/vendor/warehouse name, PO number, dispatch number). */
  label: string;
  /** Optional secondary label (vendor SKU, warehouse code, PO status, …). */
  secondary?: string;
  /** Server-side relevance score; not currently used for ordering but exposed for future ranking experiments. */
  score?: number;
}

export interface InventorySearchResponse {
  query: string;
  hits: InventorySearchHit[];
  /**
   * List of resource buckets that failed or timed out. Empty when all
   * five buckets responded successfully. The cmdk palette surfaces
   * this as a small hint; the dashboard ignores it.
   */
  degraded: InventorySearchType[];
}

export interface UseInventorySearchOptions {
  /** Raw user input. Trimming + min-length checks happen inside the hook. */
  query: string;
  /** Restrict to specific buckets. Omit to search all five. */
  types?: ReadonlyArray<InventorySearchType>;
  /** Debounce delay (ms). Defaults to 200ms — tuned for cmdk feel. */
  debounceMs?: number;
  /** Minimum trimmed length to fire a request. Defaults to 2 (matches backend). */
  minLength?: number;
  /** Disable the request entirely (e.g. modal closed). */
  enabled?: boolean;
}

export interface UseInventorySearchReturn {
  query: UseQueryResult<InventorySearchResponse, unknown>;
  /** The actual debounced + trimmed query string the hook last issued. */
  effectiveQuery: string;
  /** True when the user typed but the trimmed input is below `minLength`. */
  isBelowMinLength: boolean;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function useInventorySearch(opts: UseInventorySearchOptions): UseInventorySearchReturn {
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  const trimmed = opts.query.trim();
  const minLength = opts.minLength ?? 2;
  const debounceMs = opts.debounceMs ?? 200;
  const debounced = useDebouncedValue(trimmed, debounceMs);

  const isBelowMinLength = trimmed.length > 0 && trimmed.length < minLength;
  const isQueryReady = debounced.length >= minLength;
  const enabled = (opts.enabled ?? true) && isReady && isQueryReady;

  const types = opts.types && opts.types.length > 0 ? [...opts.types].sort().join(',') : undefined;

  const queryKey = useMemo(
    () => ['inventory-search', organizationId, debounced, types ?? 'all'] as const,
    [organizationId, debounced, types],
  );

  const query = useQuery<InventorySearchResponse>({
    queryKey,
    enabled,
    // Search results are session-fresh; avoid surprising re-fetches while the
    // dropdown is open but treat them as stale on remount.
    staleTime: STALE_TIMES.fast,
    queryFn: async ({ signal }) => {
      const search = new URLSearchParams();
      search.set('q', debounced);
      if (types) search.set('types', types);
      const { data } = await apiClient.get<InventorySearchResponse>(
        `/inventory/search?${search.toString()}`,
        { headers: orgHeaders, signal },
      );
      return data;
    },
  });

  return { query, effectiveQuery: debounced, isBelowMinLength };
}
