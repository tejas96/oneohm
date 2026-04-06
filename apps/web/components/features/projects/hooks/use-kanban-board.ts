'use client';

import { TaskStatus } from '@oneohm-epc/shared/types';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useRef } from 'react';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Types
// ============================================================================

export interface BoardColumnTask {
  id: string;
  code: string;
  name: string;
  status: TaskStatus;
  priority: string;
  assigneeName?: string;
  assigneeId?: string;
  endDate?: string;
  labels?: string[];
  kanbanOrder: number;
  checklistProgress?: { done: number; total: number };
  hasDependencyBlockers: boolean;
  dependencyNames: string[];
  dependencyCodes: string[];
  version: number;
  milestoneName?: string;
  completionPercentage: number;
  blockedReason?: string;
}

export interface BoardColumn {
  status: TaskStatus;
  label: string;
  color: string;
  tasks: BoardColumnTask[];
  total: number;
}

export interface BoardFilters {
  team: Array<{ userId: string; name: string }>;
  milestones: Array<{ id: string; name: string }>;
  labels: string[];
}

export interface BoardResponse {
  columns: BoardColumn[];
  filters: BoardFilters;
}

export interface KanbanFilterState {
  assigneeId: string;
  priority: string;
  milestoneId: string;
  label: string;
  myTasks: string;
  search: string;
}

export interface MoveTaskPayload {
  taskId: string;
  projectId: string;
  status: TaskStatus;
  kanbanOrder: number;
  version: number;
}

// ============================================================================
// Query Keys
// ============================================================================

export const boardKeys = {
  all: (orgId?: string) => ['kanban-board', orgId] as const,
  board: (orgId: string | undefined, projectId: string) =>
    [...boardKeys.all(orgId), projectId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

export function useKanbanBoard(projectId: string): UseQueryResult<BoardResponse> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;

  return useQuery({
    queryKey: boardKeys.board(organizationId, projectId),
    queryFn: async () => {
      const { data } = await apiClient.get<BoardResponse>(`/projects/${projectId}/tasks/board`, {
        headers: { 'X-Organization-Id': organizationId },
      });
      return data;
    },
    enabled: !!projectId && !!organizationId,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });
}

export function useMoveTask(projectId: string): UseMutationResult<unknown, Error, MoveTaskPayload> {
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const queryClient = useQueryClient();
  const pendingMutations = useRef(0);

  return useMutation({
    mutationFn: async ({
      taskId,
      projectId: pid,
      status,
      kanbanOrder,
      version,
    }: MoveTaskPayload) => {
      const { data } = await apiClient.post(
        `/projects/${pid}/tasks/${taskId}/move`,
        { status, kanbanOrder, version },
        { headers: { 'X-Organization-Id': organizationId } },
      );
      return data;
    },
    onMutate: async (payload) => {
      pendingMutations.current++;
      await queryClient.cancelQueries({
        queryKey: boardKeys.board(organizationId, projectId),
      });
      const previous = queryClient.getQueryData<BoardResponse>(
        boardKeys.board(organizationId, projectId),
      );

      queryClient.setQueryData<BoardResponse>(boardKeys.board(organizationId, projectId), (old) => {
        if (!old) return old;
        const columns = old.columns.map((col) => ({
          ...col,
          tasks: [...col.tasks],
        }));

        let movedTask: BoardColumnTask | undefined;
        for (const col of columns) {
          const idx = col.tasks.findIndex((t) => t.id === payload.taskId);
          if (idx !== -1) {
            [movedTask] = col.tasks.splice(idx, 1);
            col.total = col.tasks.length;
            break;
          }
        }

        if (movedTask) {
          const targetCol = columns.find((c) => c.status === payload.status);
          if (targetCol) {
            const updated = {
              ...movedTask,
              status: payload.status,
              kanbanOrder: payload.kanbanOrder,
              version: movedTask.version + 1,
            };
            const insertIdx = targetCol.tasks.findIndex((t) => t.kanbanOrder > payload.kanbanOrder);
            if (insertIdx === -1) {
              targetCol.tasks.push(updated);
            } else {
              targetCol.tasks.splice(insertIdx, 0, updated);
            }
            targetCol.total = targetCol.tasks.length;
          }
        }

        return { ...old, columns };
      });

      return { previous };
    },
    onSuccess: () => {
      showToast.success('Task moved');
    },
    onError: (err, _vars, context) => {
      if (pendingMutations.current <= 1 && context?.previous) {
        queryClient.setQueryData(boardKeys.board(organizationId, projectId), context.previous);
      }
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to move task. It may have been modified by another user.';
      showToast.error(message);
    },
    onSettled: () => {
      pendingMutations.current--;
      if (pendingMutations.current === 0) {
        void queryClient.invalidateQueries({
          queryKey: boardKeys.board(organizationId, projectId),
        });
      }
    },
  });
}
