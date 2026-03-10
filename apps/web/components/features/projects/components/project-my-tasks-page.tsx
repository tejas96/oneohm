'use client';

import { TASK_STATUS_TRANSITIONS, TaskStatus } from '@oneohm-epc/shared-types';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Inbox,
  Search,
  X,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

import {
  TASK_GROUP_BY_OPTIONS,
  TASK_PRIORITY_FILTER_OPTIONS,
  TASK_STATUS_FILTER_OPTIONS,
} from '../constants';
import {
  useMyTasks,
  useUpdateTaskStatus,
  type GroupByMode,
  type MyTask,
  type MyTaskFilters,
} from '../hooks';
import { CollapsibleTaskGroup } from './collapsible-task-group';
import { useCollapsedGroups } from '../hooks/use-collapsed-groups';
import { useTaskKeyboardNav } from '../hooks/use-task-keyboard-nav';

import { TaskDrawer } from '@/components/features/tasks';
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
import { useDebounce, useUrlFilters } from '@/lib/hooks';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MY_TASKS_URL_DEFAULTS = {
  projectId: '',
  status: '',
  priority: '',
  groupBy: 'dueDate',
  search: '',
  dueDateFilter: '',
};

interface SummaryCard {
  key: string;
  label: string;
  getValue: (s: {
    total: number;
    overdue: number;
    dueToday: number;
    completedThisWeek: number;
  }) => number;
  bg: string;
  text: string;
  iconBg: string;
  icon: React.ReactNode;
}

const SUMMARY_CARDS: SummaryCard[] = [
  {
    key: 'total',
    label: 'Total Tasks',
    getValue: (s) => s.total,
    bg: 'bg-background',
    text: 'text-foreground',
    iconBg: 'bg-muted',
    icon: <ClipboardList className="size-4 text-foreground-secondary" />,
  },
  {
    key: 'overdue',
    label: 'Overdue',
    getValue: (s) => s.overdue,
    bg: 'bg-error/5',
    text: 'text-error',
    iconBg: 'bg-error/10',
    icon: <AlertTriangle className="size-4 text-error" />,
  },
  {
    key: 'dueToday',
    label: 'Due Today',
    getValue: (s) => s.dueToday,
    bg: 'bg-warning/5',
    text: 'text-warning',
    iconBg: 'bg-warning/10',
    icon: <Calendar className="size-4 text-warning" />,
  },
  {
    key: 'completedThisWeek',
    label: 'Done This Week',
    getValue: (s) => s.completedThisWeek,
    bg: 'bg-success/5',
    text: 'text-success',
    iconBg: 'bg-success/10',
    icon: <CheckCircle2 className="size-4 text-success" />,
  },
];

// ---------------------------------------------------------------------------
// Morning brief
// ---------------------------------------------------------------------------

