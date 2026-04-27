'use client';

import { useMemo } from 'react';

import { KANBAN_BOARD_LIMIT, UNASSIGNED_TASK_FILTER, type TaskListFilters } from '../constants';
import { useProjectTaskList, useProjectTaskStatuses, type ProjectTaskItem } from '../hooks';

export interface KanbanColumnData {
  code: string;
  label: string;
  color: string;
  orderIndex: number;
  tasks: ProjectTaskItem[];
}

export interface UseProjectTaskBoardResult {
  columns: KanbanColumnData[];
  totalTasks: number;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

const OTHER_COLUMN: Omit<KanbanColumnData, 'tasks'> = {
  code: '__other__',
  label: 'Other',
  color: '#94a3b8',
  orderIndex: 9999,
};

/**
 * Fetches all tasks for a project in board mode (high limit, no pagination),
 * groups them into columns by project-configured task statuses.
 *
 * Column order follows taskStatuses[].orderIndex.
 * Tasks whose status is not in configured statuses fold into a trailing "Other" column.
 */
export function useProjectTaskBoard(
  projectId: string,
  filters: TaskListFilters,
  isActive: boolean,
): UseProjectTaskBoardResult {
  const { taskStatuses } = useProjectTaskStatuses(projectId);

  const {
    data,
    isLoading,
    isFetching,
    isError,
    error: queryError,
    refetch,
  } = useProjectTaskList(
    projectId,
    {
      page: 1,
      limit: KANBAN_BOARD_LIMIT,
      status: filters.t_status || undefined,
      priority: filters.t_priority || undefined,
      assignedToUserId:
        filters.t_assignee === UNASSIGNED_TASK_FILTER
          ? UNASSIGNED_TASK_FILTER
          : filters.t_assignee || undefined,
      milestoneId: filters.t_milestone || undefined,
      search: filters.t_search || undefined,
    },
    { enabled: isActive },
  );

  const tasks = data?.data ?? [];

  const columns = useMemo<KanbanColumnData[]>(() => {
    if (taskStatuses.length === 0) return [];

    const sorted = [...taskStatuses].sort((a, b) => a.orderIndex - b.orderIndex);
    const configuredCodes = new Set<string>(sorted.map((s) => s.code));

    const columnMap = new Map<string, KanbanColumnData>(
      sorted.map((s) => [
        s.code,
        { code: s.code, label: s.label, color: s.color, orderIndex: s.orderIndex, tasks: [] },
      ]),
    );

    const otherTasks: ProjectTaskItem[] = [];

    for (const task of tasks) {
      if (configuredCodes.has(task.status)) {
        columnMap.get(task.status)?.tasks.push(task);
      } else {
        otherTasks.push(task);
      }
    }

    const result = Array.from(columnMap.values());

    // Only add "Other" column if there are unmapped tasks
    if (otherTasks.length > 0) {
      result.push({ ...OTHER_COLUMN, tasks: otherTasks });
    }

    return result;
  }, [taskStatuses, tasks]);

  return {
    columns,
    totalTasks: data?.meta?.total ?? tasks.length,
    isLoading,
    isFetching,
    isError,
    error: queryError,
    refetch,
  };
}
