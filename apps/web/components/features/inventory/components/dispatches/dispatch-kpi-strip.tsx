'use client';

import * as React from 'react';

import { useFmt } from '../dashboard/use-fmt';

import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import { useMaterialDispatchStats } from '@/lib/hooks/resources/material-dispatches';

/**
 * KPI strip for the dispatches list. Tile selection mirrors the
 * dispatch lifecycle: total → in transit (prepared + dispatched +
 * in_transit, the operational queue) → delivered → cancelled.
 */
export function DispatchKpiStrip(): React.JSX.Element {
  const fmt = useFmt();
  const statsQuery = useMaterialDispatchStats();
  const data = statsQuery.stats as
    | { total?: number; byStatus?: Record<string, number> }
    | undefined;

  const total = data?.total ?? 0;
  const inTransit =
    (data?.byStatus?.prepared ?? 0) +
    (data?.byStatus?.dispatched ?? 0) +
    (data?.byStatus?.in_transit ?? 0);
  const delivered =
    (data?.byStatus?.delivered ?? 0) + (data?.byStatus?.partially_delivered ?? 0);
  const cancelled = data?.byStatus?.cancelled ?? 0;

  return (
    <KpiStripe
      tiles={[
        {
          id: 'd-total',
          label: 'Total dispatches',
          value: fmt.number(total),
          secondary: 'all-time',
          isLoading: statsQuery.isLoading,
        },
        {
          id: 'd-transit',
          label: 'In transit',
          value: fmt.number(inTransit),
          intent: inTransit > 0 ? 'warning' : 'neutral',
          secondary: 'prepared + dispatched',
          isLoading: statsQuery.isLoading,
        },
        {
          id: 'd-delivered',
          label: 'Delivered',
          value: fmt.number(delivered),
          secondary: 'including partials',
          isLoading: statsQuery.isLoading,
        },
        {
          id: 'd-cancelled',
          label: 'Cancelled',
          value: fmt.number(cancelled),
          secondary: total ? `${Math.round((cancelled / total) * 100)}% of all` : '—',
          isLoading: statsQuery.isLoading,
        },
      ]}
    />
  );
}
