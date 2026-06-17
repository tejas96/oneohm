'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import { TaskStatus } from '@tejas96/shared/types';
import { useQueryClient } from '@tanstack/react-query';
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

import { useUpdateTask } from '@/components/features/tasks/hooks';
import { showToast } from '@/components/ui/sonner';
import { useOrgContext } from '@/lib/hooks/core';

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
    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
      {[1, 2, 3].map((i) => (
        <Box
          key={i}
          sx={{
            width: 280,
            minWidth: 280,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/* Column header skeleton */}
          <Box
            sx={{
              p: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Skeleton variant="circular" width={10} height={10} />
            <Skeleton variant="text" width={80} height={14} />
            <Skeleton variant="rounded" width={22} height={18} sx={{ borderRadius: 4 }} />
          </Box>
          {/* Card skeletons */}
          <Box sx={{ p: 1 }}>
            {[1, 2, 3].map((j) => (
              <Box
                key={j}
                sx={{
                  p: 1.5,
                  mb: 1,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Skeleton variant="text" width="55%" height={12} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width="90%" height={14} />
                <Skeleton variant="text" width="70%" height={14} sx={{ mb: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton variant="text" width={50} height={12} />
                  <Skeleton variant="circular" width={20} height={20} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
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
  const { organizationId } = useOrgContext();
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
      const snapshots = snapshotProjectTasksCaches(queryClient, organizationId);
      optimisticallyMoveTaskStatus(
        queryClient,
        organizationId,
        taskId,
        newStatus,
        completionPercentage,
      );

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
              queryKey: PROJECT_TASKS_QUERY_KEY(organizationId),
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
    [columns, queryClient, organizationId, updateTask, announce],
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
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={refetch}>
            Retry
          </Button>
        }
        sx={{ mt: 2 }}
      >
        Failed to load board data
      </Alert>
    );
  }

  if (isLoading) {
    return <BoardSkeleton />;
  }

  if (columns.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Configure task statuses for this project to use the board.
      </Alert>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Subtle refetch indicator */}
      {isFetching && !isLoading && (
        <LinearProgress
          sx={{
            position: 'absolute',
            top: -4,
            left: 0,
            right: 0,
            height: 2,
            borderRadius: 1,
          }}
        />
      )}

      {/* Kanban columns */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          pb: 2,
          pt: 0.5,
          // Custom scrollbar styling
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'divider',
            borderRadius: 3,
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'transparent',
          },
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
