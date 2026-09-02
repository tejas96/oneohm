'use client';

import { type TaskStatusOption } from '@tejas96/shared/constants';
import { type TaskPriority, TASK_PRIORITY_LABELS } from '@tejas96/shared/types';
import { ChevronDown, ChevronRight, ListChecks, Lock, Minus } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { TASK_PRIORITY_HEX_COLOR } from '../../../../constants';
import type { ProjectTaskItem } from '../../../../hooks/types';
import { ColorDotLabel, QuickSelect, type MUISelectOption } from '../../../quick-select';
import { ColumnHeader, EmptyPane, Mono, ROW_BLEED, TonePill } from '../../primitives';

import { MUIAvatar } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatDate, getDueDateColor } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────────────

interface TaskListTableProps {
  tasks: ProjectTaskItem[];
  taskStatuses: TaskStatusOption[];
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

// ── Module-level constants ──────────────────────────────────────────────────

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

const COLS_WITH_PHASE = 'md:grid-cols-[62px_minmax(0,1fr)_118px_100px_44px_84px_84px_104px]';
const COLS_WITHOUT_PHASE = 'md:grid-cols-[62px_minmax(0,1fr)_100px_44px_84px_84px_104px]';

/**
 * The readable half of a task code.
 *
 * Codes are `TSK-ONEOHM_EPC-2026-5995` — 24 characters, wider than any column
 * this table can spare, so the full code truncated to "TSK-ONEOHM…" and told
 * the reader nothing. Everything before the last segment is the same on every
 * row of every project, so the number is the only part that identifies a task.
 * The full code stays in the row's tooltip and in the drawer.
 */
function shortCode(code: string): string {
  const tail = code.slice(code.lastIndexOf('-') + 1);
  return tail && tail !== code ? `#${tail}` : code;
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function TableSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, groupIndex) => (
        <div key={groupIndex}>
          <Skeleton className="mb-2 h-3 w-28 rounded-md" />
          <div className="flex flex-col gap-1">
            {Array.from({ length: 3 }).map((_, rowIndex) => (
              <Skeleton key={rowIndex} className="h-11 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Column header ───────────────────────────────────────────────────────────

function TableHead({ hasPhase }: { hasPhase: boolean }): React.JSX.Element {
  return (
    <div
      className={cn(
        'hidden items-center gap-3 pb-1.5 pt-1 md:grid',
        ROW_BLEED,
        hasPhase ? COLS_WITH_PHASE : COLS_WITHOUT_PHASE,
      )}
    >
      <ColumnHeader>Key</ColumnHeader>
      <ColumnHeader>Task</ColumnHeader>
      {hasPhase ? <ColumnHeader>Phase</ColumnHeader> : null}
      <ColumnHeader>Priority</ColumnHeader>
      <ColumnHeader className="text-center">Who</ColumnHeader>
      <ColumnHeader>Due</ColumnHeader>
      <ColumnHeader>Progress</ColumnHeader>
      <ColumnHeader>Status</ColumnHeader>
    </div>
  );
}

// ── Row ─────────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  statusColor,
  statusLabel,
  hasPhase,
  onOpenTask,
  onStatusChange,
  onPriorityChange,
  statusOptions,
}: {
  task: ProjectTaskItem;
  statusColor: string;
  statusLabel: string;
  hasPhase: boolean;
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
  const priorityColor = TASK_PRIORITY_HEX_COLOR[task.priority] ?? '#94a3b8';
  const priorityLabel = TASK_PRIORITY_LABELS[task.priority];
  const dueDateColor = task.endDate ? getDueDateColor(task.endDate) : '';
  const isOverdue = dueDateColor.includes('error');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenTask(task.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenTask(task.id);
        }
      }}
      className={cn(
        // Zebra rather than a rule: rows separate by alternating luminance, the
        // DS's functional-density pattern. Hover deepens one step further so it
        // still reads over the striped row.
        'group flex cursor-pointer items-center gap-3 rounded-xl py-2 transition-colors duration-fast',
        ROW_BLEED,
        'even:bg-surface-alt hover:bg-background-tertiary',
        'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary',
        'md:grid md:gap-3',
        hasPhase ? COLS_WITH_PHASE : COLS_WITHOUT_PHASE,
      )}
    >
      <Mono className="shrink-0 truncate text-[11px] text-foreground-tertiary" title={task.code}>
        {shortCode(task.code)}
      </Mono>

      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            {task.isSpecial ? (
              <TonePill
                label="Change"
                tone="warning"
                className="h-[17px] px-1.5 text-[9.5px] uppercase tracking-[0.06em]"
              />
            ) : null}
            <span className="truncate text-[12.5px] font-medium text-foreground transition-colors group-hover:text-primary-dark">
              {task.name}
            </span>
            {task.hasDependencyBlockers ? (
              <Lock className="size-3 shrink-0 text-warning" aria-label="Waiting on a dependency" />
            ) : null}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" variant="dark" className="max-w-[280px]">
          {task.code}: {task.name}
          {task.hasDependencyBlockers ? ' — waiting on an unfinished dependency' : ''}
        </TooltipContent>
      </Tooltip>

      {hasPhase ? (
        <span className="hidden truncate text-[11.5px] text-foreground-secondary md:block">
          {task.milestoneName ?? <span className="text-foreground-muted">—</span>}
        </span>
      ) : null}

      <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
        {onPriorityChange ? (
          <QuickSelect
            pill
            value={task.priority}
            color={priorityColor}
            label={priorityLabel}
            options={PRIORITY_OPTIONS}
            onChange={(v) => onPriorityChange(task.id, v)}
          />
        ) : (
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: priorityColor }}
            />
            <span className="hidden text-[11.5px] text-foreground-secondary md:inline">
              {priorityLabel}
            </span>
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-center">
        {task.assigneeName ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <MUIAvatar name={task.assigneeName} size={24} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" variant="dark">
              {task.assigneeName}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="flex size-6 items-center justify-center rounded-full text-foreground-tertiary"
                style={{ background: 'var(--ds-canvas-sunken)' }}
              >
                <Minus className="size-2.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" variant="dark">
              Unassigned
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <Mono
        className={cn(
          'hidden shrink-0 text-[11.5px] md:block',
          task.endDate
            ? dueDateColor || 'text-foreground-secondary'
            : 'font-sans text-foreground-muted',
          isOverdue && 'font-semibold',
        )}
      >
        {task.endDate ? formatDate(task.endDate, 'short') : '—'}
      </Mono>

      <div className="hidden shrink-0 items-center gap-1.5 md:flex">
        <span
          aria-hidden
          className="h-1.5 w-11 overflow-hidden rounded-pill"
          style={{ background: 'var(--ds-canvas-sunken)' }}
        >
          <span
            className="block h-full rounded-pill transition-[width] duration-slow ease-out"
            style={{
              width: `${Math.min(100, Math.max(0, task.completionPercentage))}%`,
              background:
                task.completionPercentage >= 100 ? 'var(--ds-success)' : 'var(--ds-accent-ink)',
            }}
          />
        </span>
        <Mono className="w-7 text-right text-[10.5px] text-foreground-tertiary">
          {task.completionPercentage}%
        </Mono>
      </div>

      <div className="hidden shrink-0 items-center md:flex" onClick={(e) => e.stopPropagation()}>
        {onStatusChange ? (
          <QuickSelect
            pill
            value={task.status}
            color={statusColor}
            label={statusLabel}
            options={statusOptions}
            onChange={(v) => onStatusChange(task.id, v, task.status, task.completionPercentage)}
            disabled={Boolean(task.hasDependencyBlockers)}
          />
        ) : (
          <span
            className="inline-flex h-[23px] items-center gap-1.5 rounded-pill px-2.5 text-[11px] font-medium"
            style={{ background: `${statusColor}14`, color: statusColor }}
          >
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: statusColor }}
            />
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Group ───────────────────────────────────────────────────────────────────

function TaskGroupSection({
  group,
  hasPhase,
  onOpenTask,
  onStatusChange,
  onPriorityChange,
  statusOptions,
}: {
  group: TaskGroup;
  hasPhase: boolean;
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
  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  return (
    <div>
      {/* The overline device names the group. No grey bar, no rule under it —
          spacing and weight carry the separation. */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg py-2 text-left transition-colors duration-fast hover:bg-background-tertiary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary',
          ROW_BLEED,
        )}
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0 text-foreground-tertiary" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-foreground-tertiary" />
        )}
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: group.color }}
        />
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground-secondary">
          {group.label}
        </span>
        <Mono className="text-[11px] font-bold text-foreground-tertiary">{group.tasks.length}</Mono>
      </button>

      {expanded ? (
        <TooltipProvider delayDuration={300}>
          {group.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              statusColor={group.color}
              statusLabel={group.label}
              hasPhase={hasPhase}
              onOpenTask={onOpenTask}
              onStatusChange={onStatusChange}
              onPriorityChange={onPriorityChange}
              statusOptions={statusOptions}
            />
          ))}
        </TooltipProvider>
      ) : null}
    </div>
  );
}

