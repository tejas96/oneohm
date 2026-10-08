'use client';

import type { DashboardFinancing, DashboardPeriod } from '@tejas96/shared/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

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
  if (period !== 'custom') return { period, financing };

  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  if (!ISO_DAY.test(from) || !ISO_DAY.test(to) || from > to) {
    return { ...DEFAULT_DASHBOARD_FILTERS, financing };
  }
  return { period, from, to, financing };
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

  const write = useCallback(
    (next: DashboardFilters) => {
      const params = new URLSearchParams();
      if (next.period !== 'this_month') params.set('period', next.period);
      if (next.period === 'custom' && next.from && next.to) {
        params.set('from', next.from);
        params.set('to', next.to);
      }
      if (next.financing !== 'all') params.set('type', next.financing);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const setFilters = useCallback(
    (patch: Partial<DashboardFilters>) => {
      const next = { ...filters, ...patch };
      if (next.period !== 'custom') {
        delete next.from;
        delete next.to;
      }
      write(next);
    },
    [filters, write],
  );

  const reset = useCallback(() => write(DEFAULT_DASHBOARD_FILTERS), [write]);
  const isDefault = filters.period === 'this_month' && filters.financing === 'all';

  return { filters, setFilters, reset, isDefault };
}
