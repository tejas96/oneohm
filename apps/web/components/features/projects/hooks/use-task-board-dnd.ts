'use client';

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useQueryClient } from '@tanstack/react-query';
import { TaskStatus } from '@tejas96/shared/types';
import { useEffect, useState } from 'react';

import {
  optimisticallyMoveTaskStatus,
  resolveTaskStatusPayload,
  restoreProjectTasksCaches,
  snapshotProjectTasksCaches,
} from '../components/project-detail/tabs/task-list/lib/apply-task-status-change';
import { PROJECT_TASKS_QUERY_KEY } from '../constants';

import { useUpdateTask } from '@/components/features/tasks/hooks';
import { showToast } from '@/components/ui/sonner';

export interface DragState {
  isDragging: boolean;
  draggingTaskId: string | null;
  draggingFromStatus: string | null;
}

export interface UseTaskBoardDndResult {
  dragState: DragState;
  activeDropColumn: string | null;
  setActiveDropColumn: (col: string | null) => void;
}

const IDLE_DRAG_STATE: DragState = {
  isDragging: false,
  draggingTaskId: null,
  draggingFromStatus: null,
};

/**
 * Wires pragmatic-drag-and-drop monitorForElements at the board level.
 * Handles:
 * - Tracking which card is being dragged (DragState)
 * - Synchronous optimistic cache update on drop (instant UI)
 * - Background PATCH via useUpdateTask
 * - Rollback + error toast on failure
 * - Suppressing success toast on drop (silent: true pattern handled inline)
 */
export function useTaskBoardDnd(): UseTaskBoardDndResult {
  const queryClient = useQueryClient();
  const { mutate: updateTask } = useUpdateTask();

  const [dragState, setDragState] = useState<DragState>(IDLE_DRAG_STATE);
  const [activeDropColumn, setActiveDropColumn] = useState<string | null>(null);

  // We need a stable refId for use inside the monitor callbacks
  // (closures capture the value at registration time, but org can change).
  useEffect(() => {
  }, []);

  // Register the global monitor once. Columns and cards handle their own
  // draggable/dropTarget registrations locally. The monitor centralises the
  // mutation so we don't have per-column mutation hooks.
  useEffect(() => {
    const cleanup = monitorForElements({
      canMonitor({ source }) {
        return source.data.type === 'task';
      },
      onDragStart({ source }) {
        const { taskId, fromStatus } = source.data as {
          taskId: string;
          fromStatus: string;
        };
        setDragState({ isDragging: true, draggingTaskId: taskId, draggingFromStatus: fromStatus });
      },
      onDrop({ source, location }) {
        // Always reset drag state first
        setDragState(IDLE_DRAG_STATE);
        setActiveDropColumn(null);

        const dropTargets = location.current.dropTargets;
        if (dropTargets.length === 0) return;

        const columnTarget = dropTargets.find(
          (t) => (t.data as Record<string, unknown>).type === 'column',
        );
        if (!columnTarget) return;

        const { taskId, fromStatus, taskCompletionPct } = source.data as {
          taskId: string;
          fromStatus: string;
          taskCompletionPct: number;
        };
        const { toStatus } = columnTarget.data as { toStatus: string };

        // No-op if dropped in same column
        if (fromStatus === toStatus) return;


        // Resolve whether completionPercentage needs reset
        const { completionPercentage } = resolveTaskStatusPayload(toStatus, taskCompletionPct);

        // 1. Snapshot before touching cache
        const snapshots = snapshotProjectTasksCaches(queryClient);

        // 2. Optimistically move the task to the new column (synchronous, same tick)
        optimisticallyMoveTaskStatus(queryClient, taskId, toStatus, completionPercentage);

        // 3. Fire PATCH in background (no success toast — optimistic UI is the feedback)
        updateTask(
          {
            taskId,
            status: toStatus as TaskStatus,
            silent: true,
            ...(completionPercentage !== undefined ? { completionPercentage } : {}),
          },
          {
            onSuccess: () => {
              // Soft invalidate to sync any server-derived fields
              void queryClient.invalidateQueries({
                queryKey: PROJECT_TASKS_QUERY_KEY(),
              });
            },
            onError: () => {
              // Roll back the optimistic update
              restoreProjectTasksCaches(queryClient, snapshots);
              showToast.error("Couldn't move task — please try again");
            },
          },
        );
      },
    });

    return cleanup;
  }, [queryClient, updateTask]);

  return { dragState, activeDropColumn, setActiveDropColumn };
}

export const BOARD_DND_TASK_TYPE = 'task' as const;

/** Data payload attached to a draggable task card element. */
export interface DraggableTaskData {
  type: typeof BOARD_DND_TASK_TYPE;
  taskId: string;
  fromStatus: string;
  taskCompletionPct: number;
}

/** Data payload attached to a droppable column element. */
export interface DroppableColumnData {
  type: 'column';
  toStatus: string;
}

/** Type guard for draggable task data. */
export function isDraggableTaskData(data: unknown): data is DraggableTaskData {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).type === BOARD_DND_TASK_TYPE
  );
}

/** Type guard for droppable column data. */
export function isDroppableColumnData(data: unknown): data is DroppableColumnData {
  return (
    typeof data === 'object' && data !== null && (data as Record<string, unknown>).type === 'column'
  );
}
