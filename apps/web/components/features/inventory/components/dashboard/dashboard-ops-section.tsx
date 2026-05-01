'use client';

import { useMemo } from 'react';

import { useFmt } from './use-fmt';

import {
  FunnelChartReusable,
  HorizontalBarChart,
  StackedBarChart,
  type FunnelStageInput,
  type TopItem,
  type TrendPoint,
} from '@/components/shared/inventory';
import {
  useAllocationFunnel,
  useDispatchFunnel,
  useTopLowStock,
  useTransactionsByTypeTrend,
  type StatsWindowInput,
} from '@/lib/hooks/resources/inventory-stats';

/**
 * Operations section of the inventory dashboard. Four charts laid out
 * in a 2x2 grid (1 col on phones, 2 from md upward):
 *
 *   - Transactions by type (StackedBarChart, day bucket)
 *   - Allocation funnel (FunnelChartReusable)
 *   - Dispatch funnel (FunnelChartReusable)
 *   - Top low-stock items (HorizontalBarChart, top 10 by deficit)
 *
 * The four hooks fan out independently — no chart blocks the others.
 * Each chart is wrapped in ChartShell internally (via the Part 11
 * primitives) so loading / empty / error states are uniform.
 *
 * Top-low-stock is window-independent: stock levels are point-in-time
 * facts, so changing the time window doesn't change the answer to
 * "which products are below threshold right now". The other three
 * honour the window.
 */

interface DashboardOpsSectionProps {
  statsWindow: StatsWindowInput;
  className?: string;
}

export function DashboardOpsSection({
  statsWindow,
  className,
}: DashboardOpsSectionProps): React.JSX.Element {
  const fmt = useFmt();

  const txnByType = useTransactionsByTypeTrend({ window: statsWindow, bucket: 'day' });
  const allocFunnel = useAllocationFunnel({ window: statsWindow });
  const dispFunnel = useDispatchFunnel({ window: statsWindow });
  const topLow = useTopLowStock({ limit: 10 });

  // Backend emits `{ date, total, series?: { [type]: count } }` per bucket.
  // The chart primitive expects one TrendPoint per (date, series-key).
  // Flatten the per-bucket map into one row per series key, falling back
  // to a single 'total' series when the bucket carries no breakdown.
  const txnPoints = useMemo<ReadonlyArray<TrendPoint>>(() => {
    const buckets = txnByType.data?.points ?? [];
    const flat: TrendPoint[] = [];
    for (const bucket of buckets) {
      const series = bucket.series;
      if (!series) {
        flat.push({ date: bucket.date, value: bucket.total });
        continue;
      }
      const entries = Object.entries(series);
      if (entries.length === 0) {
        flat.push({ date: bucket.date, value: bucket.total });
        continue;
      }
      for (const [key, value] of entries) {
        flat.push({ date: bucket.date, series: humanizeStatus(key), value });
      }
    }
    return flat;
  }, [txnByType.data]);

  const allocStages = useMemo<ReadonlyArray<FunnelStageInput>>(
    () => (allocFunnel.data?.stages ?? []).map(toFunnelStage),
    [allocFunnel.data],
  );
  const dispStages = useMemo<ReadonlyArray<FunnelStageInput>>(
    () => (dispFunnel.data?.stages ?? []).map(toFunnelStage),
    [dispFunnel.data],
  );
  const lowItems = useMemo<ReadonlyArray<TopItem>>(
    () => (topLow.data?.items ?? []).map(toTopItem),
    [topLow.data],
  );

  return (
    <div
      className={`grid grid-cols-1 gap-4 md:grid-cols-2${className ? ` ${className}` : ''}`}
    >
      <StackedBarChart
        title="Transactions by type"
        description="Daily movement volume in selected window"
        height={220}
        data={txnPoints}
        isLoading={txnByType.isLoading}
        error={txnByType.error ? (txnByType.error as Error) : null}
        valueFormatter={(v) => fmt.number(v)}
        help={{
          summary:
            'Number of stock movements per day, broken down by movement type (purchase, allocation, dispatch, transfer, adjustment).',
          details: (
            <>
              <p>
                Each bar represents one day in the selected time window. The bar is split into
                colored segments — one per transaction type — so you can see the relative mix at
                a glance. Hover any segment to see the exact count.
              </p>
              <p className="mt-3">
                Use this to spot operational patterns: a tall purchase segment means stock came
                in, a tall dispatch segment means stock went out, and a spike in adjustments may
                indicate a stocktake.
              </p>
            </>
          ),
        }}
      />
      <FunnelChartReusable
        title="Allocation funnel"
        description="Allocated → partially dispatched → completed"
        height={220}
        stages={allocStages}
        isLoading={allocFunnel.isLoading}
        error={allocFunnel.error ? (allocFunnel.error as Error) : null}
        help={{
          summary:
            'How allocations created in the window progress through their lifecycle stages.',
          details: (
            <>
              <p>
                Each row is one allocation status; the width is proportional to the count. The
                percentage between two rows is the conversion rate from the upper status to the
                lower (e.g. how many allocations moved from <em>allocated</em> to{' '}
                <em>dispatched</em>).
              </p>
              <p className="mt-3">
                Cancelled allocations are shown separately on the dashboard; only active
                lifecycle stages appear here.
              </p>
            </>
          ),
        }}
      />
      <FunnelChartReusable
        title="Dispatch funnel"
        description="Prepared → in transit → delivered"
        height={220}
        stages={dispStages}
        isLoading={dispFunnel.isLoading}
        error={dispFunnel.error ? (dispFunnel.error as Error) : null}
        help={{
          summary:
            'How material dispatches progress from prepared to delivered in the selected window.',
          details: (
            <>
              <p>
                Each row corresponds to a dispatch status. The percentages between rows show the
                conversion rate from one stage to the next, helping you spot bottlenecks (e.g.
                large drop between <em>in transit</em> and <em>delivered</em> may indicate
                logistics delays).
              </p>
              <p className="mt-3">
                Cancelled dispatches are excluded from this view.
              </p>
            </>
          ),
        }}
      />
      <HorizontalBarChart
        title="Top low-stock items"
        description="Largest deficit vs minimum threshold (point-in-time)"
        height={220}
        data={lowItems}
        isLoading={topLow.isLoading}
        error={topLow.error ? (topLow.error as Error) : null}
        valueFormatter={(v) => fmt.number(v)}
        labelWidth={160}
        help={{
          summary:
            'Products whose available quantity is below their minimum stock level, ranked by deficit.',
          details: (
            <>
              <p>
                <strong>Deficit</strong> = minimum stock level − available quantity. Larger bars
                mean a bigger shortfall vs the level you configured to keep on hand.
              </p>
              <p className="mt-3">
                This is a point-in-time snapshot — it does not depend on the time window picker.
                Use it to decide which products to reorder first.
              </p>
            </>
          ),
        }}
      />
    </div>
  );
}

function humanizeStatus(value: string): string {
  return value
    .split('_')
    .map((part) => {
      const head = part.charAt(0);
      return head ? head.toUpperCase() + part.slice(1) : part;
    })
    .join(' ');
}

function toFunnelStage(stage: { status: string; count: number }, index: number): FunnelStageInput {
  return {
    id: stage.status || `stage-${index}`,
    label: humanizeStatus(stage.status),
    value: stage.count,
  };
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
