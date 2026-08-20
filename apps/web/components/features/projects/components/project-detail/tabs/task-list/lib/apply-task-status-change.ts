'use client';

import type { QueryClient } from '@tanstack/react-query';
import { isFinalTaskStatus } from '@tejas96/shared/constants';

import { PROJECT_TASKS_QUERY_KEY } from '../../../../../constants';

interface CacheSnapshot {
  key: readonly unknown[];
  data: unknown;
}

/** Returns the resolved payload without firing mutate.
 *  Used by the board DnD hook which manages its own mutation lifecycle. */
export function resolveTaskStatusPayload(
  newStatus: string,
  currentCompletionPct: number,
): { completionPercentage?: number } {
  const completionPercentage =
    !isFinalTaskStatus(newStatus) && currentCompletionPct === 100 ? 0 : undefined;
  return { completionPercentage };
}

/** Snapshot helper — used by the board DnD hook before the optimistic patch. */
export function snapshotProjectTasksCaches(queryClient: QueryClient): CacheSnapshot[] {
  const snapshots: CacheSnapshot[] = [];
  queryClient
    .getQueryCache()
    .findAll({ queryKey: PROJECT_TASKS_QUERY_KEY() })
    .forEach((q) => {
      snapshots.push({ key: q.queryKey, data: q.state.data });
    });
  return snapshots;
}

/** Restore snapshots previously captured with snapshotProjectTasksCaches. */
export function restoreProjectTasksCaches(
  queryClient: QueryClient,
  snapshots: CacheSnapshot[],
): void {
  snapshots.forEach(({ key, data }) => {
    queryClient.setQueryData(key, data);
  });
}

/** Optimistically move a task to a new status in all matching cache entries. */
export function optimisticallyMoveTaskStatus(
  queryClient: QueryClient,
  taskId: string,
  newStatus: string,
  newCompletionPct?: number,
): void {
  const queryKey = PROJECT_TASKS_QUERY_KEY();
  queryClient.setQueriesData({ queryKey }, (old: unknown) => {
    if (!old || typeof old !== 'object') return old;
    const p = old as { data?: unknown[]; meta?: unknown };
    if (!Array.isArray(p.data)) return old;
    return {
      ...p,
      data: p.data.map((t: unknown) => {
        const task = t as { id: string; status: string; completionPercentage: number };
        if (task.id !== taskId) return task;
        return {
          ...task,
          status: newStatus,
          ...(newCompletionPct !== undefined ? { completionPercentage: newCompletionPct } : {}),
        };
      }),
    };
  });
}
