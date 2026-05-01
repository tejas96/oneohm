'use client';

import { useMemo } from 'react';

import { useFmt } from './use-fmt';

import {
  HorizontalBarChart,
  TrendLineChart,
  type TopItem,
  type TrendPoint,
} from '@/components/shared/inventory';
import {
  usePoOutstandingByVendor,
  usePoSpendByWarehouse,
  usePoSpendTrend,
  usePoTopVendors,
  type StatsWindowInput,
} from '@/lib/hooks/resources/inventory-stats';

/**
 * Financial section of the inventory dashboard. Four charts in a 2x2
 * grid:
 *
 *   - PO spend trend (TrendLineChart, day bucket) — total approved
 *     spend across the window.
 *   - Top vendors by spend (HorizontalBarChart, top 10).
 *   - PO spend by warehouse (HorizontalBarChart, top 10) — answers
 *     "where did the money go".
 *   - Outstanding by vendor (HorizontalBarChart, top 10), labelled
 *     '(status-based · A2)' because the metric is currently derived
 *     from PO status, not the paid_amount column added in Part 2. The
 *     plan's A2 decision flags this until product confirms which
 *     calculation drives outstanding.
 *
 * All four hooks honour the parent's TimeWindowPicker. Charts wrap in
 * ChartShell internally so loading / empty / error chrome is uniform.
 */

interface DashboardFinancialSectionProps {
  statsWindow: StatsWindowInput;
}

export function DashboardFinancialSection({
  statsWindow,
}: DashboardFinancialSectionProps): React.JSX.Element {
  const fmt = useFmt();

  const spendTrend = usePoSpendTrend({ window: statsWindow, bucket: 'day' });
  const topVendors = usePoTopVendors({ window: statsWindow, limit: 10 });
  const byWarehouse = usePoSpendByWarehouse({ window: statsWindow, limit: 10 });
  const outstanding = usePoOutstandingByVendor({ window: statsWindow, limit: 10 });

  // Backend trend rows expose `total` (and an optional per-key `series`
  // map). The chart primitive's TrendPoint expects `{ date, series?, value }`,
  // so collapse one bucket -> one point with the bucket total when no
  // breakdown is present (which is the case for spend-trend).
  const trendPoints = useMemo<ReadonlyArray<TrendPoint>>(
    () =>
      (spendTrend.data?.points ?? []).map((point) => ({
        date: point.date,
        value: point.total,
      })),
    [spendTrend.data],
  );
  const vendorItems = useMemo<ReadonlyArray<TopItem>>(
    () => (topVendors.data?.items ?? []).map(toTopItem),
    [topVendors.data],
  );
  const warehouseItems = useMemo<ReadonlyArray<TopItem>>(
    () => (byWarehouse.data?.items ?? []).map(toTopItem),
    [byWarehouse.data],
  );
  const outstandingItems = useMemo<ReadonlyArray<TopItem>>(
    () => (outstanding.data?.items ?? []).map(toTopItem),
    [outstanding.data],
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <TrendLineChart
        title="PO spend trend"
        description="Approved spend across the selected window"
        height={220}
        data={trendPoints}
        isLoading={spendTrend.isLoading}
        error={spendTrend.error ? (spendTrend.error as Error) : null}
        yTickFormatter={(v) => fmt.currencyCompact(v)}
        valueFormatter={(v) => fmt.currency(v)}
        help={{
          summary:
            'Total approved purchase order value per day in the selected window. Excludes cancelled POs.',
          details: (
            <>
              <p>
                Each point on the line is the sum of <strong>total amount</strong> across all
                non-cancelled POs whose <strong>PO date</strong> falls on that day. Hover any
                point to see the exact value.
              </p>
              <p className="mt-3">
                A rising trend means procurement is accelerating; a flat line at zero means
                no POs were placed in the window.
              </p>
            </>
          ),
        }}
      />
      <HorizontalBarChart
        title="Top vendors by spend"
        description="Top 10 by approved PO total in window"
        height={220}
        data={vendorItems}
        isLoading={topVendors.isLoading}
        error={topVendors.error ? (topVendors.error as Error) : null}
        xTickFormatter={(v) => fmt.currencyCompact(v)}
        valueFormatter={(v) => fmt.currency(v)}
        labelWidth={160}
        help={{
          summary:
            'Vendors ranked by total purchase order value in the selected time window.',
          details: (
            <>
              <p>
                Bars are sorted descending by spend. Use this to identify your biggest suppliers
                in the period — a useful signal for vendor consolidation, contract renegotiation,
                or supply-risk reviews.
              </p>
              <p className="mt-3">Cancelled POs are excluded.</p>
            </>
          ),
        }}
      />
      <HorizontalBarChart
        title="PO spend by warehouse"
        description="Where the orders are going"
        height={220}
        data={warehouseItems}
        isLoading={byWarehouse.isLoading}
        error={byWarehouse.error ? (byWarehouse.error as Error) : null}
        xTickFormatter={(v) => fmt.currencyCompact(v)}
        valueFormatter={(v) => fmt.currency(v)}
        labelWidth={160}
        help={{
          summary:
            'Total purchase order value broken down by destination warehouse in the selected window.',
          details: (
            <>
              <p>
                Each bar is the sum of PO totals routed to that warehouse. Helps you understand
                which sites are absorbing the most procurement spend — useful for capacity
                planning and warehouse-level budgeting.
              </p>
            </>
          ),
        }}
      />
      <HorizontalBarChart
        title="Outstanding by vendor"
        description="Total – paid across non-cancelled POs"
        height={220}
        data={outstandingItems}
        isLoading={outstanding.isLoading}
        error={outstanding.error ? (outstanding.error as Error) : null}
        xTickFormatter={(v) => fmt.currencyCompact(v)}
        valueFormatter={(v) => fmt.currency(v)}
        labelWidth={160}
        help={{
          summary:
            'Unpaid balance per vendor: total PO value minus the amount already paid, across all non-cancelled POs.',
          details: (
            <>
              <p>
                A vendor appears here only if they have a positive outstanding balance. Larger
                bars mean more money is owed to that vendor.
              </p>
              <p className="mt-3">
                Unlike the other financial charts, this one does <strong>not</strong> respect
                the time window picker — it always shows current outstanding balance, since
                "what do we owe" is a now-snapshot, not a windowed metric.
              </p>
            </>
          ),
        }}
      />
    </div>
  );
}

function toTopItem(
  item: { id: string | null; name: string; value: number },
  index: number,
): TopItem {
  return {
    id: item.id ?? `top-${index}`,
    label: item.name,
    value: item.value,
  };
}
