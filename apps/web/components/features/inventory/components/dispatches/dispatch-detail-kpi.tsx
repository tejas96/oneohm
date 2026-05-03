'use client';

import * as React from 'react';
import { useMemo } from 'react';

import { useFmt } from '../dashboard/use-fmt';

import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import type { MaterialDispatch } from '@/lib/hooks/resources/material-dispatches';
import { formatDate } from '@/lib/utils';

export interface DispatchDetailKpiProps {
  dispatch: MaterialDispatch;
}

/**
 * KPI strip for the dispatch detail page. Tiles:
 * - Items: count + total quantity (sum of line `quantity`).
 * - Dispatched on: dispatchDate.
 * - Expected: expectedDeliveryDate (overdue intent if past + open).
 * - Actual / status: actualDeliveryDate when present, else "Pending".
 */
export function DispatchDetailKpi({ dispatch }: DispatchDetailKpiProps): React.JSX.Element {
  const fmt = useFmt();

  const totals = useMemo(() => {
    const items = dispatch.items ?? [];
    const totalQty = items.reduce(
      (sum, it) => sum + (Number(it.quantity ?? it.dispatchedQuantity ?? 0) || 0),
      0,
    );
    return { count: items.length, totalQty };
  }, [dispatch.items]);

  const expected = dispatch.expectedDeliveryDate ?? dispatch.deliveryDate ?? null;
  const expectedOverdue =
    expected &&
    new Date(expected).getTime() < Date.now() &&
    dispatch.status !== 'delivered' &&
    dispatch.status !== 'cancelled';

  const actualLabel = dispatch.actualDeliveryDate
    ? formatDate(dispatch.actualDeliveryDate)
    : dispatch.status === 'cancelled'
      ? 'Cancelled'
      : 'Pending';

  return (
    <KpiStripe
      tiles={[
        {
          id: 'di-items',
          label: 'Line items',
          value: fmt.number(totals.count),
          secondary: `${fmt.number(totals.totalQty)} total qty`,
        },
        {
          id: 'di-dispatched',
          label: 'Dispatched on',
          value: dispatch.dispatchDate ? formatDate(dispatch.dispatchDate) : '—',
          secondary: dispatch.vehicleNumber ? `Vehicle ${dispatch.vehicleNumber}` : 'No vehicle',
        },
        {
          id: 'di-expected',
          label: 'Expected delivery',
          value: expected ? formatDate(expected) : '—',
          intent: expectedOverdue ? 'danger' : 'neutral',
          secondary: expectedOverdue ? 'overdue' : '—',
        },
        {
          id: 'di-actual',
          label: 'Actual delivery',
          value: actualLabel,
          intent: dispatch.actualDeliveryDate ? 'success' : 'neutral',
          secondary: dispatch.actualDeliveryDate ? 'delivered' : 'awaiting confirmation',
        },
      ]}
    />
  );
}
