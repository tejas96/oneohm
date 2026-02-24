'use client';

import { TaskStatus } from '@oneohm-epc/shared-types';
import { AlertTriangle, Calendar, CheckCircle2, ClipboardList, Inbox, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import {
  TASK_GROUP_BY_OPTIONS,
  TASK_GROUP_VARIANT_MAP,
  TASK_STATUS_FILTER_OPTIONS,
} from '../constants';
import {
  useMyTasks,
  useUpdateTaskStatus,
  type GroupByMode,
  type MyTask,
  type MyTaskFilters,
  type MyTasksGroup,
} from '../hooks';
import { TaskDetailDrawer } from './task-detail-drawer';
import { TaskRow } from './task-row';

import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useUrlFilters } from '@/lib/hooks';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MY_TASKS_URL_DEFAULTS = {
  projectId: '',
  status: '',
  groupBy: 'dueDate',
};

const INITIAL_VISIBLE_COUNT = 5;

const DEFAULT_GROUP_VARIANT = {
  dot: 'bg-foreground-tertiary',
  border: 'border-border-light',
  badge: 'secondary',
};

// ---------------------------------------------------------------------------
// Summary card config
// ---------------------------------------------------------------------------

interface SummaryCard {
  label: string;
  getValue: (s: { total: number; overdue: number; dueToday: number; completedThisWeek: number }) => number;
  bg: string;
  text: string;
  icon: React.ReactNode;
}

