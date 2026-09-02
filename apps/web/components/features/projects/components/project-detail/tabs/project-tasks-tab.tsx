'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  isFinalTaskStatus,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from '@tejas96/shared/constants';
import { TaskStatus, type TaskPriority } from '@tejas96/shared/types';
import { Plus } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import {
  PROJECT_MILESTONE_AGG_QUERY_KEY,
  PROJECT_TASKS_QUERY_KEY,
  TASK_LIST_FILTER_DEFAULTS,
  TASK_VIEW_MODES,
  TASKS_PAGE_SIZE,
  UNASSIGNED_TASK_FILTER,
  type TaskListFilters,
  type TaskViewMode,
} from '../../../constants';
import {
  type TeamMemberSummary,
  useProjectMilestones,
  useProjectTaskList,
  useProjectTeam,
} from '../../../hooks';
import type { ProjectDetail } from '../../../hooks/types';
import { DetailCard, ROW_BLEED } from '../primitives';
import { CreateProjectTaskModal } from './create-project-task-modal';
import { TaskBoardView, TaskFilterBar, TaskListTable, TaskViewToggle } from './task-list';

import { TaskDrawer } from '@/components/features/tasks';
import { useUpdateTask } from '@/components/features/tasks/hooks';
import { TablePagination } from '@/components/shared/data-table/pagination';
import { useUrlFilters } from '@/lib/hooks/use-url-filters';
import { useGatedAction } from '@/lib/rbac';
import { cn, formatNumber } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

interface ProjectTasksTabProps {
  projectId: string;
  project: ProjectDetail;
  isActive: boolean;
}

/**
 * Every task on the project, as a grouped list or a board.
 *
 * One card holds the whole thing — header, filters and rows — so the tab reads
 * as one surface rather than a toolbar floating above a bordered table. The
 * card's own header carries the count and the two controls that act on the
 * whole view; the filters sit under it.
 */
