'use client';

import { useQuery, keepPreviousData, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { STALE_TIMES, stableHash, useOrgContext } from '../core';
import {
  resolveStatsWindow,
  type ResolvedStatsWindow,
  type StatsWindowInput,
} from './inventory-stats';

import { apiClient } from '@/lib/api/client';

export type { StatsWindowInput, ResolvedStatsWindow };
export { resolveStatsWindow };

// ============================================================================
// Response types — mirror backend sales-pipeline DTOs
// ============================================================================

export interface PipelineFunnelStage {
  id: string;
  label: string;
  count: number;
  value: number;
  conversionRateFromPrevious: number | null;
  negotiationCount?: number;
  negotiationValue?: number;
}

export interface PipelineFunnelResponse {
  fromDate: string;
  toDate: string;
  stages: PipelineFunnelStage[];
  lostCount: number;
  lostValue: number;
}

export interface PipelineTrendMetric {
  value: number;
  direction: 'up' | 'down' | 'flat' | 'new';
}

export interface PipelineStatsResponse {
  fromDate: string;
  toDate: string;
  totalPipelineValue: number;
  avgDealSize: number;
  winRate: number;
  avgSalesCycleDays: number;
  trendVsPreviousPeriod: {
    totalPipelineValue: PipelineTrendMetric;
    avgDealSize: PipelineTrendMetric;
    winRate: PipelineTrendMetric;
    avgSalesCycleDays: PipelineTrendMetric;
  };
}

export interface PipelineLeaderboardEntry {
  salesPersonId: string | null;
  salesPersonName: string;
  propertyCount: number;
  pipelineValue: number;
  wonCount: number;
  winRate: number;
  isUnassigned: boolean;
}

export interface PipelineLeaderboardResponse {
  fromDate: string;
  toDate: string;
  entries: PipelineLeaderboardEntry[];
}

export interface PipelineTrendPoint {
  period: string;
  leadsCount: number;
  wonCount: number;
}

export interface PipelineTrendResponse {
  fromDate: string;
  toDate: string;
  granularity: 'week' | 'month';
  points: PipelineTrendPoint[];
}

export interface PipelineDashboardResponse {
  fromDate: string;
  toDate: string;
  funnel: Pick<PipelineFunnelResponse, 'stages' | 'lostCount' | 'lostValue'>;
  stats: PipelineStatsResponse;
  leaderboard: Pick<PipelineLeaderboardResponse, 'entries'>;
  trend: Pick<PipelineTrendResponse, 'granularity' | 'points'>;
}

// ============================================================================
// Shared query options
// ============================================================================

export interface PipelineQueryOptions {
  window: StatsWindowInput;
  salesPersonId?: string;
  enabled?: boolean;
}

interface PipelineBaseParams extends Record<string, unknown> {
  fromDate: string;
  toDate: string;
  salesPersonId?: string;
}

function buildBaseParams(
  window: StatsWindowInput,
  salesPersonId?: string,
): { resolved: ResolvedStatsWindow | null; params: PipelineBaseParams } {
  const resolved = resolveStatsWindow(window);
  if (!resolved) return { resolved: null, params: { fromDate: '', toDate: '' } };
  return {
    resolved,
    params: {
      fromDate: resolved.fromDate,
      toDate: resolved.toDate,
      ...(salesPersonId ? { salesPersonId } : {}),
    },
  };
}

const ANALYTICS_SALES_PIPELINE = '/analytics/sales-pipeline';

function usePipelineQuery<TParams extends Record<string, unknown>, TResponse>(
  endpoint: string,
  key: string,
  params: TParams,
  enabled: boolean,
): UseQueryResult<TResponse, unknown> {
  const { organizationId, orgHeaders, isReady } = useOrgContext();

  const queryKey = useMemo(
    () => ['sales-pipeline', organizationId, key, stableHash(params)] as const,
    [organizationId, key, params],
  );

  return useQuery<TResponse>({
    queryKey,
    enabled: isReady && enabled,
    staleTime: STALE_TIMES.standard,
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const search = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null || v === '') continue;
        search.set(k, `${v as string | number | boolean}`);
      }
      const qs = search.toString();
      const url = qs ? `${endpoint}?${qs}` : endpoint;
      const { data } = await apiClient.get<TResponse>(url, { headers: orgHeaders, signal });
      return data;
    },
  });
}

export function usePipelineDashboard(
  opts: PipelineQueryOptions & { granularity?: 'week' | 'month' },
): UseQueryResult<PipelineDashboardResponse, unknown> {
  const { resolved, params } = buildBaseParams(opts.window, opts.salesPersonId);
  const fullParams = { ...params, granularity: opts.granularity ?? 'week' };
  return usePipelineQuery(
    `${ANALYTICS_SALES_PIPELINE}/dashboard`,
    'dashboard',
    fullParams,
    resolved !== null && opts.enabled !== false,
  );
}

export function usePipelineFunnel(
  opts: PipelineQueryOptions,
): UseQueryResult<PipelineFunnelResponse, unknown> {
  const { resolved, params } = buildBaseParams(opts.window, opts.salesPersonId);
  return usePipelineQuery(
    `${ANALYTICS_SALES_PIPELINE}/funnel`,
    'funnel',
    params,
    resolved !== null,
  );
}

export function usePipelineStats(
  opts: PipelineQueryOptions,
): UseQueryResult<PipelineStatsResponse, unknown> {
  const { resolved, params } = buildBaseParams(opts.window, opts.salesPersonId);
  return usePipelineQuery(`${ANALYTICS_SALES_PIPELINE}/stats`, 'stats', params, resolved !== null);
}

export function usePipelineLeaderboard(
  opts: Omit<PipelineQueryOptions, 'salesPersonId'>,
): UseQueryResult<PipelineLeaderboardResponse, unknown> {
  const { resolved, params } = buildBaseParams(opts.window);
  return usePipelineQuery(
    `${ANALYTICS_SALES_PIPELINE}/by-salesperson`,
    'leaderboard',
    params,
    resolved !== null && opts.enabled !== false,
  );
}

export function usePipelineTrend(
  opts: PipelineQueryOptions & { granularity?: 'week' | 'month' },
): UseQueryResult<PipelineTrendResponse, unknown> {
  const { resolved, params } = buildBaseParams(opts.window, opts.salesPersonId);
  const fullParams = { ...params, granularity: opts.granularity ?? 'week' };
  return usePipelineQuery(
    `${ANALYTICS_SALES_PIPELINE}/trend`,
    'trend',
    fullParams,
    resolved !== null,
  );
}
