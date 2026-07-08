'use client';

import { useMemo } from 'react';

import { useOrgOutstanding, useOrgReceipts, type OutstandingTerm } from '@/lib/hooks/resources';

export interface PropertyFinanceSnapshot {
  totalOutstanding: number;
  openTermCount: number;
  lastReceiptDate: string | null;
  hasProject: boolean;
}

export interface UsePropertyFinanceSnapshotResult {
  snapshot: PropertyFinanceSnapshot;
  openTerms: OutstandingTerm[];
  isLoading: boolean;
  hasProject: boolean;
}

const EMPTY_SNAPSHOT: PropertyFinanceSnapshot = {
  totalOutstanding: 0,
  openTermCount: 0,
  lastReceiptDate: null,
  hasProject: false,
};

/**
 * Property-scoped finance data derived from the linked project's payment terms.
 * Returns zeros / empty when the property has no project — never customer-wide AR.
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
      projectId: projectId!,
      sort: 'daysOverdue',
      sortOrder: 'DESC',
      page: 1,
      limit: 100,
    },
    { enabled: queryEnabled },
  );

  const receiptsQ = useOrgReceipts(
    { projectId: projectId!, page: 1, limit: 20 },
    { enabled: queryEnabled },
  );

  const openTerms = outstandingQ.data?.data ?? [];

  const snapshot = useMemo((): PropertyFinanceSnapshot => {
    if (!hasProject) {
      return EMPTY_SNAPSHOT;
    }

    const totalOutstanding = openTerms.reduce((sum, term) => sum + term.outstandingAmount, 0);
    const receipts = receiptsQ.data?.data ?? [];
    const lastReceiptDate =
      receipts.length > 0
        ? receipts.reduce<string | null>((latest, receipt) => {
            if (!latest || receipt.createdAt > latest) {
              return receipt.createdAt;
            }
            return latest;
          }, null)
        : null;

    return {
      totalOutstanding,
      openTermCount: openTerms.length,
      lastReceiptDate,
      hasProject: true,
    };
  }, [hasProject, openTerms, receiptsQ.data?.data]);

  const isLoading = hasProject && (outstandingQ.isLoading || receiptsQ.isLoading);

  return { snapshot, openTerms, isLoading, hasProject };
}
