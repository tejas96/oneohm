import type { StatsBucket } from '../../services/helpers/stats-window';

/**
 * Shared response shapes used by every Part 10 stats endpoint. These
 * are intentionally plain interfaces (no class-validator decorators):
 * stats endpoints are read-only and return data shaped by SQL
 * aggregations — there's nothing to validate on the way out.
 *
 * Each shape is hand-tuned to be directly consumable by recharts
 * without an extra projection step on the FE.
 */

export interface TrendPoint {
  date: string; // 'YYYY-MM-DD' (bucket start)
  total: number;
  /** Optional per-series breakdown when an endpoint emits stacked data. */
  series?: Record<string, number>;
}

export interface TrendResponse {
  fromDate: string;
  toDate: string;
  bucket: StatsBucket;
  points: TrendPoint[];
}

export interface TopItem {
  id: string | null;
  name: string;
  value: number;
  /** Optional auxiliary column (e.g. percentage of total, secondary count). */
  meta?: Record<string, number | string | null>;
}

export interface TopItemsResponse {
  fromDate?: string;
  toDate?: string;
  limit: number;
  items: TopItem[];
}

export interface FunnelStage {
  status: string;
  count: number;
}

export interface FunnelResponse {
  fromDate: string;
  toDate: string;
  stages: FunnelStage[];
  cancelledCount: number;
}
