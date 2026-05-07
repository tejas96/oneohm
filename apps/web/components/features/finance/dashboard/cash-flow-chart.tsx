'use client';

import { formatCurrency, formatCurrencyCompact } from '@oneohm-epc/shared/utils';
import * as React from 'react';

import { StackedBarChart, type TrendPoint } from '@/components/shared/inventory';
import type { DashboardCashFlowPoint } from '@/lib/hooks/resources';

/**
 * 12-month cash-flow chart. Each month becomes one X-axis bucket with
 * two stacked bars: cash-in (cleared receipts) and cash-out (expenses).
 *
 * Why stacked rather than grouped: the dashboard is dense and stacked
 * bars make total monthly throughput pop out at a glance. Net cash is
 * already on the KPI strip and doesn't need a third visual lane here.
 *
 * The backend returns months as `YYYY-MM`; we transform to a short
 * "MMM" label (Jan, Feb, ...) for display while keeping the original
 * key as the chart's `date` so sorting + tooltips stay deterministic.
 */
export interface CashFlowChartProps {
  points: DashboardCashFlowPoint[];
  isLoading?: boolean;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortMonth(yyyymm: string): string {
  const [, m] = yyyymm.split('-');
  const idx = Number(m) - 1;
  return MONTH_NAMES[idx] ?? yyyymm;
}

export function CashFlowChart({ points, isLoading }: CashFlowChartProps): React.JSX.Element {
  const data = React.useMemo<TrendPoint[]>(
    () =>
      points.flatMap<TrendPoint>((p) => {
        const label = shortMonth(p.month);
        return [
          { date: label, series: 'Cash In', value: p.cashIn },
          { date: label, series: 'Cash Out', value: p.cashOut },
        ];
      }),
    [points],
  );

  return (
    <StackedBarChart
      title="Cash Flow (Last 12 Months)"
      description="Cleared receipts vs posted expenses, grouped by month"
      height={280}
      isLoading={isLoading}
      isEmpty={!isLoading && points.length === 0}
      data={data}
      yTickFormatter={(v: number) => formatCurrencyCompact(v)}
      valueFormatter={(v: number) => formatCurrency(v)}
    />
  );
}
