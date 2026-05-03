'use client';

import * as React from 'react';

import { useFmt } from '../dashboard/use-fmt';

import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import { usePurchaseOrderStats } from '@/lib/hooks/resources/purchase-orders';

/**
 * KPI strip at the top of the PO list. Pulls org-wide totals
 * (`/purchase-orders/stats/summary`) so the operator sees the *true*
 * shape of the queue, not just the visible page. This contrasts with
 * the stock list strip (page-scoped) because PO operators usually
 * need awareness of approvals + overdue across the org, not just
 * their current filter slice.
 *
 * Tiles: total POs, pending approvals, overdue, received.
 */

export function PoKpiStrip(): React.JSX.Element {
  const fmt = useFmt();
  const statsQuery = usePurchaseOrderStats();

  const data = statsQuery.stats as
    | {
        total?: number;
        pendingApprovals?: number;
        overdueCount?: number;
        byStatus?: Record<string, number>;
      }
    | undefined;

  const total = data?.total ?? 0;
  const pendingApprovals = data?.pendingApprovals ?? 0;
  const overdueCount = data?.overdueCount ?? 0;
  const received = data?.byStatus?.received ?? 0;

  return (
    <KpiStripe
      tiles={[
        {
          id: 'po-total',
          label: 'Total POs',
          value: fmt.number(total),
          secondary: 'all-time, all statuses',
          isLoading: statsQuery.isLoading,
        },
        {
          id: 'po-pending',
          label: 'Pending approvals',
          value: fmt.number(pendingApprovals),
          intent: pendingApprovals > 0 ? 'warning' : 'neutral',
          secondary: 'awaiting approver action',
          isLoading: statsQuery.isLoading,
        },
        {
          id: 'po-overdue',
          label: 'Overdue',
          value: fmt.number(overdueCount),
          intent: overdueCount > 0 ? 'danger' : 'neutral',
          secondary: 'past expected delivery',
          isLoading: statsQuery.isLoading,
        },
        {
          id: 'po-received',
          label: 'Received',
          value: fmt.number(received),
          secondary: 'fully received',
          isLoading: statsQuery.isLoading,
        },
      ]}
    />
  );
}
