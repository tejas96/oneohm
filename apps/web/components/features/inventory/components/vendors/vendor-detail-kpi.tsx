'use client';

import * as React from 'react';
import { useMemo } from 'react';

import { useFmt } from '../dashboard/use-fmt';

import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import { usePurchaseOrders } from '@/lib/hooks/resources/purchase-orders';

/**
 * KPI tile row for the vendor detail page. Aggregates the vendor's
 * 100 most recent POs client-side: total count, total spend, last
 * order date, on-time-vs-late count.
 *
 * Why client-side: there is no `/vendors/:id/stats` endpoint yet
 * (backend follow-up). Sampling 100 POs covers the vast majority of
 * vendors; for high-volume vendors operators can drill into the
 * tab below for full pagination.
 *
 * "On-time" heuristic: a PO is on-time when it was received
 * (status='received') with `actualDeliveryDate` <= `expectedDeliveryDate`.
 * POs that haven't been received yet aren't counted in either
 * category — they simply contribute to "open".
 */

export interface VendorDetailKpiProps {
  vendorId: string;
}

export function VendorDetailKpi({ vendorId }: VendorDetailKpiProps): React.JSX.Element {
  const fmt = useFmt();

  const pos = usePurchaseOrders({
    defaultPageSize: 100,
    syncToUrl: false,
    defaultFilters: { vendorId } as Record<string, unknown>,
  });

  const stats = useMemo(() => {
    const items = pos.items ?? [];
    let totalSpend = 0;
    let openCount = 0;
    let receivedCount = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    let lastDate: string | null = null;
    for (const po of items) {
      totalSpend += Number(po.totalAmount ?? 0);
      const date = (po.poDate as string | undefined) ?? null;
      if (date && (!lastDate || date > lastDate)) lastDate = date;
      if (po.status === 'received') {
        receivedCount += 1;
        const expected = po.expectedDeliveryDate as string | undefined;
        const actual = po.actualDeliveryDate as string | undefined;
        if (expected && actual) {
          if (actual <= expected) onTimeCount += 1;
          else lateCount += 1;
        }
      } else if (po.status !== 'cancelled') {
        openCount += 1;
      }
    }
    const ratedCount = onTimeCount + lateCount;
    const onTimeRate = ratedCount > 0 ? (onTimeCount / ratedCount) * 100 : null;
    return {
      total: items.length,
      totalSpend,
      openCount,
      receivedCount,
      lastDate,
      onTimeRate,
      onTimeCount,
      lateCount,
    };
  }, [pos.items]);

  const formatDate = (iso: string | null): string => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  return (
    <KpiStripe
      tiles={[
        {
          id: 'v-pos',
          label: 'Purchase orders',
          value: fmt.number(stats.total),
          secondary: stats.total >= 100 ? 'showing latest 100' : 'all-time',
          isLoading: pos.isLoading,
        },
        {
          id: 'v-spend',
          label: 'Spend',
          value: fmt.currency(stats.totalSpend),
          secondary: 'sum across visible POs',
          isLoading: pos.isLoading,
        },
        {
          id: 'v-on-time',
          label: 'On-time delivery',
          value: stats.onTimeRate != null ? `${Math.round(stats.onTimeRate)}%` : '—',
          intent:
            stats.onTimeRate == null
              ? 'neutral'
              : stats.onTimeRate >= 90
                ? 'success'
                : stats.onTimeRate >= 70
                  ? 'warning'
                  : 'danger',
          secondary:
            stats.onTimeRate != null
              ? `${stats.onTimeCount}/${stats.onTimeCount + stats.lateCount} POs`
              : 'no received POs yet',
          isLoading: pos.isLoading,
        },
        {
          id: 'v-last-order',
          label: 'Last order',
          value: formatDate(stats.lastDate),
          secondary: `${stats.openCount} open`,
          isLoading: pos.isLoading,
        },
      ]}
    />
  );
}
