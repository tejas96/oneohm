'use client';

import { useQueryClient } from '@tanstack/react-query';
import { LookupTypeCode, TaskStatus, type TaskPriority } from '@tejas96/shared/types';
import React, { useCallback, useMemo, useState } from 'react';

import { CreateProjectTaskModal } from './create-project-task-modal';
import { TaskListTable, TaskListToolbar, TaskBoardView } from './task-list';
import {
  TASK_LIST_FILTER_DEFAULTS,
  TASKS_PAGE_SIZE,
  PROJECT_TASKS_QUERY_KEY,
  PROJECT_MILESTONE_AGG_QUERY_KEY,
  UNASSIGNED_TASK_FILTER,
  TASK_VIEW_MODES,
  type TaskListFilters,
  type TaskViewMode,
} from '../../../constants';
import {
  type TeamMemberSummary,
  useProjectMilestones,
  useProjectTaskList,
  useProjectTaskStatuses,
  useProjectTeam,
} from '../../../hooks';
import type { ProjectDetail } from '../../../hooks/types';

import { TaskDrawer } from '@/components/features/tasks';
import { useUpdateTask } from '@/components/features/tasks/hooks';
import { TablePagination } from '@/components/shared/data-table/pagination';
import { ErrorState } from '@/components/shared/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { useLookupOptions } from '@/lib/hooks/resources';
import { useUrlFilters } from '@/lib/hooks/use-url-filters';
import { useGatedAction } from '@/lib/rbac';
import { cn, getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

/** Statuses where the backend auto-sets completionPercentage = 100.
 *  Any task that ever reached these statuses will have completionPercentage = 100
 *  in the DB until we explicitly reset it. */
const FINAL_STATUSES = new Set<string>([TaskStatus.DONE, TaskStatus.CANCELLED]);

interface ProjectTasksTabProps {
  projectId: string;
  project: ProjectDetail;
  isActive: boolean;
}

export const ProjectTasksTab = React.memo(
  ({ projectId, project: _project, isActive }: ProjectTasksTabProps): React.JSX.Element => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { filters, setFilter, clearFilters } =
      useUrlFilters<TaskListFilters>(TASK_LIST_FILTER_DEFAULTS);
    const page = Math.max(1, parseInt(filters.t_page, 10) || 1);

    // View mode from URL, defaulting to list
    const view = (filters.t_view || TASK_VIEW_MODES.LIST) as TaskViewMode;

    // Handle view change and sync to URL
    const handleViewChange = useCallback(
      (newView: TaskViewMode) => {
        setFilter('t_view', newView);
      },
      [setFilter],
    );

    const { taskStatuses, isLoading: statusesLoading } = useProjectTaskStatuses(projectId);
    const { items: priorityOptions } = useLookupOptions(LookupTypeCode.PRIORITY, isActive);

    const {
      data: taskListData,
      isLoading,
      isError,
      error,
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

    // Drawer state
    const [openTaskId, setOpenTaskId] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createPreselectedStatus, setCreatePreselectedStatus] = useState<string | null>(null);

    // One gate for both ways into the create dialog — the header button and the
    // "+" on each kanban column. Gating only the header would leave the board
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

    const handleCloseDrawer = useCallback(() => {
      setDrawerOpen(false);
    }, []);

    const handleStatusChange = useCallback(
      (taskId: string, newStatus: string, _currentStatus: string, currentCompletionPct: number) => {
        // The backend only auto-sets completionPercentage on final status transitions (done/cancelled → 100).
        // It never auto-resets it when moving back to an active status. So any task that was ever
        // "done" or "cancelled" retains completionPercentage = 100 in the DB indefinitely.
        // Fix: whenever moving to a non-final status and the task is at 100%, explicitly send 0.
        const completionPercentage =
          !FINAL_STATUSES.has(newStatus) && currentCompletionPct === 100 ? 0 : undefined;

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

    if (isError) {
      return (
        <ErrorState
          title="Failed to load tasks"
          description={getErrorMessage(error)}
          onRetry={() => refetch()}
        />
      );
    }

    const tasks = taskListData?.data ?? [];
    const meta = taskListData?.meta;

    return (
      <>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Project Tasks</h3>
            <Button
              size="sm"
              onClick={createTask.onGatedClick}
              aria-disabled={!createTask.allowed}
              className={cn(!createTask.allowed && 'opacity-50')}
            >
              + Add Task
            </Button>
          </div>

          {/* Toolbar */}
          <TaskListToolbar
            filters={filters}
            setFilter={setFilter}
            clearFilters={clearFilters}
            taskStatuses={taskStatuses}
            priorityOptions={priorityOptions}
            avatarMembers={avatarMembers}
            milestones={milestones}
            totalTasks={meta?.total}
            view={view}
            onViewChange={handleViewChange}
          />

          {/* Conditional View Rendering */}
          {view === TASK_VIEW_MODES.LIST ? (
            <>
              {/* Table */}
              <TaskListTable
                tasks={tasks}
                taskStatuses={taskStatuses}
                isLoading={isLoading || statusesLoading}
                onOpenTask={handleOpenTask}
                onStatusChange={handleStatusChange}
                onPriorityChange={handlePriorityChange}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearFilters}
              />

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <TablePagination
                  currentPage={page}
                  totalPages={meta.totalPages}
                  totalItems={meta.total}
                  itemLabel="tasks"
                  pageSize={TASKS_PAGE_SIZE}
                  variant="simple"
                  onPageChange={(p) => setFilter('t_page', String(p))}
                />
              )}
            </>
          ) : (
            /* Board View */
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
          )}
        </div>

        {/* Task Drawer */}
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
          taskStatuses={taskStatuses}
          preselectedStatus={createPreselectedStatus}
        />
      </>
    );
  },
);

ProjectTasksTab.displayName = 'ProjectTasksTab';
