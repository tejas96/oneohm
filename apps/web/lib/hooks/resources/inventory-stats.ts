'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { STALE_TIMES, stableHash, useOrgContext } from '../core';

import { apiClient } from '@/lib/api/client';

/**
 * FDAL hooks for the inventory stats endpoints introduced in Part 10.
 *
 * The backend exposes 8 endpoints, each org-scoped, JWT-gated by
 * `inventory:read`, and accepting a common window contract:
 *
 *   * `fromDate`/`toDate` (`YYYY-MM-DD`, max 365-day span, fromDate <= toDate)
 *   * `bucket` (`day` | `week`, default `day`) — applies to trend endpoints
 *   * `limit` (1..50, default 10) — applies to top-N endpoints
 *
 * Frontend contract: callers (the dashboard, list KPI stripes) drive
 * the window from the URL via `<TimeWindowPicker />`, which writes
 * `?range=7d|30d|90d|365d|custom` + optional `?fromDate=&toDate=` for
 * custom. This module is responsible for translating that URL shape
 * into the backend's `fromDate`/`toDate` ISO pair before issuing the
 * request — the backend doesn't know the `range` shorthand.
 *
 * Keying: every stats hook namespaces under
 * `['inventory-stats', orgId, '<endpoint>', stableHash(params)]` so:
 *   * different windows / buckets / limits cache independently;
 *   * org switches invalidate the whole bucket;
 *   * the rebuild-dashboard part can `invalidateQueries(['inventory-stats'])`
 *     after a mutation to refresh every chart in one shot.
 */

// ============================================================================
// Shared response types — mirror backend dto/common/stats.dto.ts.
// ============================================================================

/**
 * Mirrors the backend `TrendPoint` (apps/backend/.../dto/common/stats.dto.ts):
 *   - `total` is the bucket-wide aggregate (always present)
 *   - `series` is an optional per-key breakdown that sums to `total`
 *     (e.g. transactions-by-type emits `{ adjustment: 5, receive: 3 }`)
 *
 * Earlier this module typed `series` as a `string` and exposed a `value`
 * field that the backend never returns. That mismatch caused the
 * dashboard charts to feed objects into Recharts as keys and produced
 * the "two children with the same key `[object Object]`" warning.
 */
export interface StatsTrendPoint {
  date: string;
  total: number;
  series?: Record<string, number>;
}

export interface StatsTrendResponse {
  fromDate: string;
  toDate: string;
  bucket: 'day' | 'week';
  points: StatsTrendPoint[];
}

/**
 * Mirrors the backend `TopItem`. Note `name` (not `label`) and the
 * optional `meta` bag for auxiliary columns (orderCount, warehouse, ...).
 */
export interface StatsTopItem {
  id: string | null;
  name: string;
  value: number;
  meta?: Record<string, number | string | null>;
}

export interface StatsTopItemsResponse {
  fromDate?: string;
  toDate?: string;
  limit: number;
  items: StatsTopItem[];
}

/**
 * Mirrors the backend `FunnelStage` — keyed by `status` + `count`. The
 * dashboard adapter is responsible for mapping status enum values into
 * human-readable labels for the funnel chart primitive.
 */
export interface StatsFunnelStage {
  status: string;
  count: number;
}

export interface StatsFunnelResponse {
  fromDate: string;
  toDate: string;
  stages: StatsFunnelStage[];
  cancelledCount: number;
}

// ============================================================================
// Window resolution: URL TimeWindowPicker shape -> backend query params
// ============================================================================

export type StatsRangePreset = '7d' | '30d' | '90d' | '365d' | 'custom';

export interface StatsWindowInput {
  /**
   * From `<TimeWindowPicker />` URL key — defaults to '30d' if undefined.
   * Typed as a plain `string` because the picker stuffs raw URL values
   * here and we don't want to force consumers to assert/narrow.
   * Anything not in `StatsRangePreset` is treated as malformed and
   * yields a `null` window from `resolveStatsWindow`.
   */
  range?: string;
  /** ISO `YYYY-MM-DD`; only honoured when range === 'custom'. */
  fromDate?: string;
  /** ISO `YYYY-MM-DD`; only honoured when range === 'custom'. */
  toDate?: string;
}

export interface ResolvedStatsWindow {
  fromDate: string;
  toDate: string;
}

