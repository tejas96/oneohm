'use client';

import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import InboxIcon from '@mui/icons-material/Inbox';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import {
  MY_TASKS_PROJECT_LAZY_GROUP_THRESHOLD,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from '@tejas96/shared/constants';
import { type MyTaskListItem, TaskPriority, TaskStatus } from '@tejas96/shared/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  MY_TASKS_ADDRESS_DEBOUNCE_MS,
  MY_TASKS_SEARCH_DEBOUNCE_MS,
  VISIBLE_GROUPS_BATCH,
} from '../constants';
import { useMyTasks, useUpdateTaskStatus, type GroupByMode, type MyTaskFilters } from '../hooks';
import { MyTasksFilterBar } from './my-tasks-filter-bar';
import { MyTasksGroupSection } from './my-tasks-group-section';
import { MyTasksSkeleton, SummaryChipsSkeleton } from './my-tasks-skeleton';
import { useCollapsedGroups } from '../hooks/use-collapsed-groups';
import { useTaskKeyboardNav } from '../hooks/use-task-keyboard-nav';

import { TaskDrawer, useUpdateTask } from '@/components/features/tasks';
import { myTasksSummaryKeys } from '@/components/features/tasks/hooks/use-my-tasks-summary';
import { EmptyState, ErrorState } from '@/components/shared/feedback/empty-state';
import { showToast } from '@/components/ui/sonner';
import { useDebounce, useUrlFilters } from '@/lib/hooks';
import { useGatedAction } from '@/lib/rbac';

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
  address: '',
};

// ---------------------------------------------------------------------------
// Summary stat pill
// ---------------------------------------------------------------------------

interface StatPillProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  /** Semantic accent, applied only when the count is non-zero. */
  tone: 'neutral' | 'danger' | 'warning' | 'success';
  active?: boolean;
  onClick?: () => void;
}

const STAT_TONE: Record<StatPillProps['tone'], { ink: string; tint: string }> = {
  neutral: { ink: 'var(--ds-text-secondary)', tint: 'var(--ds-canvas-sunken)' },
  danger: { ink: 'var(--ds-danger)', tint: 'var(--ds-danger-bg)' },
  warning: { ink: 'var(--ds-warning)', tint: 'var(--ds-warning-bg)' },
  success: { ink: 'var(--ds-success)', tint: 'var(--ds-success-bg)' },
};

