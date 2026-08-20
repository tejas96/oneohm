'use client';

import type { MyTaskFilters, MyTaskListItem, MyTasksGroup } from '@tejas96/shared/types';
import { useEffect } from 'react';

import { useMyTasksGroupTasks } from '../hooks';
import { CollapsibleTaskGroup } from './collapsible-task-group';

interface MyTasksGroupSectionProps {
  group: MyTasksGroup;
  filters: MyTaskFilters;
  isLazyMode: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onOpenDrawer: (task: MyTaskListItem) => void;
  onStatusChange?: (
    taskId: string,
    newStatus: string,
    currentStatus: string,
    currentCompletionPct: number,
  ) => void;
  onPriorityChange?: (taskId: string, newPriority: string) => void;
  focusedTaskId?: string;
  onTasksLoaded?: (groupKey: string, tasks: MyTaskListItem[]) => void;
  fetchEnabled?: boolean;
  lazyFetchAllowed?: boolean;
}

export function MyTasksGroupSection({
  group,
  filters,
  isLazyMode,
  expanded,
  onToggleExpand,
  onOpenDrawer,
  onStatusChange,
  onPriorityChange,
  focusedTaskId,
  onTasksLoaded,
  fetchEnabled = true,
  lazyFetchAllowed = true,
}: MyTasksGroupSectionProps): React.JSX.Element {
  const shouldFetch = isLazyMode && expanded && fetchEnabled && lazyFetchAllowed;
  const { data, isLoading, isError, isFetched, refetch } = useMyTasksGroupTasks(
    filters,
    group.key,
    shouldFetch,
  );

  const tasks = isLazyMode ? (isError ? [] : (data?.tasks ?? [])) : group.tasks;
  const isLoadingTasks = shouldFetch && isLoading;

  useEffect(() => {
    if (!isLazyMode || !expanded || !fetchEnabled) return;
    if (isLoading) return;
    if (isError) {
      onTasksLoaded?.(group.key, []);
      return;
    }
    if (!isFetched) return;
    onTasksLoaded?.(group.key, tasks);
  }, [
    group.key,
    expanded,
    isLazyMode,
    tasks,
    onTasksLoaded,
    fetchEnabled,
    isLoading,
    isError,
    isFetched,
  ]);

  return (
    <CollapsibleTaskGroup
      groupKey={group.key}
      label={group.label}
      count={group.count}
      tasks={tasks}
      expanded={expanded}
      onToggleExpand={onToggleExpand}
      onOpenDrawer={onOpenDrawer}
      onStatusChange={onStatusChange}
      onPriorityChange={onPriorityChange}
      focusedTaskId={focusedTaskId}
      isLoadingTasks={isLoadingTasks}
      isTasksError={shouldFetch && isError}
      onRetryTasks={() => void refetch()}
    />
  );
}
