'use client';

import {
  TaskStatus,
  type GroupByMode,
  type GroupedMyTasksResponse,
  type MyTask,
  type MyTaskFilters,
  type MyTasksGroup,
  type MyTasksProject,
  type MyTasksSummary,
} from '@tejas96/shared/types';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type UseQueryResult,
} from '@tanstack/react-query';

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
  MyTasksGroup,
  MyTasksProject,
  MyTasksSummary,
};

// ============================================================================
// Query Keys
// ============================================================================

export const myTaskKeys = {
  all: (orgId?: string) => ['my-tasks', orgId] as const,
  grouped: (orgId: string | undefined, filters: MyTaskFilters) =>
    [...myTaskKeys.all(orgId), 'grouped', filters] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useMyTasks(filters: MyTaskFilters): UseQueryResult<GroupedMyTasksResponse> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: myTaskKeys.grouped(organizationId, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.groupBy) params.set('groupBy', filters.groupBy);
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.search) params.set('search', filters.search);
      if (filters.dueDateFilter) params.set('dueDateFilter', filters.dueDateFilter);

      const url = `/tasks/my?${params.toString()}`;
      const { data } = await apiClient.get<GroupedMyTasksResponse>(url, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!user && !!organizationId,
    // Always refetch when navigating to My Tasks so the user sees the latest state.
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
}

export function useUpdateTaskStatus() {
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const { data } = await apiClient.patch<MyTask>(
        `/tasks/${taskId}/status`,
        { status },
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    onSuccess: (_data, variables) => {
      const isDone = variables.status === TaskStatus.DONE;
      showToast.success(isDone ? 'Task marked as done' : 'Task status updated');
      // Invalidate the grouped task list AND the separate sidebar summary so both
      // update immediately without a hard refresh.
      void queryClient.invalidateQueries({ queryKey: myTaskKeys.all(organizationId) });
      void queryClient.invalidateQueries({ queryKey: myTasksSummaryKeys.all(organizationId) });
    },
    onError: (error) => {
      showToast.error(getErrorMessage(error));
    },
  });
}
