'use client';

import * as React from 'react';
import { useMemo } from 'react';

import { useFmt } from '../dashboard/use-fmt';

import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import type { PurchaseOrder } from '@/lib/hooks/resources/purchase-orders';

export interface PoDetailKpiProps {
  po: PurchaseOrder;
}

/**
 * KPI tile row for the PO detail page. All values come from the PO
 * itself + its line items, so no extra fetches.
 *
 * Tiles:
 *   1. Total amount    — totalAmount.
 *   2. Outstanding     — outstandingAmount (or totalAmount - paidAmount fallback).
 *   3. Receive %       — sum(receivedQty) / sum(orderedQty) across items.
 *   4. Days remaining  — until expectedDeliveryDate; negative => overdue, positive => on-track.
 */
export function PoDetailKpi({ po }: PoDetailKpiProps): React.JSX.Element {
  const fmt = useFmt();

  const stats = useMemo(() => {
    const totalAmount = Number(po.totalAmount ?? 0);
    const paidAmount = Number(po.paidAmount ?? 0);
    const outstanding = Number(po.outstandingAmount ?? totalAmount - paidAmount);

    let ordered = 0;
    let received = 0;
    for (const i of po.items ?? []) {
      ordered += Number(i.orderedQuantity ?? 0);
      received += Number(i.receivedQuantity ?? 0);
    }
    const receivePct = ordered > 0 ? (received / ordered) * 100 : null;

    let daysRemaining: number | null = null;
    if (po.expectedDeliveryDate) {
      const target = new Date(po.expectedDeliveryDate).getTime();
      const now = Date.now();
      daysRemaining = Math.round((target - now) / (1000 * 60 * 60 * 24));
    }

    return { totalAmount, outstanding, paidAmount, receivePct, daysRemaining };
  }, [po]);

  const isReceived = po.status === 'received';
  const isCancelled = po.status === 'cancelled';

  return (
    <KpiStripe
      tiles={[
        {
          id: 'po-total',
          label: 'Total',
          value: fmt.currency(stats.totalAmount),
          secondary: `incl. ₹${fmt.number(Number(po.taxAmount ?? 0))} tax`,
        },
        {
          id: 'po-outstanding',
          label: 'Outstanding',
          value: fmt.currency(stats.outstanding),
          intent: stats.outstanding > 0 ? 'warning' : 'success',
          secondary:
            stats.paidAmount > 0 ? `${fmt.currency(stats.paidAmount)} paid` : 'no payments yet',
        },
        {
          id: 'po-receive',
          label: 'Receive progress',
          value: stats.receivePct != null ? `${Math.round(stats.receivePct)}%` : '—',
          intent:
            stats.receivePct == null
              ? 'neutral'
              : stats.receivePct >= 100
                ? 'success'
                : stats.receivePct >= 50
                  ? 'info'
                  : 'neutral',
          secondary: 'received vs ordered units',
        },
        {
          id: 'po-days',
          label: isReceived ? 'Delivered' : isCancelled ? 'Cancelled' : 'Days remaining',
          value:
            isReceived || isCancelled
              ? '—'
              : stats.daysRemaining == null
                ? '—'
                : stats.daysRemaining < 0
                  ? `${Math.abs(stats.daysRemaining)}d overdue`
                  : `${stats.daysRemaining}d`,
          intent:
            isReceived || isCancelled
              ? 'neutral'
              : stats.daysRemaining != null && stats.daysRemaining < 0
                ? 'danger'
                : stats.daysRemaining != null && stats.daysRemaining < 3
                  ? 'warning'
                  : 'neutral',
          secondary: po.expectedDeliveryDate
            ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
              })
            : 'no expected date',
        },
      ]}
    />
  );
}