export const STATS_MAX_WINDOW_DAYS = 365;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PRESET_DAYS: Record<Exclude<StatsRangePreset, 'custom'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '365d': 365,
};

function toIsoDate(d: Date): string {
  // Use UTC so the day boundary matches what the backend uses (date_trunc on UTC).
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isValidIsoDate(value: string): boolean {
  return ISO_DATE.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function spanDaysInclusive(fromDate: string, toDate: string): number {
  const start = new Date(`${fromDate}T00:00:00Z`).getTime();
  const end = new Date(`${toDate}T00:00:00Z`).getTime();
  return Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
}

/**
 * Translate `<TimeWindowPicker />` URL state into a concrete (fromDate,
 * toDate) pair. Returns `null` if the input is malformed (invalid
 * custom dates, fromDate > toDate) so the caller can skip the request
 * rather than firing a guaranteed-400.
 */
export function resolveStatsWindow(input: StatsWindowInput): ResolvedStatsWindow | null {
  const range = input.range ?? '30d';

  if (range === 'custom') {
    const { fromDate, toDate } = input;
    if (!fromDate || !toDate) return null;
    if (!isValidIsoDate(fromDate) || !isValidIsoDate(toDate)) return null;
    if (fromDate > toDate) return null;
    if (spanDaysInclusive(fromDate, toDate) > STATS_MAX_WINDOW_DAYS) return null;
    return { fromDate, toDate };
  }

  // PRESET_DAYS is keyed by the non-custom presets only; an unknown
  // value (e.g. a stale URL value) yields `undefined` and we bail.
  const days = (PRESET_DAYS as Record<string, number | undefined>)[range];
  if (days === undefined) return null;

  const today = new Date();
  const from = new Date(today);
  from.setUTCDate(today.getUTCDate() - (days - 1));
  return { fromDate: toIsoDate(from), toDate: toIsoDate(today) };
}

// ============================================================================
// Internal hook helper
// ============================================================================

interface StatsQueryArgs<TParams extends Record<string, unknown>> {
  endpoint: string;
  /** Stable identifier for the cache namespace (matches the API path tail). */
  key: string;
  params: TParams;
  /** Disable the request (e.g. when the window is unresolvable). */
  enabled?: boolean;
}

function useStatsQuery<TParams extends Record<string, unknown>, TResponse>(
  args: StatsQueryArgs<TParams>,
): UseQueryResult<TResponse, unknown> {
  const { organizationId, orgHeaders, isReady } = useOrgContext();
  const { endpoint, key, params, enabled = true } = args;

  const queryKey = useMemo(
    () => ['inventory-stats', organizationId, key, stableHash(params)] as const,
    [organizationId, key, params],
  );

  return useQuery<TResponse>({
    queryKey,
    enabled: isReady && enabled,
    staleTime: STALE_TIMES.standard,
    queryFn: async ({ signal }) => {
      const search = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null || v === '') continue;
        search.set(k, `${v as string | number | boolean}`);
      }
      const qs = search.toString();
      const url = qs ? `${endpoint}?${qs}` : endpoint;
      const { data } = await apiClient.get<TResponse>(url, {
        headers: orgHeaders,
        signal,
      });
      return data;
    },
  });
}

// ============================================================================
// Endpoint-specific hooks
// ============================================================================

export interface UseTrendStatsOptions {
  window: StatsWindowInput;
  bucket?: 'day' | 'week';
}

export interface UseTopStatsOptions {
  window: StatsWindowInput;
  limit?: number;
}

export interface UseFunnelStatsOptions {
  window: StatsWindowInput;
}

function buildTrendParams(opts: UseTrendStatsOptions): {
  resolved: ResolvedStatsWindow | null;
  params: Record<string, unknown>;
} {
  const resolved = resolveStatsWindow(opts.window);
  if (!resolved) return { resolved: null, params: {} };
  return {
    resolved,
    params: {
      fromDate: resolved.fromDate,
      toDate: resolved.toDate,
      bucket: opts.bucket ?? 'day',
    },
  };
}