const SUMMARY_CARDS: SummaryCard[] = [
  {
    label: 'Total Tasks',
    getValue: (s) => s.total,
    bg: 'bg-background',
    text: 'text-foreground',
    icon: <ClipboardList className="size-4 text-foreground-tertiary" />,
  },
  {
    label: 'Overdue',
    getValue: (s) => s.overdue,
    bg: 'bg-error/5',
    text: 'text-error',
    icon: <AlertTriangle className="size-4 text-error" />,
  },
  {
    label: 'Due Today',
    getValue: (s) => s.dueToday,
    bg: 'bg-warning/5',
    text: 'text-warning',
    icon: <Calendar className="size-4 text-warning" />,
  },
  {
    label: 'Completed This Week',
    getValue: (s) => s.completedThisWeek,
    bg: 'bg-success/5',
    text: 'text-success',
    icon: <CheckCircle2 className="size-4 text-success" />,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectMyTasksPage(): React.JSX.Element {
  const { filters: urlFilters, setFilter, clearFilters: clearUrlFilters } =
    useUrlFilters(MY_TASKS_URL_DEFAULTS);

  const projectFilter = urlFilters.projectId;
  const statusFilter = urlFilters.status;
  const groupBy = (urlFilters.groupBy || 'dueDate') as GroupByMode;

  // Drawer state
  const [drawerTask, setDrawerTask] = useState<MyTask | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Expand/collapse per group (client-side "show more")
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Data
  const filters: MyTaskFilters = useMemo(
    () => ({
      groupBy,
      status: statusFilter || undefined,
      projectId: projectFilter || undefined,
    }),
    [groupBy, statusFilter, projectFilter],
  );

  const { data, isLoading, isError, refetch } = useMyTasks(filters);
  const updateStatus = useUpdateTaskStatus();

  const summary = data?.summary;
  const groups = data?.groups ?? [];
  const projects = summary?.projects ?? [];

  // Project filter options derived from summary.projects (always unfiltered)
  const projectFilterOptions = useMemo(
    () => [
      { value: '', label: 'All Projects' },
      ...projects.map((p) => ({ value: p.id, label: `${p.projectNumber}: ${p.name}` })),
    ],
    [projects],
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      setFilter(key as keyof typeof MY_TASKS_URL_DEFAULTS, value);
    },
    [setFilter],
  );

  const handleStatusChange = useCallback(
    (taskId: string, status: TaskStatus) => {
      updateStatus.mutate({ taskId, status });
    },
    [updateStatus],
  );

  const handleMarkDone = useCallback(
    (taskId: string) => {
      updateStatus.mutate({ taskId, status: TaskStatus.DONE });
    },
    [updateStatus],
  );

  const handleOpenDrawer = useCallback((task: MyTask) => {
    setDrawerTask(task);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleCompleteFromDrawer = useCallback(
    (taskId: string) => {
      updateStatus.mutate({ taskId, status: TaskStatus.DONE });
      setDrawerOpen(false);
    },
    [updateStatus],
  );

  const toggleGroupExpansion = useCallback((key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const hasActiveFilters = projectFilter || statusFilter;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* Page Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">My Tasks</h1>
          <p className="text-sm text-foreground-secondary mt-0.5">
            All tasks assigned to you across projects
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Project Filter */}
          <Select
            value={projectFilter || 'all'}
            onValueChange={(v) => handleFilterChange('projectId', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-48 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projectFilterOptions.map((opt) => (
                <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={statusFilter || 'all'}
            onValueChange={(v) => handleFilterChange('status', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Group By */}
          <Select
            value={groupBy}
            onValueChange={(v) => handleFilterChange('groupBy', v)}
          >
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_GROUP_BY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearUrlFilters()}
              className="text-foreground-secondary h-8"
            >
              <X className="mr-1 size-3" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border-light p-4">
              <Skeleton className="h-3 w-24 mb-3" />
              <Skeleton className="h-7 w-10" />
            </div>
          ))}
        </div>
      ) : (
        summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SUMMARY_CARDS.map((card) => (
              <div
                key={card.label}
                className={cn(
                  'rounded-lg border border-border-light p-4',
                  card.bg,
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn('text-sm', card.text)}>{card.label}</span>
                  <span className={cn('text-2xl font-semibold', card.text)}>
                    {card.getValue(summary)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Error State */}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {/* Content */}
      {!isError && (
        <>
          {/* Loading skeletons */}
          {isLoading && (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, gi) => (
                <div key={gi}>
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="size-3 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-8 rounded-full" />
                  </div>
                  <div className="bg-background rounded-lg border border-border-light overflow-hidden">
                    {Array.from({ length: 3 }).map((_, ri) => (
                      <div
                        key={ri}
                        className="flex items-center px-4 py-3 border-b border-border-light last:border-b-0"
                      >
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-40" />
                          <Skeleton className="h-4 w-56" />
                        </div>
                        <Skeleton className="h-3 w-16 ml-4" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && groups.length === 0 && (
            <div className="bg-background rounded-lg border border-border-light overflow-hidden">
              <div className="p-8">
                <EmptyState
                  title="No tasks assigned to you"
                  description={
                    hasActiveFilters
                      ? 'No tasks match the selected filters. Try different filter options.'
                      : 'You don\u2019t have any incomplete tasks right now. Tasks assigned to you will appear here.'
                  }
                  icon={<Inbox className="w-full h-full" />}
                  iconColor={hasActiveFilters ? 'muted' : 'primary'}
                  action={
                    hasActiveFilters
                      ? {
                          label: 'Clear Filters',
                          onClick: () => clearUrlFilters(),
                        }
                      : undefined
                  }
                />
              </div>
            </div>
          )}

          {/* Grouped Task List */}
          {!isLoading &&
            groups.map((group) => (
              <TaskGroup
                key={group.key}
                group={group}
                expanded={expandedGroups[group.key] ?? false}
                onToggleExpand={() => toggleGroupExpansion(group.key)}
                onOpenDrawer={handleOpenDrawer}
                onStatusChange={handleStatusChange}
                onMarkDone={handleMarkDone}
              />
            ))}
        </>
      )}

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={drawerTask}
        open={drawerOpen}
        onClose={handleCloseDrawer}
        onComplete={handleCompleteFromDrawer}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// TaskGroup sub-component
// ---------------------------------------------------------------------------

interface TaskGroupProps {
  group: MyTasksGroup;
  expanded: boolean;
  onToggleExpand: () => void;
  onOpenDrawer: (task: MyTask) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onMarkDone: (taskId: string) => void;
}

function TaskGroup({
  group,
  expanded,
  onToggleExpand,
  onOpenDrawer,
  onStatusChange,
  onMarkDone,
}: TaskGroupProps): React.JSX.Element {
  const variant = TASK_GROUP_VARIANT_MAP[group.key] ?? DEFAULT_GROUP_VARIANT;
  const visibleTasks = expanded
    ? group.tasks
    : group.tasks.slice(0, INITIAL_VISIBLE_COUNT);
  const hiddenCount = group.tasks.length - INITIAL_VISIBLE_COUNT;

  return (
    <div>
      {/* Group header */}
      <div className="flex items-center gap-2 mb-3">
        <span className={cn('size-3 rounded-full', variant.dot)} />
        <h2 className="text-sm font-semibold uppercase">{group.label}</h2>
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full font-medium',
            variant.badge === 'error' && 'bg-error/10 text-error',
            variant.badge === 'warning' && 'bg-warning/10 text-warning',
            variant.badge === 'info' && 'bg-info/10 text-info',
            variant.badge === 'success' && 'bg-success/10 text-success',
            variant.badge === 'secondary' && 'bg-muted text-foreground-tertiary',
          )}
        >
          {group.count}
        </span>
      </div>

      {/* Tasks container */}
      <div
        className={cn(
          'bg-background rounded-lg border overflow-hidden',
          variant.border,
        )}
      >
        {visibleTasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onOpenDrawer={onOpenDrawer}
            onStatusChange={onStatusChange}
            onMarkDone={onMarkDone}
          />
        ))}

        {/* Show more / less toggle */}
        {hiddenCount > 0 && (
          <div className="text-center py-3 border-t border-border-light">
            <button
              type="button"
              onClick={onToggleExpand}
              className="text-xs text-foreground-tertiary hover:text-foreground-secondary transition-colors"
            >
              {expanded
                ? 'Show less'
                : `Show ${hiddenCount} more\u2026`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
