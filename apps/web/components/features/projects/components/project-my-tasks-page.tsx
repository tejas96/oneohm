'use client';

import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import InboxIcon from '@mui/icons-material/Inbox';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { MY_TASKS_PROJECT_LAZY_GROUP_THRESHOLD } from '@tejas96/shared/constants';
import {
  type MyTaskListItem,
  LookupTypeCode,
  TaskPriority,
  TaskStatus,
} from '@tejas96/shared/types';
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
import { useLookupOptions } from '@/lib/hooks/resources';

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
  const {
    items: taskStatusItems,
    isLoading: statusLoading,
    isError: statusError,
  } = useLookupOptions(LookupTypeCode.DEFAULT_TASK_STATUS);
  const {
    items: taskPriorityItems,
    isLoading: priorityLoading,
    isError: priorityError,
  } = useLookupOptions(LookupTypeCode.PRIORITY);

  const summary = data?.summary;
  const groups = data?.groups ?? [];
  const projectMeta = data?.projectMeta ?? {};
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
    if (statusLoading || statusError || taskStatusItems.length === 0) {
      return [{ value: '', label: statusError ? 'Failed to load statuses' : 'All Status' }];
    }
    return [
      { value: '', label: 'All Status' },
      ...taskStatusItems.map((item) => ({ value: item.value, label: item.label })),
    ];
  }, [statusError, statusLoading, taskStatusItems]);

  const priorityFilterOptions = useMemo((): Array<{ value: string; label: string }> => {
    if (priorityLoading || priorityError || taskPriorityItems.length === 0) {
      return [{ value: '', label: priorityError ? 'Failed to load priorities' : 'All Priority' }];
    }
    return [
      { value: '', label: 'All Priority' },
      ...taskPriorityItems.map((item) => ({ value: item.value, label: item.label })),
    ];
  }, [priorityError, priorityLoading, taskPriorityItems]);

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

  const handleOpenDrawer = useCallback((task: MyTaskListItem) => {
    setDrawerTaskId(task.id);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleInlineStatusChange = useCallback(
    (taskId: string, newStatus: string, _currentStatus: string, _currentCompletionPct: number) => {
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
      {/* Page Header */}
      <div>
        <Typography variant="h6" fontWeight={600}>
          My Tasks
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          All tasks assigned to you across projects
        </Typography>
      </div>

      {/* Summary Stat Chips */}
      {showListLoading ? (
        <SummaryChipsSkeleton />
      ) : (
        summary && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {/* Total */}
            <Chip
              icon={<FormatListBulletedIcon fontSize="small" />}
              label={`${summary.total} Total`}
              size="small"
              variant={dueDateFilter ? 'outlined' : 'filled'}
              onClick={handleClearFilters}
              sx={{ cursor: 'pointer' }}
            />
            {/* Overdue */}
            <Chip
              icon={<WarningAmberIcon fontSize="small" />}
              label={`${summary.overdue} Overdue`}
              size="small"
              color={summary.overdue > 0 ? 'error' : 'default'}
              variant={dueDateFilter === 'overdue' ? 'filled' : 'outlined'}
              onClick={() =>
                setFilter({
                  status: '',
                  priority: '',
                  dueDateFilter: dueDateFilter === 'overdue' ? '' : 'overdue',
                })
              }
              sx={{ cursor: 'pointer' }}
            />
            {/* Due Today */}
            <Chip
              icon={<CalendarTodayIcon fontSize="small" />}
              label={`${summary.dueToday} Due Today`}
              size="small"
              color={summary.dueToday > 0 ? 'warning' : 'default'}
              variant={dueDateFilter === 'dueToday' ? 'filled' : 'outlined'}
              onClick={() =>
                setFilter({
                  status: '',
                  priority: '',
                  dueDateFilter: dueDateFilter === 'dueToday' ? '' : 'dueToday',
                })
              }
              sx={{ cursor: 'pointer' }}
            />
            {/* Done This Week */}
            <Chip
              icon={<CheckCircleOutlineIcon fontSize="small" />}
              label={`${summary.completedThisWeek} Done This Week`}
              size="small"
              color={summary.completedThisWeek > 0 ? 'success' : 'default'}
              variant="outlined"
            />
          </Box>
        )
      )}

      {/* Morning Brief Banner */}
      {morningBrief && (
        <Alert severity="info" onClose={() => setBriefDismissed(true)} sx={{ py: 0.5 }}>
          {morningBrief}
        </Alert>
      )}

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
        sx={{ mt: 1 }}
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
                bgcolor: 'background.paper',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
                p: 4,
              }}
            >
              <EmptyState
                title="No tasks assigned to you"
                description={
                  hasActiveFilters
                    ? 'No tasks match the selected filters. Try different filter options.'
                    : 'You don\u2019t have any incomplete tasks right now. Tasks assigned to you will appear here.'
                }
                icon={<InboxIcon sx={{ width: '100%', height: '100%' }} />}
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
                  projectMeta={projectMeta}
                  onTasksLoaded={handleTasksLoaded}
                  fetchEnabled={textFiltersReady}
                  lazyFetchAllowed={canLazyFetch(group.key)}
                />
              ))}
              {groupBy === 'project' && groups.length > visibleGroupCount && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      setVisibleGroupCount((prev) =>
                        Math.min(prev + VISIBLE_GROUPS_BATCH, groups.length),
                      )
                    }
                  >
                    Load more groups ({groups.length - visibleGroupCount} remaining)
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