function buildTopParams(opts: UseTopStatsOptions): {
  resolved: ResolvedStatsWindow | null;
  params: Record<string, unknown>;
} {
  const resolved = resolveStatsWindow(opts.window);
  if (!resolved) return { resolved: null, params: {} };
  return {
    resolved,
    params: {
      fromDate: resolved.fromDate,
      toDate: resolved.toDate,
      ...(opts.limit !== undefined && { limit: opts.limit }),
    },
  };
}

function buildFunnelParams(opts: UseFunnelStatsOptions): {
  resolved: ResolvedStatsWindow | null;
  params: Record<string, unknown>;
} {
  const resolved = resolveStatsWindow(opts.window);
  if (!resolved) return { resolved: null, params: {} };
  return {
    resolved,
    params: { fromDate: resolved.fromDate, toDate: resolved.toDate },
  };
}

// Purchase orders -------------------------------------------------------------

export function usePoSpendTrend(
  opts: UseTrendStatsOptions,
): UseQueryResult<StatsTrendResponse, unknown> {
  const { resolved, params } = buildTrendParams(opts);
  return useStatsQuery({
    endpoint: '/purchase-orders/stats/spend-trend',
    key: 'po:spend-trend',
    params,
    enabled: resolved !== null,
  });
}

export function usePoTopVendors(
  opts: UseTopStatsOptions,
): UseQueryResult<StatsTopItemsResponse, unknown> {
  const { resolved, params } = buildTopParams(opts);
  return useStatsQuery({
    endpoint: '/purchase-orders/stats/top-vendors',
    key: 'po:top-vendors',
    params,
    enabled: resolved !== null,
  });
}

export function usePoSpendByWarehouse(
  opts: UseTopStatsOptions,
): UseQueryResult<StatsTopItemsResponse, unknown> {
  const { resolved, params } = buildTopParams(opts);
  return useStatsQuery({
    endpoint: '/purchase-orders/stats/spend-by-warehouse',
    key: 'po:spend-by-warehouse',
    params,
    enabled: resolved !== null,
  });
}

export function usePoOutstandingByVendor(
  opts: UseTopStatsOptions,
): UseQueryResult<StatsTopItemsResponse, unknown> {
  const { resolved, params } = buildTopParams(opts);
  return useStatsQuery({
    endpoint: '/purchase-orders/stats/outstanding-by-vendor',
    key: 'po:outstanding-by-vendor',
    params,
    enabled: resolved !== null,
  });
}

// Inventory transactions ------------------------------------------------------

export function useTransactionsByTypeTrend(
  opts: UseTrendStatsOptions,
): UseQueryResult<StatsTrendResponse, unknown> {
  const { resolved, params } = buildTrendParams(opts);
  return useStatsQuery({
    endpoint: '/inventory-transactions/stats/by-type-trend',
    key: 'txn:by-type-trend',
    params,
    enabled: resolved !== null,
  });
}

// Funnels ---------------------------------------------------------------------

export function useDispatchFunnel(
  opts: UseFunnelStatsOptions,
): UseQueryResult<StatsFunnelResponse, unknown> {
  const { resolved, params } = buildFunnelParams(opts);
  return useStatsQuery({
    endpoint: '/material-dispatches/stats/funnel',
    key: 'dispatch:funnel',
    params,
    enabled: resolved !== null,
  });
}

export function useAllocationFunnel(
  opts: UseFunnelStatsOptions,
): UseQueryResult<StatsFunnelResponse, unknown> {
  const { resolved, params } = buildFunnelParams(opts);
  return useStatsQuery({
    endpoint: '/stock-allocations/stats/funnel',
    key: 'allocation:funnel',
    params,
    enabled: resolved !== null,
  });
}

// Stock -----------------------------------------------------------------------

export interface UseTopLowStockOptions {
  /** 1..50; defaults to backend's default of 10. */
  limit?: number;
  /** Filter by warehouse (forwarded as `warehouseId`). */
  warehouseId?: string;
}

export function useTopLowStock(
  opts: UseTopLowStockOptions = {},
): UseQueryResult<StatsTopItemsResponse, unknown> {
  const params: Record<string, unknown> = {};
  if (opts.limit !== undefined) params.limit = opts.limit;
  if (opts.warehouseId) params.warehouseId = opts.warehouseId;
  return useStatsQuery({
    endpoint: '/inventory-stock/stats/top-low-stock',
    key: 'stock:top-low-stock',
    params,
  });
}
