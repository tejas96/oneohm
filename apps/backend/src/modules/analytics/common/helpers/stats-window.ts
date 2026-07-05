import { BadRequestException } from '@nestjs/common';

/**
 * Helpers shared by every Part 10 stats endpoint.
 *
 * Contract (mirrors the existing inventory-transaction stats/summary
 * route to avoid yet-another date convention):
 *   * `fromDate` / `toDate` are optional `YYYY-MM-DD` strings
 *   * If both omitted, default to a trailing 30-day window ending
 *     today (UTC). Confirmed with product on 2026-04-30.
 *   * If either is provided, BOTH must be provided.
 *   * `from <= to` and the window must be <= 365 days, otherwise 400.
 *
 * `bucket` is `'day'` (default) or `'week'`. We expose it as a typed
 * union so SQL builders can branch on it without re-validating.
 */

export type StatsBucket = 'day' | 'week';

export interface StatsWindow {
  fromDate: string; // 'YYYY-MM-DD'
  toDate: string; // 'YYYY-MM-DD'
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_WINDOW_DAYS = 365;
const DEFAULT_WINDOW_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcDate(yyyymmdd: string): Date {
  const parts = yyyymmdd.split('-').map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(Date.UTC(y, m - 1, d));
}

function formatUtcDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Resolve the {fromDate, toDate} window for a stats request. Throws
 * `BadRequestException` (400) for any malformed or out-of-range
 * input. Both fields on the returned object are guaranteed
 * `YYYY-MM-DD`.
 */
export function resolveStatsWindow(
  fromDate: string | undefined,
  toDate: string | undefined,
): StatsWindow {
  if (!fromDate && !toDate) {
    const now = new Date();
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const start = new Date(end.getTime() - (DEFAULT_WINDOW_DAYS - 1) * MS_PER_DAY);
    return { fromDate: formatUtcDate(start), toDate: formatUtcDate(end) };
  }

  if (!fromDate || !toDate) {
    throw new BadRequestException('Both fromDate and toDate are required when either is provided');
  }

  if (!ISO_DATE_RE.test(fromDate) || !ISO_DATE_RE.test(toDate)) {
    throw new BadRequestException('fromDate and toDate must be ISO YYYY-MM-DD strings');
  }

  const start = toUtcDate(fromDate);
  const end = toUtcDate(toDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new BadRequestException('fromDate or toDate is not a valid date');
  }
  if (start.getTime() > end.getTime()) {
    throw new BadRequestException('fromDate must be on or before toDate');
  }

  const spanDays = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  if (spanDays > MAX_WINDOW_DAYS) {
    throw new BadRequestException(
      `Date window cannot exceed ${MAX_WINDOW_DAYS} days (got ${spanDays})`,
    );
  }

  return { fromDate, toDate };
}

/**
 * Resolve the optional `bucket` query param to a typed union, defaulting
 * to 'day'. Anything else returns 400.
 */
export function resolveStatsBucket(value: string | undefined): StatsBucket {
  if (value === undefined || value === '' || value === 'day') return 'day';
  if (value === 'week') return 'week';
  throw new BadRequestException("bucket must be 'day' or 'week'");
}

/**
 * Resolve the optional `limit` query param. Defaults to 10. Range 1..50.
 */
export function resolveStatsLimit(value: string | undefined, fallback = 10): number {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new BadRequestException('limit must be an integer');
  }
  if (n < 1 || n > 50) {
    throw new BadRequestException('limit must be between 1 and 50');
  }
  return n;
}

/**
 * Given a bucket + a column reference, return the SQL expression that
 * truncates that column to the bucket boundary, formatted as a
 * `YYYY-MM-DD` string. Postgres `date_trunc` returns a timestamp; we
 * cast to date so the JSON result is a clean ISO date with no
 * timezone gymnastics on the FE.
 */
export function bucketDateExpr(column: string, bucket: StatsBucket): string {
  if (bucket === 'week') {
    return `to_char(date_trunc('week', ${column}), 'YYYY-MM-DD')`;
  }
  return `to_char(date_trunc('day', ${column}), 'YYYY-MM-DD')`;
}