function getMorningBrief(overdue: number, dueToday: number): string | null {
  if (overdue > 0 && dueToday > 0) {
    return `You have ${overdue} overdue task${overdue > 1 ? 's' : ''} and ${dueToday} due today. Focus on overdue first.`;
  }
  if (overdue > 0) {
    return `You have ${overdue} overdue task${overdue > 1 ? 's' : ''}. Address ${overdue > 1 ? 'them' : 'it'} as soon as possible.`;
  }
  if (dueToday > 0) {
    return `No overdue tasks. ${dueToday} task${dueToday > 1 ? 's' : ''} due today.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectMyTasksPage(): React.JSX.Element {
  const { filters: urlFilters, setFilter } = useUrlFilters(MY_TASKS_URL_DEFAULTS);

  const projectFilter = urlFilters.projectId;
  const statusFilter = urlFilters.status;
  const priorityFilter = urlFilters.priority;
  const dueDateFilter = urlFilters.dueDateFilter;
  const groupBy = (urlFilters.groupBy || 'dueDate') as GroupByMode;
  const [searchInput, setSearchInput] = useState(urlFilters.search || '');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Drawer state
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [briefDismissed, setBriefDismissed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Data
  const filters: MyTaskFilters = useMemo(
    () => ({
      groupBy,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      projectId: projectFilter || undefined,
      search: debouncedSearch || undefined,
      dueDateFilter: (dueDateFilter as MyTaskFilters['dueDateFilter']) || undefined,
    }),
    [groupBy, statusFilter, priorityFilter, projectFilter, debouncedSearch, dueDateFilter],
  );

  const { data, isLoading, isError, refetch } = useMyTasks(filters);
  const updateStatus = useUpdateTaskStatus();

  const summary = data?.summary;
  const groups = data?.groups ?? [];
  const projects = summary?.projects ?? [];

  // All tasks flat for keyboard nav indexing
  const allTasks = useMemo(() => groups.flatMap((g) => g.tasks), [groups]);

  // Collapse state
  const groupKeys = useMemo(() => groups.map((g) => g.key), [groups]);
  const { isExpanded, toggle, expandAll, collapseAll, allExpanded } = useCollapsedGroups(
    groupBy,
    groupKeys,
  );

  // Project filter options
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

  const handleClearFilters = useCallback(() => {
    setFilter({ projectId: '', status: '', priority: '', search: '', dueDateFilter: '' });
    setSearchInput('');
  }, [setFilter]);

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

  const handleStartTask = useCallback(
    (taskId: string) => {
      updateStatus.mutate({ taskId, status: TaskStatus.IN_PROGRESS });
    },
    [updateStatus],
  );

  const handleOpenDrawer = useCallback((task: MyTask) => {
    setDrawerTaskId(task.id);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // Keyboard nav
  const keyboardOpenDrawer = useCallback(
    (index: number) => {
      const task = allTasks[index];
      if (task) handleOpenDrawer(task);
    },
    [allTasks, handleOpenDrawer],
  );

  const keyboardMarkDone = useCallback(
    (index: number) => {
      const task = allTasks[index];
      if (!task) return;
      const canDone = (TASK_STATUS_TRANSITIONS[task.status] ?? []).includes(TaskStatus.DONE);
      if (canDone) handleMarkDone(task.id);
    },
    [allTasks, handleMarkDone],
  );

  const keyboardStartTask = useCallback(
    (index: number) => {
      const task = allTasks[index];
      if (!task) return;
      const canStart = (TASK_STATUS_TRANSITIONS[task.status] ?? []).includes(
        TaskStatus.IN_PROGRESS,
      );
      if (canStart) handleStartTask(task.id);
    },
    [allTasks, handleStartTask],
  );

  const { focusedIndex, containerRef } = useTaskKeyboardNav({
    totalTasks: allTasks.length,
    onOpenDrawer: keyboardOpenDrawer,
    onMarkDone: keyboardMarkDone,
    onStartTask: keyboardStartTask,
    onExpandAll: expandAll,
    onCollapseAll: collapseAll,
    searchInputRef,
    drawerOpen,
    onCloseDrawer: handleCloseDrawer,
  });

  const focusedTaskId = focusedIndex >= 0 ? allTasks[focusedIndex]?.id : undefined;

  const hasActiveFilters =
    projectFilter || statusFilter || priorityFilter || debouncedSearch || dueDateFilter;
  const morningBrief =
    summary && !briefDismissed ? getMorningBrief(summary.overdue, summary.dueToday) : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-3">
      {/* Page Header + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-foreground">My Tasks</h1>
          <p className="text-sm text-foreground-secondary mt-0.5">
            All tasks assigned to you across projects
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-foreground-muted" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search tasks... (press /)"
            className="w-full rounded-lg border border-border-light bg-background pl-8 pr-3 h-8 text-sm placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border-light p-3">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-7 w-10" />
            </div>
          ))}
        </div>
      ) : (
        summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SUMMARY_CARDS.map((card) => (
              <div
                key={card.key}
                className={cn(
                  'rounded-lg border border-border-light px-3 py-2.5 transition-colors hover:shadow-sm',
                  card.bg,
                  card.key !== 'completedThisWeek' && 'cursor-pointer',
                )}
                onClick={() => {
                  if (card.key === 'overdue') {
                    setFilter({
                      status: '',
                      priority: '',
                      dueDateFilter: dueDateFilter === 'overdue' ? '' : 'overdue',
                    });
                  }
                  if (card.key === 'dueToday') {
                    setFilter({
                      status: '',
                      priority: '',
                      dueDateFilter: dueDateFilter === 'dueToday' ? '' : 'dueToday',
                    });
                  }
                  if (card.key === 'total') {
                    handleClearFilters();
                  }
                }}
                role={card.key !== 'completedThisWeek' ? 'button' : undefined}
                tabIndex={card.key !== 'completedThisWeek' ? 0 : undefined}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={cn('flex items-center justify-center size-6 rounded', card.iconBg)}
                  >
                    {card.icon}
                  </div>
                  <span className="text-xs text-foreground-secondary">{card.label}</span>
                </div>
                <span className={cn('text-2xl font-semibold tabular-nums', card.text)}>
                  {card.getValue(summary)}
                </span>
              </div>
            ))}
          </div>
        )
      )}

      {/* Morning Brief Banner */}
      {morningBrief && (
        <div className="flex items-center justify-between rounded-lg border border-info/20 bg-info/5 px-3 py-2">
          <p className="text-sm text-foreground-secondary">{morningBrief}</p>
          <button
            type="button"
            onClick={() => setBriefDismissed(true)}
            className="text-foreground-muted hover:text-foreground-secondary shrink-0 ml-3"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
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

        <Select
          value={priorityFilter || 'all'}
          onValueChange={(v) => handleFilterChange('priority', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TASK_PRIORITY_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || 'all'} value={opt.value || 'all'}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={groupBy} onValueChange={(v) => handleFilterChange('groupBy', v)}>
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

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-foreground-secondary h-8"
          >
            <X className="mr-1 size-3" />
            Clear
          </Button>
        )}

        {/* Expand/Collapse All */}
        <Button
          variant="ghost"
          size="sm"
          onClick={allExpanded ? collapseAll : expandAll}
          className="text-foreground-tertiary h-8 ml-auto"
        >
          {allExpanded ? (
            <>
              <ChevronUp className="mr-1 size-3" />
              Collapse All
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 size-3" />
              Expand All
            </>
          )}
        </Button>
      </div>

      {/* Error State */}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {/* Content */}
      {!isError && (
        <div ref={containerRef}>
          {/* Loading skeletons */}
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, gi) => (
                <div key={gi}>
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="size-4" />
                    <Skeleton className="size-2.5 rounded-full" />
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
                          onClick: handleClearFilters,
                        }
                      : undefined
                  }
                />
              </div>
            </div>
          )}

          {/* Grouped Task List - Jira-style collapsible */}
          {!isLoading && (
            <div className="space-y-1.5">
              {groups.map((group) => (
                <CollapsibleTaskGroup
                  key={group.key}
                  groupKey={group.key}
                  label={group.label}
                  count={group.count}
                  tasks={group.tasks}
                  expanded={isExpanded(group.key)}
                  onToggleExpand={() => toggle(group.key)}
                  onOpenDrawer={handleOpenDrawer}
                  onStatusChange={handleStatusChange}
                  onMarkDone={handleMarkDone}
                  onStartTask={handleStartTask}
                  focusedTaskId={focusedTaskId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task Detail Drawer (reusable) */}
      <TaskDrawer
        taskId={drawerTaskId}
        open={drawerOpen}
        onClose={handleCloseDrawer}
        onTaskUpdated={() => void refetch()}
      />
    </div>
  );
}
