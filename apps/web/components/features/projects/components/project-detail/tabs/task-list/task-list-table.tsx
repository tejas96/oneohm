'use client';

import {
  type TaskPriority,
  type TaskStatusConfig,
  TASK_PRIORITY_LABELS,
} from '@oneohm-epc/shared/types';
import { ChevronDown, ChevronRight, Minus } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { TASK_PRIORITY_DOT_COLOR, TASK_PRIORITY_HEX_COLOR } from '../../../../constants';
import type { ProjectDetail, ProjectMilestone, ProjectTaskItem } from '../../../../hooks/types';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MUISelect, type MUISelectOption } from '@/components/ui/mui-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatDate, getDueDateColor, getInitials } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────────────

interface TaskListTableProps {
  tasks: ProjectTaskItem[];
  taskStatuses: TaskStatusConfig[];
  project: ProjectDetail;
  isLoading: boolean;
  onOpenTask: (taskId: string) => void;
  onStatusChange?: (
    taskId: string,
    status: string,
    currentStatus: string,
    currentCompletionPct: number,
  ) => void;
  onPriorityChange?: (taskId: string, priority: string) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

interface TaskGroup {
  code: string;
  label: string;
  color: string;
  tasks: ProjectTaskItem[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getMilestoneName(
  milestoneId: string | undefined,
  milestones: ProjectMilestone[],
): string | null {
  if (!milestoneId) return null;
  return milestones.find((m) => m.id === milestoneId)?.name ?? null;
}

// ── Shared primitives ────────────────────────────────────────────────────────

/** Dot + label used in both select trigger (renderValue) and menu items (options). */
function ColorDotLabel({ color, label }: { color: string; label: string }): React.JSX.Element {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span
        style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          flexShrink: 0,
          backgroundColor: color,
        }}
      />
      <span style={{ fontSize: '11px', fontWeight: 500 }}>{label}</span>
    </span>
  );
}

/**
 * Compact inline select for quick field updates directly from the task row.
 * Uses ColorDotLabel for both the trigger and each menu item.
 */
function QuickSelect({
  value,
  color,
  label,
  options,
  onChange,
}: {
  value: string;
  color: string;
  label: string;
  options: MUISelectOption[];
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <MUISelect
      value={value}
      onChange={(e) => onChange(e.target.value as string)}
      size="small"
      variant="outlined"
      formControlProps={{
        size: 'small',
        sx: {
          minWidth: '92px',
          maxWidth: '100%',
          '& .MuiOutlinedInput-root': {
            fontSize: '11px',
            height: '24px',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: `${color}30` },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: `${color}60` },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: color },
          },
          '& .MuiSelect-select': {
            padding: '2px 8px',
            color,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          },
        },
      }}
      renderValue={() => <ColorDotLabel color={color} label={label} />}
      options={options}
    />
  );
}

// ── Module-level constants ────────────────────────────────────────────────────

// Built once at module load. Object.keys keeps insertion order for string keys
// (guaranteed in V8 and consistent across all modern JS engines).
const PRIORITY_OPTIONS: MUISelectOption[] = (
  Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]
).map((code) => ({
  value: code,
  label: (
    <ColorDotLabel
      color={TASK_PRIORITY_HEX_COLOR[code] ?? '#94a3b8'}
      label={TASK_PRIORITY_LABELS[code]}
    />
  ),
}));

const HEADER_GRID_COLS_WITH_MILESTONES = 'grid-cols-[72px_1fr_112px_96px_56px_88px_78px_104px]';
const HEADER_GRID_COLS_WITHOUT_MILESTONES = 'grid-cols-[72px_1fr_96px_56px_88px_78px_104px]';
const ROW_GRID_COLS_WITH_MILESTONES = 'md:grid-cols-[72px_1fr_112px_96px_56px_88px_78px_104px]';
const ROW_GRID_COLS_WITHOUT_MILESTONES = 'md:grid-cols-[72px_1fr_96px_56px_88px_78px_104px]';

// ── Skeleton ────────────────────────────────────────────────────────────────