export const ProjectTasksTab = React.memo(
  ({ projectId, project: _project, isActive }: ProjectTasksTabProps): React.JSX.Element => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { filters, setFilter, clearFilters } =
      useUrlFilters<TaskListFilters>(TASK_LIST_FILTER_DEFAULTS);
    const page = Math.max(1, parseInt(filters.t_page, 10) || 1);
    const view = (filters.t_view || TASK_VIEW_MODES.LIST) as TaskViewMode;

    const handleViewChange = useCallback(
      (newView: TaskViewMode) => setFilter('t_view', newView),
      [setFilter],
    );

    const {
      data: taskListData,
      isLoading,
      isError,
      refetch,
    } = useProjectTaskList(
      projectId,
      {
        page,
        limit: TASKS_PAGE_SIZE,
        status: filters.t_status || undefined,
        priority: filters.t_priority || undefined,
        assignedToUserId:
          filters.t_assignee === UNASSIGNED_TASK_FILTER
            ? UNASSIGNED_TASK_FILTER
            : filters.t_assignee || undefined,
        milestoneName: filters.t_milestone || undefined,
        search: filters.t_search || undefined,
      },
      { enabled: isActive },
    );

    const { data: team } = useProjectTeam(projectId, { enabled: isActive });
    const { data: milestonesData } = useProjectMilestones(projectId, { enabled: isActive });
    const milestones = useMemo(
      () => milestonesData?.filter((m) => m.totalTasks > 0) ?? [],
      [milestonesData],
    );

    // useUpdateTask handles toasts and myTaskKeys invalidation internally.
    // We only need to additionally bust the project-tasks list after success.
    const { mutate: updateTaskMutate } = useUpdateTask();

    const invalidateProjectTasks = useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: PROJECT_TASKS_QUERY_KEY() });
      void queryClient.invalidateQueries({ queryKey: PROJECT_MILESTONE_AGG_QUERY_KEY(projectId) });
    }, [queryClient, projectId]);

    const avatarMembers: TeamMemberSummary[] = useMemo(() => {
      if (!team) return [];
      const mapped = team.map((m) => ({
        id: m.userId,
        firstName: m.user?.firstName ?? 'Unknown',
        lastName: m.user?.lastName,
        isProjectManager: m.isProjectManager,
      }));
      const currentUserId = user?.id;
      return mapped.sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return 0;
      });
    }, [team, user?.id]);

    const [openTaskId, setOpenTaskId] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createPreselectedStatus, setCreatePreselectedStatus] = useState<string | null>(null);

    // One gate for both ways into the create dialog — the header button and the
    // "+" on each board column. Gating only the header would leave the board
    // view wide open, which is exactly what it did before.
    const createTask = useGatedAction(
      'projects.tasks.manage',
      () => setCreateDialogOpen(true),
      'Add task',
    );

    const handleOpenTask = useCallback((taskId: string) => {
      setOpenTaskId(taskId);
      setDrawerOpen(true);
    }, []);

    const handleCloseDrawer = useCallback(() => setDrawerOpen(false), []);

    const handleStatusChange = useCallback(
      (taskId: string, newStatus: string, _currentStatus: string, currentCompletionPct: number) => {
        // The backend only auto-sets completionPercentage on final status transitions (done/cancelled → 100).
        // It never auto-resets it when moving back to an active status. So any task that was ever
        // "done" or "cancelled" retains completionPercentage = 100 in the DB indefinitely.
        // Fix: whenever moving to a non-final status and the task is at 100%, explicitly send 0.
        const completionPercentage =
          !isFinalTaskStatus(newStatus) && currentCompletionPct === 100 ? 0 : undefined;

        const queryKey = PROJECT_TASKS_QUERY_KEY();
        type CacheSnapshot = { key: readonly unknown[]; data: unknown };
        const snapshots: CacheSnapshot[] = [];

        if (completionPercentage !== undefined) {
          queryClient
            .getQueryCache()
            .findAll({ queryKey })
            .forEach((q) => {
              snapshots.push({ key: q.queryKey, data: q.state.data });
            });

          queryClient.setQueriesData({ queryKey }, (old: unknown) => {
            if (!old || typeof old !== 'object') return old;
            const p = old as { data?: unknown[]; meta?: unknown };
            if (!Array.isArray(p.data)) return old;
            return {
              ...p,
              data: p.data.map((t: unknown) => {
                const task = t as { id: string; completionPercentage: number };
                return task.id === taskId ? { ...task, completionPercentage: 0 } : task;
              }),
            };
          });
        }

        updateTaskMutate(
          { taskId, status: newStatus as TaskStatus, completionPercentage },
          {
            onSuccess: invalidateProjectTasks,
            onError: () => {
              snapshots.forEach(({ key, data }) => queryClient.setQueryData(key, data));
            },
          },
        );
      },
      [updateTaskMutate, invalidateProjectTasks, queryClient],
    );

    const handlePriorityChange = useCallback(
      (taskId: string, priority: string) => {
        updateTaskMutate(
          { taskId, priority: priority as TaskPriority },
          { onSuccess: invalidateProjectTasks },
        );
      },
      [updateTaskMutate, invalidateProjectTasks],
    );

    const hasActiveFilters =
      !!filters.t_search ||
      !!filters.t_status ||
      !!filters.t_priority ||
      !!filters.t_assignee ||
      !!filters.t_milestone;

    const tasks = taskListData?.data ?? [];
    const meta = taskListData?.meta;

    /*
     * "Nothing has arrived yet" is not the same as "there is nothing".
     *
     * react-query reports `isLoading: false` for a DISABLED query, and this one
     * is disabled until the tab becomes active. Reading it alone meant the
     * first frame after clicking Tasks drew the "No tasks yet" empty state
     * before the request had even left. No data and no error means loading.
     */
    const showSkeleton = isLoading || (taskListData === undefined && !isError);

    return (
      <>
        <DetailCard
          label="Tasks"
          aside={
            meta ? `${formatNumber(meta.total)} ${meta.total === 1 ? 'task' : 'tasks'}` : undefined
          }
          isError={isError}
          onRetry={() => refetch()}
          errorHeight={220}
          action={
            <div className="flex items-center gap-2">
              <TaskViewToggle view={view} onViewChange={handleViewChange} />
              <button
                type="button"
                onClick={createTask.onGatedClick}
                aria-disabled={!createTask.allowed}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill bg-primary px-3.5 text-[12.5px] font-medium text-white transition-[filter,transform] duration-fast hover:brightness-105 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  !createTask.allowed && 'opacity-50',
                )}
              >
                <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
                Add task
              </button>
            </div>
          }
        >
          <TaskFilterBar
            filters={filters}
            setFilter={setFilter}
            clearFilters={clearFilters}
            taskStatuses={TASK_STATUS_OPTIONS}
            priorityOptions={TASK_PRIORITY_OPTIONS}
            avatarMembers={avatarMembers}
            milestones={milestones}
          />

          {isError ? null : view === TASK_VIEW_MODES.LIST ? (
            <>
              <TaskListTable
                tasks={tasks}
                taskStatuses={TASK_STATUS_OPTIONS}
                isLoading={showSkeleton}
                onOpenTask={handleOpenTask}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearFilters}
              />

              {meta && meta.totalPages > 1 ? (
                <div className="pt-3">
                  <TablePagination
                    currentPage={page}
                    totalPages={meta.totalPages}
                    totalItems={meta.total}
                    itemLabel="tasks"
                    pageSize={TASKS_PAGE_SIZE}
                    variant="simple"
                    onPageChange={(p) => setFilter('t_page', String(p))}
                  />
                </div>
              ) : null}
            </>
          ) : (
            /* The board scrolls sideways, so it bleeds to the card's edge —
               a column should be able to reach the rim rather than stopping
               22px short of it. */
            <div className={cn('overflow-hidden', ROW_BLEED)}>
              <TaskBoardView
                projectId={projectId}
                filters={filters}
                onOpenTask={handleOpenTask}
                onOpenCreate={(preselectedStatus?: string) => {
                  setCreatePreselectedStatus(preselectedStatus ?? null);
                  // Through the gate, not straight to the setter — the board's
                  // per-column "+" is the same create action as the header button.
                  createTask.onGatedClick();
                }}
              />
            </div>
          )}
        </DetailCard>

        <TaskDrawer
          taskId={openTaskId}
          open={drawerOpen}
          onClose={handleCloseDrawer}
          onTaskUpdated={invalidateProjectTasks}
        />
        <CreateProjectTaskModal
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          projectId={projectId}
          preselectedStatus={createPreselectedStatus}
        />
      </>
    );
  },
);

ProjectTasksTab.displayName = 'ProjectTasksTab';