// ── Table ───────────────────────────────────────────────────────────────────

export function TaskListTable({
  tasks,
  taskStatuses,
  isLoading,
  onOpenTask,
  onStatusChange,
  onPriorityChange,
  hasActiveFilters = false,
  onClearFilters,
}: TaskListTableProps): React.JSX.Element {
  // Tasks carry milestoneName directly — the Phase column only earns its width
  // when at least one task on the page has one.
  const hasPhase = tasks.some((t) => !!t.milestoneName);

  const statusOptions = useMemo<MUISelectOption[]>(
    () =>
      taskStatuses.map((s) => ({
        value: s.value,
        label: <ColorDotLabel color={s.color} label={s.label} />,
      })),
    [taskStatuses],
  );

  const groups = useMemo<TaskGroup[]>(() => {
    const statusMap = new Map<string, TaskStatusOption>(taskStatuses.map((s) => [s.value, s]));
    const groupMap = new Map<string, ProjectTaskItem[]>();

    for (const task of tasks) {
      const key = statusMap.has(task.status) ? task.status : '__other__';
      const existing = groupMap.get(key);
      if (existing) existing.push(task);
      else groupMap.set(key, [task]);
    }

    const sortSpecialFirst = (list: ProjectTaskItem[]): ProjectTaskItem[] =>
      [...list].sort((a, b) => Number(Boolean(b.isSpecial)) - Number(Boolean(a.isSpecial)));

    const result: TaskGroup[] = [];
    for (const s of taskStatuses) {
      const groupTasks = groupMap.get(s.value);
      if (groupTasks && groupTasks.length > 0) {
        result.push({
          code: s.value,
          label: s.label,
          color: s.color,
          tasks: sortSpecialFirst(groupTasks),
        });
      }
    }

    const other = groupMap.get('__other__');
    if (other && other.length > 0) {
      result.push({
        code: '__other__',
        label: 'Other',
        color: '#A8A29E',
        tasks: sortSpecialFirst(other),
      });
    }

    return result;
  }, [tasks, taskStatuses]);

  if (isLoading) return <TableSkeleton />;

  if (tasks.length === 0) {
    return (
      <EmptyPane
        size="page"
        icon={<ListChecks className="size-4" strokeWidth={2} />}
        title={hasActiveFilters ? 'Nothing matches those filters' : 'No tasks yet'}
        description={
          hasActiveFilters
            ? 'Widen the filters to see more of this project.'
            : 'Tasks arrive with the workflow when the project starts.'
        }
        action={
          hasActiveFilters && onClearFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex h-8 items-center rounded-pill bg-accent-subtle px-3.5 text-[12.5px] font-medium text-primary-dark transition-[filter] duration-fast hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Clear filters
            </button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div>
      <TableHead hasPhase={hasPhase} />
      {groups.map((group) => (
        <TaskGroupSection
          key={group.code}
          group={group}
          hasPhase={hasPhase}
          onOpenTask={onOpenTask}
          onStatusChange={onStatusChange}
          onPriorityChange={onPriorityChange}
          statusOptions={statusOptions}
        />
      ))}
    </div>
  );
}
