'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  TaskStatus,
  type GroupByMode,
  type GroupedMyTasksResponse,
  type MyTask,
  type MyTaskFilters,
  type MyTaskListItem,
  type MyTasksGroup,
  type MyTasksGroupTasksResponse,
  type MyTasksProject,
  type MyTasksSummary,
} from '@tejas96/shared/types';

import { myTasksSummaryKeys } from '@/components/features/tasks/hooks/use-my-tasks-summary';
import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

export type {
  GroupByMode,
  GroupedMyTasksResponse,
  MyTask,
  MyTaskFilters,
  MyTaskListItem,
  MyTasksGroup,
  MyTasksGroupTasksResponse,
  MyTasksProject,
  MyTasksSummary,
};

// ============================================================================
// Query Keys
// ============================================================================

export const myTaskKeys = {
  all: () => ['my-tasks'] as const,
  grouped: (filters: MyTaskFilters) =>
    [...myTaskKeys.all(), 'grouped', serializeMyTaskFilters(filters)] as const,
  groupTasks: (filters: MyTaskFilters, groupKey: string) =>
    [...myTaskKeys.all(), 'group-tasks', serializeMyTaskFilters(filters), groupKey] as const,
};

/** Stable query-key slice so identical filter values do not refetch on object identity changes. */
function serializeMyTaskFilters(filters: MyTaskFilters): string {
  return JSON.stringify({
    groupBy: filters.groupBy ?? '',
    status: filters.status ?? '',
    priority: filters.priority ?? '',
    projectId: filters.projectId ?? '',
    search: filters.search ?? '',
    dueDateFilter: filters.dueDateFilter ?? '',
    address: filters.address ?? '',
  });
}

function buildMyTasksParams(filters: MyTaskFilters, groupKey?: string): string {
  const params = new URLSearchParams();
  if (filters.groupBy) params.set('groupBy', filters.groupBy);
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.projectId) params.set('projectId', filters.projectId);
  if (filters.search) params.set('search', filters.search);
  if (filters.dueDateFilter) params.set('dueDateFilter', filters.dueDateFilter);
  if (filters.address) params.set('address', filters.address);
  if (groupKey) params.set('groupKey', groupKey);
  return params.toString();
}

// ============================================================================
// Hooks
// ============================================================================

export function useMyTasks(
  filters: MyTaskFilters,
  options?: { enabled?: boolean },
): UseQueryResult<GroupedMyTasksResponse> {
  const { user } = useAuth();
  const queryEnabled = options?.enabled ?? true;

  return useQuery({
    queryKey: myTaskKeys.grouped(filters),
    queryFn: async () => {
      const params = buildMyTasksParams(filters);
      const url = `/tasks/my?${params}`;
      const { data } = await apiClient.get<GroupedMyTasksResponse>(url, {});
      return data;
    },
    enabled: !!user && queryEnabled,
    staleTime: 30_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
}

export function useMyTasksGroupTasks(
  filters: MyTaskFilters,
  groupKey: string,
  enabled: boolean,
): UseQueryResult<MyTasksGroupTasksResponse> {
  const { user } = useAuth();

  return useQuery({
    queryKey: myTaskKeys.groupTasks(filters, groupKey),
    queryFn: async () => {
      const params = buildMyTasksParams(filters, groupKey);
      const url = `/tasks/my?${params}`;
      const { data } = await apiClient.get<MyTasksGroupTasksResponse>(url, {});
      return data;
    },
    enabled: !!user && enabled,
    staleTime: 30_000,
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const { data } = await apiClient.patch<MyTask>(`/tasks/${taskId}/status`, { status }, {});
      return data;
    },
    onSuccess: (_data, variables) => {
      const isDone = variables.status === TaskStatus.DONE;
      showToast.success(isDone ? 'Task marked as done' : 'Task status updated');
      void queryClient.invalidateQueries({ queryKey: myTaskKeys.all() });
      void queryClient.invalidateQueries({ queryKey: myTasksSummaryKeys.all() });
    },
    onError: (error) => {
      showToast.error(getErrorMessage(error));
    },
  });
}
