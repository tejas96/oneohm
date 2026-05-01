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
}

export function DashboardOpsSection({ statsWindow }: DashboardOpsSectionProps): React.JSX.Element {
  const fmt = useFmt();

  const txnByType = useTransactionsByTypeTrend({ window: statsWindow, bucket: 'day' });
  const allocFunnel = useAllocationFunnel({ window: statsWindow });
  const dispFunnel = useDispatchFunnel({ window: statsWindow });
  const topLow = useTopLowStock({ limit: 10 });

  const txnPoints = useMemo<ReadonlyArray<TrendPoint>>(
    () => txnByType.data?.points ?? [],
    [txnByType.data],
  );
  const allocStages = useMemo<ReadonlyArray<FunnelStageInput>>(
    () => allocFunnel.data?.stages ?? [],
    [allocFunnel.data],
  );
  const dispStages = useMemo<ReadonlyArray<FunnelStageInput>>(
    () => dispFunnel.data?.stages ?? [],
    [dispFunnel.data],
  );
  const lowItems = useMemo<ReadonlyArray<TopItem>>(
    () => topLow.data?.items ?? [],
    [topLow.data],
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <StackedBarChart
        title="Transactions by type"
        description="Daily volume across receive, adjust, transfer, deplete"
        height={260}
        data={txnPoints}
        isLoading={txnByType.isLoading}
        error={txnByType.error ? (txnByType.error as Error) : null}
        valueFormatter={(v) => fmt.number(v)}
      />
      <FunnelChartReusable
        title="Allocation funnel"
        description="Drafted → reserved → consumed in selected window"
        height={260}
        stages={allocStages}
        isLoading={allocFunnel.isLoading}
        error={allocFunnel.error ? (allocFunnel.error as Error) : null}
      />
      <FunnelChartReusable
        title="Dispatch funnel"
        description="Created → picked → in transit → delivered"
        height={260}
        stages={dispStages}
        isLoading={dispFunnel.isLoading}
        error={dispFunnel.error ? (dispFunnel.error as Error) : null}
      />
      <HorizontalBarChart
        title="Top low-stock items"
        description="Largest deficit vs minimum threshold (point-in-time)"
        height={260}
        data={lowItems}
        isLoading={topLow.isLoading}
        error={topLow.error ? (topLow.error as Error) : null}
        valueFormatter={(v) => fmt.number(v)}
        labelWidth={150}
      />
    </div>
  );
}
