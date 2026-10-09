'use client';

import type { DashboardFinancing, DashboardPeriod } from '@tejas96/shared/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { DashboardFilters } from '@/lib/hooks/resources';

const PERIODS: readonly DashboardPeriod[] = [
  'this_month',
  'last_month',
  'this_quarter',
  'this_fy',
  'custom',
];
const FINANCING: readonly DashboardFinancing[] = ['all', 'cash', 'loan'];
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Same cap as the API (3 years, inclusive), so a range it would reject never reaches it. */
const MAX_CUSTOM_DAYS = 1096;
const DAY_MS = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The API rejects custom dates before this year. */
const MIN_YEAR = 2000;

/** Format AND calendar check: `2026-13-45` matches the regex but is not a day; years before 2000 are refused. */
function isIsoDay(v: string): boolean {
  if (!ISO_DAY.test(v)) return false;
  if (Number(v.slice(0, 4)) < MIN_YEAR) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Inclusive number of days between two valid ISO days. */
function spanDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
}

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  period: 'this_month',
  financing: 'all',
};

/** Bad or half-filled values fall back to the defaults — a stale link must still open. */
export function readDashboardFilters(params: URLSearchParams): DashboardFilters {
  const rawPeriod = params.get('period');
  const rawType = params.get('type');
  const financing = FINANCING.includes(rawType as DashboardFinancing)
    ? (rawType as DashboardFinancing)
    : 'all';
  const period = PERIODS.includes(rawPeriod as DashboardPeriod)
    ? (rawPeriod as DashboardPeriod)
    : 'this_month';
  const rawPerson = params.get('person');
  const person = rawPerson && UUID.test(rawPerson) ? rawPerson : undefined;
  if (period !== 'custom') return { period, financing, ...(person ? { person } : {}) };

  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  if (!isIsoDay(from) || !isIsoDay(to) || from > to || spanDays(from, to) > MAX_CUSTOM_DAYS) {
    return { ...DEFAULT_DASHBOARD_FILTERS, financing, ...(person ? { person } : {}) };
  }
  return { period, from, to, financing, ...(person ? { person } : {}) };
}

export function useDashboardFilters(): {
  filters: DashboardFilters;
  setFilters: (patch: Partial<DashboardFilters>) => void;
  reset: () => void;
  isDefault: boolean;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => readDashboardFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  // What the last write asked for. `router.replace` lands after the call, so neither
  // the last render nor `window.location` has it yet when a second change arrives in
  // the same tick; the URL taking over (any change to it) clears this.
  const pending = useRef<DashboardFilters | null>(null);
  useEffect(() => {
    pending.current = null;
  }, [searchParams]);

  const write = useCallback(
    (next: DashboardFilters) => {
      const params = new URLSearchParams();
      if (next.period !== 'this_month') params.set('period', next.period);
      if (next.period === 'custom' && next.from && next.to) {
        params.set('from', next.from);
        params.set('to', next.to);
      }
      if (next.financing !== 'all') params.set('type', next.financing);
      if (next.person) params.set('person', next.person);
      const qs = params.toString();
      const target = qs ? `${pathname}?${qs}` : pathname;
      // A write that lands on the URL we are already at never changes searchParams,
      // so it must not leave a stale copy behind.
      pending.current =
        target === `${window.location.pathname}${window.location.search}` ? null : next;
      router.replace(target, { scroll: false });
    },
    [pathname, router],
  );

  /**
   * Contract: to enter a custom range, call `setFilters({ period: 'custom', from, to })`
   * in ONE call with both dates. A custom period without both dates is read back
   * as the default (`this_month`), so a split call (period first, dates later) loses the range.
   */
  const setFilters = useCallback(
    (patch: Partial<DashboardFilters>) => {
      // Merge into what is current at call time, not the last render's copy: two
      // changes in one tick (e.g. period then financing) must both land.
      const current =
        pending.current ?? readDashboardFilters(new URLSearchParams(window.location.search));
      const next = { ...current, ...patch };
      if (next.period !== 'custom') {
        delete next.from;
        delete next.to;
      }
      if (!next.person) delete next.person;
      write(next);
    },
    [write],
  );

  const reset = useCallback(() => write(DEFAULT_DASHBOARD_FILTERS), [write]);
  const isDefault =
    filters.period === 'this_month' && filters.financing === 'all' && !filters.person;

  return { filters, setFilters, reset, isDefault };
}
