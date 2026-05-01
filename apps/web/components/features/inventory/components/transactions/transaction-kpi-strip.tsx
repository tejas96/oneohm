'use client';

import * as React from 'react';
import { useMemo } from 'react';

import { useFmt } from '../dashboard/use-fmt';

import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import { useInventoryTransactionStats } from '@/lib/hooks/resources/inventory-transactions';

interface TxStatRow {
  transactionType: string;
  count: string | number;
  totalQuantity?: string | number;
}

const POSITIVE_TYPES = new Set(['purchase', 'transfer_in', 'return']);
const NEGATIVE_TYPES = new Set(['dispatch', 'transfer_out']);

/**
 * KPI strip for the transactions ledger. Backend returns
 * `[{transactionType, count, totalQuantity}]` so we aggregate
 * client-side: total transactions, inward (purchase + transfer_in +
 * return), outward (dispatch + transfer_out), adjustments. Adjustments
 * get their own tile since their direction is ambiguous and they tend
 * to be the noisiest signal in the ledger.
 */
export function TransactionKpiStrip(): React.JSX.Element {
  const fmt = useFmt();
  const statsQuery = useInventoryTransactionStats();
  const rows = (statsQuery.stats ?? []) as TxStatRow[];

  const totals = useMemo(() => {
    let total = 0;
    let inwardCount = 0;
    let outwardCount = 0;
    let adjustmentCount = 0;
    for (const row of rows) {
      const c = Number(row.count ?? 0);
      total += c;
      if (POSITIVE_TYPES.has(row.transactionType)) inwardCount += c;
      else if (NEGATIVE_TYPES.has(row.transactionType)) outwardCount += c;
      else if (row.transactionType === 'adjustment') adjustmentCount += c;
    }
    return { total, inwardCount, outwardCount, adjustmentCount };
  }, [rows]);

  return (
    <KpiStripe
      tiles={[
        {
          id: 'tx-total',
          label: 'Total transactions',
          value: fmt.number(totals.total),
          secondary: 'all-time',
          isLoading: statsQuery.isLoading,
        },
        {
          id: 'tx-inward',
          label: 'Inward',
          value: fmt.number(totals.inwardCount),
          intent: 'success',
          secondary: 'purchase + transfer in + return',
          isLoading: statsQuery.isLoading,
        },
        {
          id: 'tx-outward',
          label: 'Outward',
          value: fmt.number(totals.outwardCount),
          intent: totals.outwardCount > 0 ? 'warning' : 'neutral',
          secondary: 'dispatch + transfer out',
          isLoading: statsQuery.isLoading,
        },
        {
          id: 'tx-adjustments',
          label: 'Adjustments',
          value: fmt.number(totals.adjustmentCount),
          secondary: 'manual changes',
          isLoading: statsQuery.isLoading,
        },
      ]}
    />
  );
}
