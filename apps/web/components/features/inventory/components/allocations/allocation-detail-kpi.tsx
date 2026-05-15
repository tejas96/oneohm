'use client';

import * as React from 'react';
import { useMemo } from 'react';

import { useFmt } from '../dashboard/use-fmt';

import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import { ProgressBarCell } from '@/components/shared/inventory/progress-bar-cell';
import type { StockAllocation } from '@/lib/hooks/resources/stock-allocations';

export interface AllocationDetailKpiProps {
  allocation: StockAllocation;
}

/**
 * KPI tile row + buffer card for the allocation detail page. Tiles
 * mirror the lifecycle: allocated, dispatched, returned, remaining.
 * The progress card visualises dispatched/allocated as a single bar
 * underneath, intent-coloured so a glance reveals fulfilment state.
 */
export function AllocationDetailKpi({ allocation }: AllocationDetailKpiProps): React.JSX.Element {
  const fmt = useFmt();

  const stats = useMemo(() => {
    const allocated = Number(allocation.allocatedQuantity ?? 0);
    const dispatched = Number(allocation.dispatchedQuantity ?? 0);
    const returned = Number(allocation.returnedQuantity ?? 0);
    // Net dispatched accounts for items returned to stock; remaining reflects
    // what still needs to physically reach the project site.
    const netDispatched = Math.max(0, dispatched - returned);
    const remaining = Math.max(0, allocated - netDispatched);
    const pct = allocated > 0 ? (netDispatched / allocated) * 100 : 0;
    return { allocated, dispatched, returned, netDispatched, remaining, pct };
  }, [allocation]);

  const intent: 'success' | 'warning' | 'info' =
    stats.remaining === 0 && stats.allocated > 0
      ? 'success'
      : stats.returned > 0
        ? 'warning'
        : 'info';

  const unit = allocation.product?.unit ?? '';

  return (
    <div className="flex flex-col gap-3">
      <KpiStripe
        tiles={[
          {
            id: 'al-allocated',
            label: 'Allocated',
            value: `${fmt.number(stats.allocated)}${unit ? ` ${unit}` : ''}`,
            secondary: 'reserved for this project',
          },
          {
            id: 'al-dispatched',
            label: 'Dispatched',
            value: `${fmt.number(stats.dispatched)}${unit ? ` ${unit}` : ''}`,
            secondary: 'sent to project',
          },
          {
            id: 'al-remaining',
            label: 'Remaining',
            value: `${fmt.number(stats.remaining)}${unit ? ` ${unit}` : ''}`,
            intent: stats.remaining > 0 ? 'warning' : 'success',
            secondary: stats.remaining > 0 ? 'still to dispatch' : 'fully dispatched',
          },
          {
            id: 'al-returned',
            label: 'Returned',
            value: `${fmt.number(stats.returned)}${unit ? ` ${unit}` : ''}`,
            intent: stats.returned > 0 ? 'warning' : 'neutral',
            secondary: 'returned to stock',
          },
        ]}
      />
      <div className="rounded-lg border border-border-light bg-background p-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
          Fulfilment progress
        </div>
        {stats.allocated > 0 ? (
          <ProgressBarCell
            numerator={stats.netDispatched}
            denominator={stats.allocated}
            label={`${fmt.number(stats.netDispatched)} / ${fmt.number(stats.allocated)}${unit ? ` ${unit}` : ''} at site`}
            intent={intent}
          />
        ) : (
          <div className="text-sm text-foreground-tertiary">No quantity allocated.</div>
        )}
      </div>
    </div>
  );
}
