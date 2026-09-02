'use client';

import Box from '@mui/material/Box';
import { useQueryClient } from '@tanstack/react-query';
import { TaskStatus } from '@tejas96/shared/types';
import React, { useCallback, useRef } from 'react';

import { KanbanColumn } from './board/kanban-column';
import {
  optimisticallyMoveTaskStatus,
  resolveTaskStatusPayload,
  restoreProjectTasksCaches,
  snapshotProjectTasksCaches,
} from './lib/apply-task-status-change';
import { PROJECT_TASKS_QUERY_KEY, type TaskListFilters } from '../../../../constants';
import { useProjectTaskBoard, useTaskBoardDnd, type KanbanColumnData } from '../../../../hooks';
import { EmptyPane, ErrorPane } from '../../primitives';

import { useUpdateTask } from '@/components/features/tasks/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/sonner';

// ── Types ────────────────────────────────────────────────────────────────────

interface TaskBoardViewProps {
  projectId: string;
  filters: TaskListFilters;
  onOpenTask: (taskId: string) => void;
  onOpenCreate: (preselectedStatus?: string) => void;
}

// ── Skeleton board (loading state) ───────────────────────────────────────────

function BoardSkeleton(): React.JSX.Element {
  return (
    <div className="flex gap-4 overflow-hidden px-[22px] pb-2">
      {[1, 2, 3].map((column) => (
        <div
          key={column}
          className="flex w-[288px] min-w-[288px] shrink-0 flex-col gap-2 rounded-r-md p-3"
          style={{ background: 'var(--ds-canvas-sunken)' }}
        >
          <Skeleton className="h-3 w-24 rounded-md" />
          {[1, 2, 3].map((card) => (
            <Skeleton key={card} className="h-[92px] rounded-r-sm" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * TaskBoardView — Jira-style Kanban board.
 *
 * Uses @atlaskit/pragmatic-drag-and-drop (the same library powering Jira/Trello)
 * for drag-and-drop. Status updates are applied synchronously to the cache on drop
 * so the UI reacts before the API call completes.
 */
export function TaskBoardView({
  projectId,
  filters,
  onOpenTask,
  onOpenCreate,
}: TaskBoardViewProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const { mutate: updateTask } = useUpdateTask();

  // All data fetching + grouping
  const { columns, isLoading, isFetching, isError, refetch } = useProjectTaskBoard(
    projectId,
    filters,
    true,
  );

  // DnD monitor (global — tracks which card is being dragged)
  const { dragState } = useTaskBoardDnd();

  // Live region for a11y announcements
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string) => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
    }
  }, []);

  // Handler for "Move to" menu on cards (keyboard/mobile path)
  const handleMoveToStatus = useCallback(
    (taskId: string, newStatus: string, currentCompletionPct: number) => {
      const fromStatus = columns.find((col) => col.tasks.some((t) => t.id === taskId))?.code;
      if (fromStatus === newStatus) return;

      const { completionPercentage } = resolveTaskStatusPayload(newStatus, currentCompletionPct);
      const snapshots = snapshotProjectTasksCaches(queryClient);
      optimisticallyMoveTaskStatus(queryClient, taskId, newStatus, completionPercentage);

      const fromLabel =
        columns.find((c) => c.code === fromStatus)?.label ?? fromStatus ?? 'unknown';
      const toLabel = columns.find((c) => c.code === newStatus)?.label ?? newStatus;

      updateTask(
        {
          taskId,
          status: newStatus as TaskStatus,
          silent: true,
          ...(completionPercentage !== undefined ? { completionPercentage } : {}),
        },
        {
          onSuccess: () => {
            void queryClient.invalidateQueries({
              queryKey: PROJECT_TASKS_QUERY_KEY(),
            });
            announce(`Moved task to ${toLabel}`);
          },
          onError: () => {
            restoreProjectTasksCaches(queryClient, snapshots);
            showToast.error("Couldn't move task — please try again");
            announce(`Failed to move task from ${fromLabel} to ${toLabel}`);
          },
        },
      );
    },
    [columns, queryClient, updateTask, announce],
  );

  const handleAddTask = useCallback(
    (status: string) => {
      onOpenCreate(status);
    },
    [onOpenCreate],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="px-[22px]">
        <ErrorPane label="The board" onRetry={refetch} height={200} />
      </div>
    );
  }

  if (isLoading) {
    return <BoardSkeleton />;
  }

  if (columns.length === 0) {
    return (
      <div className="px-[22px]">
        <EmptyPane
          size="page"
          title="Nothing on the board"
          description="No task matches the current filters. Widen them to see more of this project."
        />
      </div>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* A refetch in flight. A hairline at the top of the strip rather than a
          spinner over the columns, so the board never goes blank mid-drag. */}
      {isFetching && !isLoading ? (
        <span
          aria-hidden
          className="absolute inset-x-[22px] top-0 h-[2px] overflow-hidden rounded-pill"
          style={{ background: 'var(--ds-canvas-sunken)' }}
        >
          <span className="block h-full w-1/3 rounded-pill bg-primary motion-safe:animate-wave-drift" />
        </span>
      ) : null}

      {/* Kanban columns. Padded to the card's own gutter so the first and last
          column line up with the header above them while the strip itself
          scrolls edge to edge. */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          px: '22px',
          pb: 2,
          pt: 1,
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'var(--ds-neutral-300)',
            borderRadius: 999,
          },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
        }}
      >
        {columns.map((column: KanbanColumnData) => (
          <KanbanColumn
            key={column.code}
            column={column}
            allColumns={columns}
            isLoading={false}
            draggingTaskId={dragState.draggingTaskId}
            onOpenTask={onOpenTask}
            onMoveToStatus={handleMoveToStatus}
            onAddTask={handleAddTask}
          />
        ))}
      </Box>

      {/* a11y live region — announces drag/move results */}
      <Box
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      />
    </Box>
  );
}

TaskBoardView.displayName = 'TaskBoardView';
