'use client';

import { useMemo } from 'react';

/**
 * Memoised Intl.NumberFormat helpers used across the inventory
 * dashboard. The codebase doesn't ship a shared formatCurrency /
 * formatNumber helper (only `formatLabel` / `formatSystemSizeDisplay`
 * exist in lib/utils/format.ts), so this hook centralises the en-IN
 * locale + INR currency choice rather than letting every section
 * pick its own.
 *
 * Returns:
 *   - `number(n)`        : Indian-grouped integer (e.g. 12,34,567).
 *   - `currency(n)`      : INR with no decimals; falls back to "—" for
 *                          NaN / undefined so empty/error states don't
 *                          render "₹NaN".
 *   - `currencyCompact(n)`: Same currency but with K/L/Cr scaling for
 *                           axis ticks / dense KPI values.
 *
 * All formatters are stable across re-renders (created once per locale).
 * Using a hook (not a module-level const) so future i18n switches can
 * thread organization-locale through here without a refactor.
 */

export interface DashboardFormatters {
  number: (n: number | null | undefined) => string;
  currency: (n: number | null | undefined) => string;
  currencyCompact: (n: number | null | undefined) => string;
}

export function useFmt(): DashboardFormatters {
  return useMemo<DashboardFormatters>(() => {
    const numberFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
    const currencyFmt = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
    const compactFmt = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1,
    });
    const isReal = (n: number | null | undefined): n is number =>
      typeof n === 'number' && Number.isFinite(n);
    return {
      number: (n) => (isReal(n) ? numberFmt.format(n) : '—'),
      currency: (n) => (isReal(n) ? currencyFmt.format(n) : '—'),
      currencyCompact: (n) => (isReal(n) ? compactFmt.format(n) : '—'),
    };
  }, []);
}