function StatPill({ icon, label, value, tone, active, onClick }: StatPillProps): React.JSX.Element {
  // A zero count carries no urgency, so it drops back to neutral.
  const accent = STAT_TONE[value > 0 ? tone : 'neutral'];
  const interactive = Boolean(onClick);

  return (
    <Box
      component={interactive ? 'button' : 'div'}
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={interactive ? Boolean(active) : undefined}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        height: 36,
        pl: 0.75,
        pr: 1.5,
        border: 'none',
        borderRadius: 'var(--radius-pill)',
        cursor: interactive ? 'pointer' : 'default',
        bgcolor: active ? accent.tint : 'var(--ds-surface)',
        boxShadow: active ? 'none' : 'var(--shadow-e1)',
        transition:
          'background-color var(--dur-micro) var(--ease-standard), box-shadow var(--dur-micro)',
        '&:hover': interactive
          ? {
              bgcolor: active ? accent.tint : 'var(--ds-surface-alt)',
              boxShadow: 'var(--shadow-e2)',
            }
          : undefined,
      }}
    >
      {/* Signature circular icon container */}
      <Box
        aria-hidden="true"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          flexShrink: 0,
          borderRadius: '50%',
          color: accent.ink,
          bgcolor: accent.tint,
          '& .MuiSvgIcon-root': { fontSize: 14 },
        }}
      >
        {icon}
      </Box>
      <Box
        component="span"
        sx={{
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          fontWeight: 600,
          lineHeight: 1,
          color: value > 0 ? accent.ink : 'var(--ds-text-primary)',
        }}
      >
        {value}
      </Box>
      <Box
        component="span"
        sx={{
          fontSize: '12px',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          color: 'var(--ds-text-secondary)',
        }}
      >
        {label}
      </Box>
    </Box>
  );
}

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
  const queryClient = useQueryClient();
  const { filters: urlFilters, setFilter } = useUrlFilters(MY_TASKS_URL_DEFAULTS);

  const projectFilter = urlFilters.projectId;
  const statusFilter = urlFilters.status;
  const priorityFilter = urlFilters.priority;
  const dueDateFilter = urlFilters.dueDateFilter;
  const groupBy = (urlFilters.groupBy || 'dueDate') as GroupByMode;
  const [searchInput, setSearchInput] = useState(urlFilters.search || '');
  const debouncedSearch = useDebounce(searchInput, MY_TASKS_SEARCH_DEBOUNCE_MS);
  const [addressInput, setAddressInput] = useState(urlFilters.address || '');
  const debouncedAddress = useDebounce(addressInput, MY_TASKS_ADDRESS_DEBOUNCE_MS);

  const textFiltersReady = searchInput === debouncedSearch && addressInput === debouncedAddress;

  // Keep a ref to setFilter so the sync effect always has a stable dep array.
  // setFilter itself is stable (empty useCallback deps in useUrlFilters) but React's
  // rules-of-hooks require the array to never change length between renders.
  const setFilterRef = useRef(setFilter);
  setFilterRef.current = setFilter;

  // Sync debounced search value into URL so the search param survives navigation / sharing.
  useEffect(() => {
    setFilterRef.current('search', debouncedSearch);
  }, [debouncedSearch]);

  useEffect(() => {
    setFilterRef.current('address', debouncedAddress);
  }, [debouncedAddress]);

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
      address: debouncedAddress || undefined,
    }),
    [
      groupBy,
      statusFilter,
      priorityFilter,
      projectFilter,
      debouncedSearch,
      dueDateFilter,
      debouncedAddress,
    ],
  );

  const { data, isLoading, isFetching, isPlaceholderData, isError, refetch } = useMyTasks(filters, {
    enabled: textFiltersReady,
  });
  const updateStatus = useUpdateTaskStatus();
  const updateTask = useUpdateTask();

  const summary = data?.summary;
  const groups = data?.groups ?? [];
  const projectsForFilter = data?.allProjects ?? [];

  const isLazyProjectGroups =
    groupBy === 'project' && groups.length > MY_TASKS_PROJECT_LAZY_GROUP_THRESHOLD;

  const [visibleGroupCount, setVisibleGroupCount] = useState(VISIBLE_GROUPS_BATCH);
  const [groupTasksCache, setGroupTasksCache] = useState<Record<string, MyTaskListItem[]>>({});

  useEffect(() => {
    setVisibleGroupCount(VISIBLE_GROUPS_BATCH);
    setGroupTasksCache({});
  }, [
    filters.groupBy,
    filters.status,
    filters.priority,
    filters.projectId,
    filters.search,
    filters.dueDateFilter,
    filters.address,
    groupBy,
  ]);

  const visibleGroups = useMemo(
    () => (groupBy === 'project' ? groups.slice(0, visibleGroupCount) : groups),
    [groups, groupBy, visibleGroupCount],
  );

  const handleTasksLoaded = useCallback((groupKey: string, tasks: MyTaskListItem[]) => {
    setGroupTasksCache((prev) => ({ ...prev, [groupKey]: tasks }));
  }, []);

  // keepPreviousData shows stale groups while refetching — hide them and show loading instead.
  const isListRefreshing = isFetching && isPlaceholderData;
  const showListLoading = isLoading || isListRefreshing;
  const isSearchDebouncing = searchInput !== debouncedSearch;
  const isAddressDebouncing = addressInput !== debouncedAddress;
  const isSearchPending = isSearchDebouncing || isListRefreshing;
  const isAddressPending = isAddressDebouncing || isListRefreshing;

  // Clear stale deep-linked projectId once data loads and the id is not actionable.
  useEffect(() => {
    if (!projectFilter || showListLoading) return;
    const isKnownProject = projectsForFilter.some((p) => p.id === projectFilter);
    if (!isKnownProject) {
      setFilter('projectId', '');
    }
  }, [projectFilter, projectsForFilter, showListLoading, setFilter]);

  // Collapse state
  const groupKeys = useMemo(() => groups.map((g) => g.key), [groups]);
  const { isExpanded, canLazyFetch, toggle, expandAll, expandOnly, collapseAll, allExpanded } =
    useCollapsedGroups(groupBy, groupKeys, { lazyProjectGroups: isLazyProjectGroups });

  // Reuse grouped summary for nav badge cache — avoids a duplicate /tasks/my/summary call.
  useEffect(() => {
    if (!summary) return;
    queryClient.setQueryData(myTasksSummaryKeys.all(), summary);
  }, [summary, queryClient]);

  // All tasks flat for keyboard nav indexing
  const allTasks = useMemo(() => {
    if (!isLazyProjectGroups) {
      return groups.flatMap((g) => g.tasks);
    }
    return visibleGroups.flatMap((g) => (isExpanded(g.key) ? (groupTasksCache[g.key] ?? []) : []));
  }, [groups, visibleGroups, isLazyProjectGroups, groupTasksCache, isExpanded]);

  // Project filter options
  const projectFilterOptions = useMemo(
    () => [
      { value: '', label: 'All Projects' },
      ...projectsForFilter.map((p) => ({ value: p.id, label: `${p.projectNumber}: ${p.name}` })),
    ],
    [projectsForFilter],
  );

  const statusFilterOptions = useMemo((): Array<{ value: string; label: string }> => {
    return [
      { value: '', label: 'All Status' },
      ...TASK_STATUS_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
    ];
  }, []);

  const priorityFilterOptions = useMemo((): Array<{ value: string; label: string }> => {
    return [
      { value: '', label: 'All Priority' },
      ...TASK_PRIORITY_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
    ];
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      setFilter(key as keyof typeof MY_TASKS_URL_DEFAULTS, value);
    },
    [setFilter],
  );

  const handleExpandAll = useCallback(() => {
    if (isLazyProjectGroups) {
      expandOnly(visibleGroups.map((g) => g.key));
      if (groups.length > visibleGroups.length) {
        showToast.info(
          `Expanded ${visibleGroups.length} visible groups. Load more groups to expand the rest.`,
        );
      }
      return;
    }
    expandAll();
  }, [expandAll, expandOnly, groups.length, isLazyProjectGroups, visibleGroups]);

  const handleCollapseAll = useCallback(() => {
    collapseAll();
  }, [collapseAll]);

  const handleClearFilters = useCallback(() => {
    setFilter({
      projectId: '',
      status: '',
      priority: '',
      search: '',
      dueDateFilter: '',
      address: '',
    });
    setSearchInput('');
    setAddressInput('');
  }, [setFilter]);
  const manageTasks = useGatedAction('projects.tasks.manage', () => undefined, 'Update task');

  const handleMarkDone = useCallback(
    (taskId: string) => {
      if (!manageTasks.allowed) {
        manageTasks.onGatedClick();
        return;
      }
      updateStatus.mutate({ taskId, status: TaskStatus.DONE });
    },
    [updateStatus],
  );

  const handleStartTask = useCallback(
    (taskId: string) => {
      if (!manageTasks.allowed) {
        manageTasks.onGatedClick();
        return;
      }
      updateStatus.mutate({ taskId, status: TaskStatus.IN_PROGRESS });
    },
    [updateStatus],
  );

  const handleOpenDrawer = useCallback((task: MyTaskListItem) => {
    setDrawerTaskId(task.id);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleInlineStatusChange = useCallback(
    (taskId: string, newStatus: string, _currentStatus: string, _currentCompletionPct: number) => {
      if (!manageTasks.allowed) {
        manageTasks.onGatedClick();
        return;
      }
      updateTask.mutate({ taskId, status: newStatus as TaskStatus });
    },
    [updateTask],
  );

  const handleInlinePriorityChange = useCallback(
    (taskId: string, newPriority: string) => {
      updateTask.mutate({ taskId, priority: newPriority as TaskPriority });
    },
    [updateTask],
  );

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
      const canDone = task.status !== TaskStatus.DONE && !task.hasDependencyBlockers;
      if (canDone) handleMarkDone(task.id);
    },
    [allTasks, handleMarkDone],
  );

  const keyboardStartTask = useCallback(
    (index: number) => {
      const task = allTasks[index];
      if (!task) return;
      const canStart = task.status !== TaskStatus.IN_PROGRESS && !task.hasDependencyBlockers;
      if (canStart) handleStartTask(task.id);
    },
    [allTasks, handleStartTask],
  );

  const { focusedIndex, containerRef } = useTaskKeyboardNav({
    totalTasks: allTasks.length,
    onOpenDrawer: keyboardOpenDrawer,
    onMarkDone: keyboardMarkDone,
    onStartTask: keyboardStartTask,
    onExpandAll: handleExpandAll,
    onCollapseAll: handleCollapseAll,
    searchInputRef,
    drawerOpen,
    onCloseDrawer: handleCloseDrawer,
  });

  const focusedTaskId = focusedIndex >= 0 ? allTasks[focusedIndex]?.id : undefined;

  const hasActiveFilters =
    projectFilter ||
    statusFilter ||
    priorityFilter ||
    debouncedSearch ||
    dueDateFilter ||
    debouncedAddress;
  const morningBrief =
    !showListLoading && summary && !briefDismissed
      ? getMorningBrief(summary.overdue, summary.dueToday)
      : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-3">
      {/* Header band — title and today's brief on the left, counts on the right */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          px: 2.5,
          py: 2,
          borderRadius: 'var(--radius-card-functional)',
          bgcolor: 'var(--ds-surface)',
          boxShadow: 'var(--shadow-e2)',
        }}
      >
        {/* Ambient brand bloom — atmosphere only, never a fill */}
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            top: -140,
            right: -60,
            width: 320,
            height: 320,
            pointerEvents: 'none',
            background: 'var(--gradient-glow)',
            opacity: 0.7,
          }}
        />

        <Box sx={{ position: 'relative', minWidth: 0 }}>
          <Typography
            component="h1"
            sx={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}
          >
            My tasks
          </Typography>
          {morningBrief ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Typography sx={{ fontSize: '13px', color: 'var(--ds-text-secondary)' }}>
                {morningBrief}
              </Typography>
              <IconButton
                size="small"
                aria-label="Dismiss today's brief"
                onClick={() => setBriefDismissed(true)}
                sx={{
                  width: 18,
                  height: 18,
                  color: 'var(--ds-text-tertiary)',
                  '&:hover': { color: 'var(--ds-text-secondary)' },
                }}
              >
                <CloseIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Box>
          ) : (
            <Typography sx={{ fontSize: '13px', color: 'var(--ds-text-secondary)', mt: 0.5 }}>
              Everything assigned to you, across every project
            </Typography>
          )}
        </Box>

        {/* Summary counts — each one is also a filter */}
        <Box sx={{ position: 'relative', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {showListLoading ? (
            <SummaryChipsSkeleton />
          ) : (
            summary && (
              <>
                <StatPill
                  icon={<FormatListBulletedIcon />}
                  label="Total"
                  value={summary.total}
                  tone="neutral"
                  active={!dueDateFilter}
                  onClick={handleClearFilters}
                />
                <StatPill
                  icon={<WarningAmberIcon />}
                  label="Overdue"
                  value={summary.overdue}
                  tone="danger"
                  active={dueDateFilter === 'overdue'}
                  onClick={() => {
                    setFilter({
                      status: '',
                      priority: '',
                      dueDateFilter: dueDateFilter === 'overdue' ? '' : 'overdue',
                    });
                  }}
                />
                <StatPill
                  icon={<CalendarTodayIcon />}
                  label="Due today"
                  value={summary.dueToday}
                  tone="warning"
                  active={dueDateFilter === 'dueToday'}
                  onClick={() => {
                    setFilter({
                      status: '',
                      priority: '',
                      dueDateFilter: dueDateFilter === 'dueToday' ? '' : 'dueToday',
                    });
                  }}
                />
                <StatPill
                  icon={<CheckCircleOutlineIcon />}
                  label="Done this week"
                  value={summary.completedThisWeek}
                  tone="success"
                />
              </>
            )
          )}
        </Box>
      </Box>

      {/* Filter Row — search first, then dropdowns */}
      <MyTasksFilterBar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchInputRef={searchInputRef}
        addressInput={addressInput}
        onAddressChange={setAddressInput}
        projectFilter={projectFilter}
        projectFilterOptions={projectFilterOptions}
        statusFilter={statusFilter}
        statusFilterOptions={statusFilterOptions}
        priorityFilter={priorityFilter}
        priorityFilterOptions={priorityFilterOptions}
        groupBy={groupBy}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={!!hasActiveFilters}
        isSearchPending={isSearchPending}
        isAddressPending={isAddressPending}
        allExpanded={allExpanded}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
      />

      {/* Error State */}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {/* Content */}
      {!isError && (
        <div ref={containerRef}>
          {showListLoading && <MyTasksSkeleton />}

          {/* Empty state */}
          {!showListLoading && groups.length === 0 && (
            <Box
              sx={{
                bgcolor: 'var(--ds-surface)',
                borderRadius: 'var(--radius-card-functional)',
                boxShadow: 'var(--shadow-e2)',
                overflow: 'hidden',
                px: 4,
                py: 6,
              }}
            >
              <EmptyState
                title={hasActiveFilters ? 'No tasks match these filters' : 'You are all caught up'}
                description={
                  hasActiveFilters
                    ? 'Widen the search, or clear the filters to see everything assigned to you.'
                    : 'Nothing is open on your plate right now. New tasks assigned to you land here.'
                }
                icon={<InboxIcon sx={{ width: '100%', height: '100%' }} />}
                iconColor={hasActiveFilters ? 'muted' : 'primary'}
                action={
                  hasActiveFilters
                    ? {
                        label: 'Clear filters',
                        onClick: handleClearFilters,
                      }
                    : undefined
                }
              />
            </Box>
          )}

          {/* Grouped Task List */}
          {!showListLoading && (
            <div className="space-y-1.5">
              {visibleGroups.map((group) => (
                <MyTasksGroupSection
                  key={group.key}
                  group={group}
                  filters={filters}
                  isLazyMode={isLazyProjectGroups}
                  expanded={isExpanded(group.key)}
                  onToggleExpand={() => toggle(group.key)}
                  onOpenDrawer={handleOpenDrawer}
                  onStatusChange={handleInlineStatusChange}
                  onPriorityChange={handleInlinePriorityChange}
                  focusedTaskId={focusedTaskId}
                  onTasksLoaded={handleTasksLoaded}
                  fetchEnabled={textFiltersReady}
                  lazyFetchAllowed={canLazyFetch(group.key)}
                />
              ))}
              {groupBy === 'project' && groups.length > visibleGroupCount && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() =>
                      setVisibleGroupCount((prev) =>
                        Math.min(prev + VISIBLE_GROUPS_BATCH, groups.length),
                      )
                    }
                    sx={{
                      borderRadius: 'var(--radius-pill)',
                      px: 2,
                      fontSize: '12px',
                      color: 'var(--ds-text-secondary)',
                      bgcolor: 'var(--ds-surface)',
                      boxShadow: 'var(--shadow-e1)',
                      '&:hover': {
                        bgcolor: 'var(--ds-surface)',
                        boxShadow: 'var(--shadow-e2)',
                        color: 'var(--ds-text-primary)',
                      },
                    }}
                  >
                    Load {groups.length - visibleGroupCount} more groups
                  </Button>
                </Box>
              )}
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
