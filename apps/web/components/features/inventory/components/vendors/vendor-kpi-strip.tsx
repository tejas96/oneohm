'use client';

import * as React from 'react';

import { useFmt } from '../dashboard/use-fmt';
import { useVendorAggregates } from './use-vendor-aggregates';

import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import type { Vendor } from '@/lib/hooks/resources/vendors';

export interface VendorKpiStripProps {
  vendors: readonly Vendor[] | undefined;
  totalRows: number;
  isLoading?: boolean;
}

export function VendorKpiStrip({
  vendors,
  totalRows,
  isLoading,
}: VendorKpiStripProps): React.JSX.Element {
  const fmt = useFmt();
  const agg = useVendorAggregates(vendors);
  const showingAll = totalRows === agg.totalCount;

  return (
    <KpiStripe
      tiles={[
        {
          id: 'v-count',
          label: 'Vendors on page',
          value: fmt.number(agg.totalCount),
          secondary: showingAll
            ? `${fmt.number(totalRows)} total`
            : `of ${fmt.number(totalRows)} total`,
          isLoading,
        },
        {
          id: 'v-active',
          label: 'Active',
          value: fmt.number(agg.activeCount),
          secondary: agg.totalCount
            ? `${Math.round((agg.activeCount / agg.totalCount) * 100)}% of page`
            : '—',
          isLoading,
        },
        {
          id: 'v-avg-rating',
          label: 'Avg rating',
          value:
            agg.averageRating != null ? agg.averageRating.toFixed(1) : '—',
          secondary: `${fmt.number(agg.ratedCount)} rated`,
          isLoading,
        },
        {
          id: 'v-blacklisted',
          label: 'Blacklisted',
          value: fmt.number(agg.blacklistedCount),
          intent: agg.blacklistedCount > 0 ? 'warning' : 'neutral',
          secondary: 'flagged on page',
          isLoading,
        },
      ]}
    />
  );
}

VendorKpiStrip.displayName = 'VendorKpiStrip';
