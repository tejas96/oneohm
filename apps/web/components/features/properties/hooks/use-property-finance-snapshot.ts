'use client';

import { useMemo } from 'react';

import { useOrgOutstanding, type OutstandingTerm } from '@/lib/hooks/resources';
import {
  useProjectEntries,
  useProjectLedger,
  type LedgerEntry,
} from '@/lib/hooks/resources/ledger';

/** Open-term query cap; callers surface a note when the cap bites. */
const PROPERTY_FINANCE_PAGE_LIMIT = 100;

interface PropertyFinanceSnapshot {
  totalOutstanding: number;
  overdueAmount: number;
  maxDaysOverdue: number;
  /** Total received from ledger summary (rupees). */
  receivedAmount: number;
  /**
   * The contract as it stands, and the part of it agreed after signing
   * (rupees). The quote keeps its own price; billing for material added on site
   * moves the CONTRACT and never the quote.
   */
  contractAmount: number;
  changeOrderAmount: number;
  /** Written off on waived terms: the unpaid remainder, as the ledger reports it. */
  waivedAmount: number;
  /** Terms called off when the project was cancelled. */
  cancelledAmount: number;
  /** Money handed back to the payer. */
  refundedAmount: number;
}

export interface UsePropertyFinanceSnapshotResult {
  snapshot: PropertyFinanceSnapshot;
  openTerms: OutstandingTerm[];
  receipts: LedgerEntry[];
  /** True when the open-term list hit `PROPERTY_FINANCE_PAGE_LIMIT`. */
  isTruncated: boolean;
  isLoading: boolean;
  /** A read failed: the figures are not known, and must not be shown as zero. */
  isError: boolean;
  refetch: () => void;
}

const EMPTY_SNAPSHOT: PropertyFinanceSnapshot = {
  totalOutstanding: 0,
  overdueAmount: 0,
  maxDaysOverdue: 0,
  receivedAmount: 0,
  contractAmount: 0,
  changeOrderAmount: 0,
  waivedAmount: 0,
  cancelledAmount: 0,
  refundedAmount: 0,
};

const EMPTY_TERMS: OutstandingTerm[] = [];
const EMPTY_ENTRIES: LedgerEntry[] = [];

function isReceiptEntry(entry: LedgerEntry): boolean {
  return entry.entryType === 'receipt' && entry.direction === 'in';
}

/**
 * Property-scoped finance from the project ledger (not legacy payments).
 * Returns zeros when the property has no project.
 */
export function usePropertyFinanceSnapshot(
  projectId: string | undefined | null,
  options?: { enabled?: boolean },
): UsePropertyFinanceSnapshotResult {
  const baseEnabled = options?.enabled !== false;
  const hasProject = Boolean(projectId);
  const queryEnabled = baseEnabled && hasProject;

  // Ordered by days overdue, descending — the endpoint's fixed ordering.
  const outstandingQ = useOrgOutstanding(
    {
      projectId: projectId ?? undefined,
      page: 1,
      limit: PROPERTY_FINANCE_PAGE_LIMIT,
    },
    { enabled: queryEnabled },
  );

  const ledgerQ = useProjectLedger(projectId ?? '', { enabled: queryEnabled });
  const entriesQ = useProjectEntries(projectId ?? '', { enabled: queryEnabled });

  const openTerms = outstandingQ.data?.data ?? EMPTY_TERMS;
  const allEntries = entriesQ.data ?? EMPTY_ENTRIES;
  const receipts = useMemo(() => allEntries.filter(isReceiptEntry), [allEntries]);

  const snapshot = useMemo((): PropertyFinanceSnapshot => {
    if (!hasProject) return EMPTY_SNAPSHOT;

    let totalOutstanding = 0;
    let overdueAmount = 0;
    let maxDaysOverdue = 0;
    for (const term of openTerms) {
      const amount = Number(term.outstandingAmount);
      const days = term.daysOverdue ?? 0;
      totalOutstanding += amount;
      if (days > 0) {
        overdueAmount += amount;
        maxDaysOverdue = Math.max(maxDaysOverdue, days);
      }
    }

    const ledger = ledgerQ.data;
    return {
      totalOutstanding,
      overdueAmount,
      maxDaysOverdue,
      receivedAmount: ledger ? ledger.receivedPaise / 100 : 0,
      contractAmount: ledger ? ledger.contractPaise / 100 : 0,
      changeOrderAmount: ledger ? ledger.changeOrderPaise / 100 : 0,
      waivedAmount: ledger ? ledger.waivedPaise / 100 : 0,
      cancelledAmount: ledger ? (ledger.cancelledPaise ?? 0) / 100 : 0,
      refundedAmount: ledger ? ledger.refundedPaise / 100 : 0,
    };
  }, [hasProject, openTerms, ledgerQ.data]);

  const isLoading =
    hasProject && (outstandingQ.isLoading || ledgerQ.isLoading || entriesQ.isLoading);
  const isTruncated = openTerms.length >= PROPERTY_FINANCE_PAGE_LIMIT;

  const isError = hasProject && (outstandingQ.isError || ledgerQ.isError || entriesQ.isError);
  const refetch = (): void => {
    void outstandingQ.refetch();
    void ledgerQ.refetch();
    void entriesQ.refetch();
  };

  return { snapshot, openTerms, receipts, isTruncated, isLoading, isError, refetch };
}
