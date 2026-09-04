'use client';

import { useMemo } from 'react';

import { useOrgOutstanding, type OutstandingTerm } from '@/lib/hooks/resources';
import {
  useProjectEntries,
  useProjectLedger,
  type LedgerEntry,
} from '@/lib/hooks/resources/ledger';

/** Open-term query cap; callers surface a note when the cap bites. */
export const PROPERTY_FINANCE_PAGE_LIMIT = 100;

export interface PropertyFinanceSnapshot {
  totalOutstanding: number;
  overdueAmount: number;
  maxDaysOverdue: number;
  openTermCount: number;
  /** Total received from ledger summary (rupees). */
  receivedAmount: number;
  /** Most recent received date (YYYY-MM-DD), not record date. */
  lastReceiptDate: string | null;
  /**
   * The contract as it stands, and its split (rupees).
   *
   * The page's "Quote value" tile shows the quote's own price, which is right —
   * it is the document the customer signed. But billing for material added on
   * site moves the CONTRACT and never the quote, so without these the page had
   * no way to say the two had diverged, and reported a figure the project's own
   * Money tab contradicted.
   */
  contractAmount: number;
  changeOrderAmount: number;
  hasProject: boolean;
}

export interface UsePropertyFinanceSnapshotResult {
  snapshot: PropertyFinanceSnapshot;
  openTerms: OutstandingTerm[];
  receipts: LedgerEntry[];
  /** True when the open-term list hit `PROPERTY_FINANCE_PAGE_LIMIT`. */
  isTruncated: boolean;
  isLoading: boolean;
  hasProject: boolean;
}

const EMPTY_SNAPSHOT: PropertyFinanceSnapshot = {
  totalOutstanding: 0,
  overdueAmount: 0,
  maxDaysOverdue: 0,
  openTermCount: 0,
  receivedAmount: 0,
  lastReceiptDate: null,
  contractAmount: 0,
  changeOrderAmount: 0,
  hasProject: false,
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
    const receivedAmount = ledger ? ledger.receivedPaise / 100 : 0;

    let lastReceiptDate: string | null = null;
    for (const entry of receipts) {
      if (entry.reversesId) continue;
      if (!lastReceiptDate || entry.valueDate > lastReceiptDate) {
        lastReceiptDate = entry.valueDate;
      }
    }

    return {
      totalOutstanding,
      overdueAmount,
      maxDaysOverdue,
      openTermCount: openTerms.length,
      receivedAmount,
      lastReceiptDate,
      contractAmount: ledger ? ledger.contractPaise / 100 : 0,
      changeOrderAmount: ledger ? ledger.changeOrderPaise / 100 : 0,
      hasProject: true,
    };
  }, [hasProject, openTerms, ledgerQ.data, receipts]);

  const isLoading =
    hasProject && (outstandingQ.isLoading || ledgerQ.isLoading || entriesQ.isLoading);
  const isTruncated = openTerms.length >= PROPERTY_FINANCE_PAGE_LIMIT;

  return { snapshot, openTerms, receipts, isTruncated, isLoading, hasProject };
}