function TableSkeleton(): React.JSX.Element {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {Array.from({ length: 3 }).map((_, groupIdx) => (
        <div key={groupIdx}>
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          {Array.from({ length: 3 }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="flex items-center gap-3 px-3 py-3 border-b border-border-light last:border-0"
            >
              <Skeleton className="h-3 w-14 shrink-0" />
              <Skeleton className="h-3 flex-1 max-w-xs" />
              <Skeleton className="h-3 w-20 shrink-0" />
              <Skeleton className="h-3 w-16 shrink-0" />
              <Skeleton className="h-5 w-5 rounded-full shrink-0" />
              <Skeleton className="h-3 w-20 shrink-0" />
              <Skeleton className="h-2 w-16 rounded shrink-0" />
              <Skeleton className="h-5 w-20 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Column Header ────────────────────────────────────────────────────────────

function TableHeader({ hasMilestones }: { hasMilestones: boolean }): React.JSX.Element {
  return (
    <div
      className={cn(
        'hidden md:grid items-center gap-3 px-3 py-2 bg-muted/30 border-b border-border text-2xs font-medium text-foreground-tertiary uppercase tracking-wide',
        hasMilestones ? HEADER_GRID_COLS_WITH_MILESTONES : HEADER_GRID_COLS_WITHOUT_MILESTONES,
      )}
    >
      <span className="truncate">Key</span>
      <span className="truncate">Summary</span>
      {hasMilestones && <span className="truncate">Milestone</span>}
      <span className="truncate">Priority</span>
      <span className="truncate">Assignee</span>
      <span className="truncate">Due date</span>
      <span className="truncate">Progress</span>
      <span className="truncate">Status</span>
    </div>
  );
}

// ── Task Row ────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  milestones,
  statusColor,
  statusLabel,
  hasMilestones,
  onOpenTask,
  onStatusChange,
  onPriorityChange,
  statusOptions,
}: {
  task: ProjectTaskItem;
  milestones: ProjectMilestone[];
  statusColor: string;
  statusLabel: string;
  hasMilestones: boolean;
  onOpenTask: (id: string) => void;
  onStatusChange?: (
    taskId: string,
    status: string,
    currentStatus: string,
    currentCompletionPct: number,
  ) => void;
  onPriorityChange?: (taskId: string, priority: string) => void;
  statusOptions: MUISelectOption[];
}): React.JSX.Element {
  const milestoneName = getMilestoneName(task.milestoneId, milestones);
  const priorityDot = TASK_PRIORITY_DOT_COLOR[task.priority] ?? 'bg-foreground-tertiary';
  const priorityColor = TASK_PRIORITY_HEX_COLOR[task.priority] ?? '#94a3b8';
  const priorityLabel = TASK_PRIORITY_LABELS[task.priority];
  const initials = task.assigneeName ? getInitials(task.assigneeName) : null;
  const dueDateColor = task.endDate ? getDueDateColor(task.endDate) : '';
  const isOverdue = dueDateColor.includes('error');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenTask(task.id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpenTask(task.id)}
      className={cn(
        'group flex items-center gap-3 px-3 py-2.5 border-b border-border-light last:border-0',
        'cursor-pointer hover:bg-muted/40 transition-colors duration-fast',
        'md:grid md:gap-3',
        hasMilestones ? ROW_GRID_COLS_WITH_MILESTONES : ROW_GRID_COLS_WITHOUT_MILESTONES,
      )}
    >
      {/* Key */}
      <span className="text-2xs font-mono text-foreground-secondary shrink-0 truncate">
        {task.code}
      </span>

      {/* Summary */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-xs font-medium text-foreground truncate flex-1 min-w-0 group-hover:text-primary transition-colors">
            {task.name}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" variant="dark" className="max-w-[280px]">
          {task.code}: {task.name}
        </TooltipContent>
      </Tooltip>

      {/* Milestone (conditional) */}
      {hasMilestones && (
        <span className="text-2xs text-foreground-secondary truncate hidden md:block">
          {milestoneName ?? <span className="text-foreground-tertiary italic">—</span>}
        </span>
      )}

      {/* Priority — select when handler provided, static badge otherwise */}
      <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
        {onPriorityChange ? (
          <QuickSelect
            value={task.priority}
            color={priorityColor}
            label={priorityLabel}
            options={PRIORITY_OPTIONS}
            onChange={(v) => onPriorityChange(task.id, v)}
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full shrink-0', priorityDot)} />
            <span className="text-2xs text-foreground-secondary capitalize hidden md:inline">
              {task.priority}
            </span>
          </div>
        )}
      </div>

      {/* Assignee */}
      <div className="shrink-0 flex items-center justify-center">
        {initials ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Avatar size="xs" className="size-6">
                  <AvatarFallback size="xs" name={task.assigneeName} className="text-[9px]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" variant="dark">
              {task.assigneeName}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center justify-center size-6 rounded-full border border-dashed border-border text-foreground-tertiary">
                <Minus className="h-2.5 w-2.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" variant="dark">
              Unassigned
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Due date */}
      <span
        className={cn(
          'text-2xs shrink-0 hidden md:block',
          task.endDate
            ? dueDateColor || 'text-foreground-secondary'
            : 'text-foreground-tertiary italic',
          isOverdue && 'font-medium',
        )}
      >
        {task.endDate ? formatDate(task.endDate, 'short') : '—'}
      </span>

      {/* Progress */}
      <div className="items-center gap-1.5 shrink-0 hidden md:flex">
        <div className="w-12 h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${task.completionPercentage}%` }}
          />
        </div>
        <span className="text-2xs text-foreground-secondary w-6 text-right">
          {task.completionPercentage}%
        </span>
      </div>

      {/* Status — select when handler provided, static badge otherwise */}
      <div className="shrink-0 hidden md:flex items-center" onClick={(e) => e.stopPropagation()}>
        {onStatusChange ? (
          <QuickSelect
            value={task.status}
            color={statusColor}
            label={statusLabel}
            options={statusOptions}
            onChange={(v) => onStatusChange(task.id, v, task.status, task.completionPercentage)}
          />
        ) : (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-medium"
            style={{
              backgroundColor: `${statusColor}15`,
              borderColor: `${statusColor}30`,
              color: statusColor,
            }}
          >
            <span
              className="inline-block size-1.5 rounded-full shrink-0"
              style={{ backgroundColor: statusColor }}
            />
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Group ────────────────────────────────────────────────────────────────────

function TaskGroupSection({
  group,
  milestones,
  hasMilestones,
  onOpenTask,
  onStatusChange,
  onPriorityChange,
  statusOptions,
}: {
  group: TaskGroup;
  milestones: ProjectMilestone[];
  hasMilestones: boolean;
  onOpenTask: (id: string) => void;
  onStatusChange?: (
    taskId: string,
    status: string,
    currentStatus: string,
    currentCompletionPct: number,
  ) => void;
  onPriorityChange?: (taskId: string, priority: string) => void;
  statusOptions: MUISelectOption[];
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(true);
  const toggle = useCallback(() => setExpanded((p) => !p), []);

  return (
    <div>
      {/* Group header */}
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/40 hover:bg-muted/70 border-b border-border transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-foreground-secondary shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-foreground-secondary shrink-0" />
        )}
        <span
          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: group.color }}
        />
        <span className="text-xs font-semibold" style={{ color: group.color }}>
          {group.label}
        </span>
        <span
          className="text-2xs font-medium px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: `${group.color}20`, color: group.color }}
        >
          {group.tasks.length}
        </span>
      </button>

      {/* Task rows */}
      {expanded && (
        <TooltipProvider delayDuration={300}>
          {group.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              milestones={milestones}
              statusColor={group.color}
              statusLabel={group.label}
              hasMilestones={hasMilestones}
              onOpenTask={onOpenTask}
              onStatusChange={onStatusChange}
              onPriorityChange={onPriorityChange}
              statusOptions={statusOptions}
            />
          ))}
        </TooltipProvider>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function TaskListTable({
  tasks,
  taskStatuses,
  project,
  isLoading,
  onOpenTask,
  onStatusChange,
  onPriorityChange,
  hasActiveFilters = false,
  onClearFilters,
}: TaskListTableProps): React.JSX.Element {
  const milestones = project.milestones;
  const hasMilestones = milestones.length > 0;

  const statusOptions = useMemo<MUISelectOption[]>(
    () =>
      taskStatuses.map((s) => ({
        value: s.code,
        label: <ColorDotLabel color={s.color} label={s.label} />,
      })),
    [taskStatuses],
  );

  const groups = useMemo<TaskGroup[]>(() => {
    if (taskStatuses.length === 0) {
      return tasks.length > 0 ? [{ code: 'other', label: 'Other', color: '#94a3b8', tasks }] : [];
    }

    const statusMap = new Map<string, TaskStatusConfig>(taskStatuses.map((s) => [s.code, s]));
    const groupMap = new Map<string, ProjectTaskItem[]>();

    for (const task of tasks) {
      const key = statusMap.has(task.status) ? task.status : '__other__';
      const existing = groupMap.get(key);
      if (existing) {
        existing.push(task);
      } else {
        groupMap.set(key, [task]);
      }
    }

    const result: TaskGroup[] = [];
    for (const s of taskStatuses) {
      const groupTasks = groupMap.get(s.code);
      if (groupTasks && groupTasks.length > 0) {
        result.push({ code: s.code, label: s.label, color: s.color, tasks: groupTasks });
      }
    }

    const other = groupMap.get('__other__');
    if (other && other.length > 0) {
      result.push({ code: '__other__', label: 'Other', color: '#94a3b8', tasks: other });
    }

    return result;
  }, [tasks, taskStatuses]);

  if (isLoading) return <TableSkeleton />;

  if (tasks.length === 0) {
    return (
      <div className="border border-border rounded-lg flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-sm text-foreground-secondary">
          {hasActiveFilters ? 'No tasks match the current filters.' : 'No tasks yet.'}
        </span>
        {hasActiveFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <TableHeader hasMilestones={hasMilestones} />
      {groups.map((group) => (
        <TaskGroupSection
          key={group.code}
          group={group}
          milestones={milestones}
          hasMilestones={hasMilestones}
          onOpenTask={onOpenTask}
          onStatusChange={onStatusChange}
          onPriorityChange={onPriorityChange}
          statusOptions={statusOptions}
        />
      ))}
    </div>
  );
}
