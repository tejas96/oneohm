'use client';

import * as React from 'react';

import { useFmt } from '../dashboard/use-fmt';

import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import { useStockAllocationStats } from '@/lib/hooks/resources/stock-allocations';

/**
 * KPI strip for the allocations list. Org-wide totals via
 * `/stock-allocations/stats/summary`. Tiles align with the lifecycle:
 * total → outstanding (allocated + partially_dispatched, the actionable
 * queue) → dispatched/completed → cancelled.
 */
export function AllocationKpiStrip(): React.JSX.Element {
  const fmt = useFmt();
  const statsQuery = useStockAllocationStats();
  const data = statsQuery.stats as
    | { total?: number; byStatus?: Record<string, number> }
    | undefined;

  const total = data?.total ?? 0;
  const outstanding =
    (data?.byStatus?.allocated ?? 0) + (data?.byStatus?.partially_dispatched ?? 0);
  const completed = (data?.byStatus?.dispatched ?? 0) + (data?.byStatus?.completed ?? 0);
  const cancelled = data?.byStatus?.cancelled ?? 0;

  return (
    <KpiStripe
      tiles={[
        {
          id: 'a-total',
          label: 'Total allocations',
          value: fmt.number(total),
          secondary: 'all-time',
          isLoading: statsQuery.isLoading,
        },
        {
          id: 'a-outstanding',
          label: 'Outstanding',
          value: fmt.number(outstanding),
          intent: outstanding > 0 ? 'warning' : 'neutral',
          secondary: 'allocated + partial',
          isLoading: statsQuery.isLoading,
        },
        {
          id: 'a-completed',
          label: 'Completed',
          value: fmt.number(completed),
          secondary: 'dispatched + completed',
          isLoading: statsQuery.isLoading,
        },
        {
          id: 'a-cancelled',
          label: 'Cancelled',
          value: fmt.number(cancelled),
          secondary: total ? `${Math.round((cancelled / total) * 100)}% of all` : '—',
          isLoading: statsQuery.isLoading,
        },
      ]}
    />
  );
}
