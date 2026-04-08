'use client';

import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import InboxIcon from '@mui/icons-material/Inbox';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { LookupTypeCode, TaskStatus } from '@oneohm-epc/shared/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TASK_GROUP_BY_OPTIONS } from '../constants';
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
  const { filters: urlFilters, setFilter } = useUrlFilters(MY_TASKS_URL_DEFAULTS);

  const projectFilter = urlFilters.projectId;
  const statusFilter = urlFilters.status;
  const priorityFilter = urlFilters.priority;
  const dueDateFilter = urlFilters.dueDateFilter;
  const groupBy = (urlFilters.groupBy || 'dueDate') as GroupByMode;
  const [searchInput, setSearchInput] = useState(urlFilters.search || '');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Keep a ref to setFilter so the sync effect always has a stable dep array.
  // setFilter itself is stable (empty useCallback deps in useUrlFilters) but React's
  // rules-of-hooks require the array to never change length between renders.
  const setFilterRef = useRef(setFilter);
  setFilterRef.current = setFilter;

  // Sync debounced search value into URL so the search param survives navigation / sharing.
  useEffect(() => {
    setFilterRef.current('search', debouncedSearch);
  }, [debouncedSearch]);

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

  const handleClearFilters = useCallback(() => {
    setFilter({
      projectId: '',
      status: '',
      priority: '',
      search: '',
      dueDateFilter: '',
    });
    setSearchInput('');
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
      {isLoading ? (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={110} height={32} />
          ))}
        </Box>
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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
        {/* Search */}
        <TextField
          inputRef={searchInputRef}
          size="small"
          placeholder="Search tasks… (press /)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          sx={{ width: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        {/* Project filter */}
        <FormControl size="small" sx={{ width: 192 }}>
          <InputLabel shrink>Project</InputLabel>
          <Select
            label="Project"
            displayEmpty
            notched
            value={projectFilter || ''}
            onChange={(e) => handleFilterChange('projectId', e.target.value as string)}
          >
            {projectFilterOptions.map((opt) => (
              <MenuItem key={opt.value || '__all__'} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Status filter — driven by DEFAULT_TASK_STATUS lookup */}
        <FormControl size="small" sx={{ width: 144 }}>
          <InputLabel shrink>Status</InputLabel>
          <Select
            label="Status"
            displayEmpty
            notched
            value={statusFilter || ''}
            onChange={(e) => handleFilterChange('status', e.target.value as string)}
          >
            {statusFilterOptions.map((opt) => (
              <MenuItem key={opt.value || '__all__'} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Priority filter */}
        <FormControl size="small" sx={{ width: 144 }}>
          <InputLabel shrink>Priority</InputLabel>
          <Select
            label="Priority"
            displayEmpty
            notched
            value={priorityFilter || ''}
            onChange={(e) => handleFilterChange('priority', e.target.value as string)}
          >
            {priorityFilterOptions.map((opt) => (
              <MenuItem key={opt.value || '__all__'} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Group By */}
        <FormControl size="small" sx={{ width: 176 }}>
          <InputLabel shrink>Group By</InputLabel>
          <Select
            label="Group By"
            displayEmpty
            notched
            value={groupBy}
            onChange={(e) => handleFilterChange('groupBy', e.target.value as string)}
          >
            {TASK_GROUP_BY_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Chip
            label="Clear"
            size="small"
            variant="outlined"
            onDelete={handleClearFilters}
            onClick={handleClearFilters}
          />
        )}

        {/* Expand / Collapse All */}
        <Tooltip title={allExpanded ? 'Collapse all' : 'Expand all'}>
          <IconButton
            size="small"
            onClick={allExpanded ? collapseAll : expandAll}
            sx={{ ml: 'auto' }}
          >
            {allExpanded ? (
              <KeyboardArrowUpIcon fontSize="small" />
            ) : (
              <KeyboardArrowDownIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Error State */}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {/* Content */}
      {!isError && (
        <div ref={containerRef}>
          {/* Loading skeletons */}
          {isLoading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Array.from({ length: 3 }).map((_, gi) => (
                <Box key={gi}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Skeleton variant="rectangular" width={14} height={14} />
                    <Skeleton variant="circular" width={10} height={10} />
                    <Skeleton variant="text" width={96} height={16} />
                    <Skeleton variant="rounded" width={32} height={20} />
                  </Box>
                  <Box
                    sx={{
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      overflow: 'hidden',
                    }}
                  >
                    {Array.from({ length: 3 }).map((_, ri) => (
                      <Box
                        key={ri}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          px: 2,
                          py: 1.5,
                          borderBottom: ri < 2 ? '1px solid' : 'none',
                          borderColor: 'divider',
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width={160} height={12} sx={{ mb: 0.5 }} />
                          <Skeleton variant="text" width={224} height={16} />
                        </Box>
                        <Skeleton variant="text" width={64} height={12} sx={{ ml: 2 }} />
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* Empty state */}
          {!isLoading && groups.length === 0 && (
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
