'use client';

import { PaymentTransactionStatus } from '@tejas96/shared/types';
import { useMemo } from 'react';

import {
  useOrgOutstanding,
  useOrgReceipts,
  type OrgReceiptListItem,
  type OutstandingTerm,
} from '@/lib/hooks/resources';

/**
 * Payment states that mean the money actually arrived.
 *
 * Mirrors the `status IN ('received','verified','cleared')` filter the AR
 * report applies. The receipts endpoint applies no status filter at all, so
 * its rows include pending, bounced and refunded payments — money that is not
 * in the bank. Summing them, or reading the newest one as "last receipt",
 * reports a bounced cheque as a payment.
 */
const SETTLED_PAYMENT_STATUSES: readonly PaymentTransactionStatus[] = [
  PaymentTransactionStatus.RECEIVED,
  PaymentTransactionStatus.VERIFIED,
  PaymentTransactionStatus.CLEARED,
];

export function isSettledPayment(status: PaymentTransactionStatus): boolean {
  return SETTLED_PAYMENT_STATUSES.includes(status);
}

/** Both queries are capped here; callers surface a note when the cap bites. */
export const PROPERTY_FINANCE_PAGE_LIMIT = 100;

export interface PropertyFinanceSnapshot {
  totalOutstanding: number;
  /**
   * The part of `totalOutstanding` that is actually past its due date.
   *
   * Kept separate because the two are usually different: a project can owe
   * ₹33,815 across three terms of which only ₹15,000 is late. `daysOverdue` is
   * null for terms with no due date and negative for terms not yet due, so
   * only strictly-positive values count.
   */
  overdueAmount: number;
  maxDaysOverdue: number;
  openTermCount: number;
  /** Sum of settled receipts against this project. */
  receivedAmount: number;
  lastReceiptDate: string | null;
  hasProject: boolean;
}

export interface UsePropertyFinanceSnapshotResult {
  snapshot: PropertyFinanceSnapshot;
  openTerms: OutstandingTerm[];
  receipts: OrgReceiptListItem[];
  /** True when either list hit `PROPERTY_FINANCE_PAGE_LIMIT`. */
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
  hasProject: false,
};

const EMPTY_TERMS: OutstandingTerm[] = [];
const EMPTY_RECEIPTS: OrgReceiptListItem[] = [];

/**
 * Property-scoped finance, derived from the linked project's payment terms.
 * Returns zeros when the property has no project — never customer-wide AR,
 * which would attribute a sibling site's debt to this one.
 */
export function usePropertyFinanceSnapshot(
  projectId: string | undefined | null,
  options?: { enabled?: boolean },
): UsePropertyFinanceSnapshotResult {
  const baseEnabled = options?.enabled !== false;
  const hasProject = Boolean(projectId);
  const queryEnabled = baseEnabled && hasProject;

  const outstandingQ = useOrgOutstanding(
    {
      projectId: projectId ?? undefined,
      sort: 'daysOverdue',
      sortOrder: 'DESC',
      page: 1,
      limit: PROPERTY_FINANCE_PAGE_LIMIT,
    },
    { enabled: queryEnabled },
  );

  const receiptsQ = useOrgReceipts(
    { projectId: projectId ?? undefined, page: 1, limit: PROPERTY_FINANCE_PAGE_LIMIT },
    { enabled: queryEnabled },
  );

  const openTerms = outstandingQ.data?.data ?? EMPTY_TERMS;
  const receipts = receiptsQ.data?.data ?? EMPTY_RECEIPTS;

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

    let receivedAmount = 0;
    let lastReceiptDate: string | null = null;
    for (const receipt of receipts) {
      if (!isSettledPayment(receipt.status)) continue;
      receivedAmount += Number(receipt.paidAmount);
      if (!lastReceiptDate || receipt.createdAt > lastReceiptDate) {
        lastReceiptDate = receipt.createdAt;
      }
    }

    return {
      totalOutstanding,
      overdueAmount,
      maxDaysOverdue,
      openTermCount: openTerms.length,
      receivedAmount,
      lastReceiptDate,
      hasProject: true,
    };
  }, [hasProject, openTerms, receipts]);

  const isLoading = hasProject && (outstandingQ.isLoading || receiptsQ.isLoading);
  const isTruncated =
    openTerms.length >= PROPERTY_FINANCE_PAGE_LIMIT ||
    receipts.length >= PROPERTY_FINANCE_PAGE_LIMIT;

  return { snapshot, openTerms, receipts, isTruncated, isLoading, hasProject };
}
