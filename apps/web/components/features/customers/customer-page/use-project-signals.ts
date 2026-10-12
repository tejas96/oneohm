'use client';

import { useQueries } from '@tanstack/react-query';
import { ProjectStatus } from '@tejas96/shared/types';
import { useMemo } from 'react';

import type { CustomerProjectItem } from '../hooks';
import type { AttentionProject } from './build-attention';

import { projectAttentionQuery } from '@/components/features/projects/hooks/use-project-attention';
import { paymentApprovalsQuery } from '@/lib/hooks/resources/payment-approvals';

/**
 * What each live project of the customer flags on its own page, and the
 * receipts recorded for it that nobody has approved yet.
 *
 * A customer has one project per site, so this is one or two requests each —
 * and the same ones the Project and Money cards make, so the cache serves both.
 */
export function useProjectSignals(
  projects: CustomerProjectItem[] | undefined,
  options: { finance: boolean },
): {
  projects: AttentionProject[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const live = useMemo(
    () => (projects ?? []).filter((project) => project.status !== ProjectStatus.CANCELLED),
    [projects],
  );

  const attention = useQueries({
    queries: live.map((project) => projectAttentionQuery(project.id)),
  });
  const approvals = useQueries({
    queries: live.map((project) => ({
      ...paymentApprovalsQuery({
        status: 'pending',
        kind: 'receipt',
        projectId: project.id,
        limit: 50,
      }),
      enabled: options.finance,
    })),
  });

  const isLoading =
    attention.some((query) => query.isLoading) || approvals.some((query) => query.isLoading);
  // The data arrays are new on every render; their contents are what matter.
  const attentionData = attention.map((query) => query.data);
  const approvalsData = approvals.map((query) => query.data);
  const stamp = JSON.stringify([
    // The severity too: a task can go from warning to critical under the same id.
    attentionData.map((items) => items?.map((item) => [item.id, item.severity])),
    approvalsData.map((page) => page?.data.map((row) => [row.id, row.amountPaise])),
  ]);

  const signals = useMemo(
    () =>
      projects === undefined
        ? undefined
        : live.map((project, index): AttentionProject => {
            const pending = approvalsData[index]?.data ?? [];
            return {
              id: project.id,
              propertyId: project.propertyId,
              status: project.status,
              items: attentionData[index] ?? [],
              pendingApprovals: {
                count: pending.length,
                amountPaise: pending.reduce((sum, row) => sum + row.amountPaise, 0),
              },
            };
          }),

    [projects, live, stamp],
  );

  const isError =
    attention.some((query) => query.isError) || approvals.some((query) => query.isError);
  const refetch = (): void => {
    for (const query of [...attention, ...approvals]) if (query.isError) void query.refetch();
  };

  return { projects: signals, isLoading, isError, refetch };
}
