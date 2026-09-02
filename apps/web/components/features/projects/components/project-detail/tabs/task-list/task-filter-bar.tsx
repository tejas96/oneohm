'use client';

import type { TaskPriorityOption, TaskStatusOption } from '@tejas96/shared/constants';
import { Check, Flag, Layers, SlidersHorizontal, X } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';

import { UNASSIGNED_TASK_FILTER, type TaskListFilters } from '../../../../constants';
import type { TeamMemberSummary } from '../../../../hooks';
import type { MilestoneAggregateItem } from '../../../../hooks/types';
import { TeamAvatarGroup } from '../../../team-avatar-group';
import { FilterButton, Toolbar } from '../../primitives';

import { SearchInput } from '@/components/shared/search';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface TaskFilterBarProps {
  filters: TaskListFilters;
  setFilter: (key: keyof TaskListFilters, value: string) => void;
  clearFilters: () => void;
  taskStatuses: TaskStatusOption[];
  priorityOptions: TaskPriorityOption[];
  avatarMembers: TeamMemberSummary[];
  milestones: Pick<MilestoneAggregateItem, 'name' | 'order'>[];
}

interface Choice {
  value: string;
  label: string;
  color?: string;
}

/**
 * One option inside a filter popover. A tick marks the choice rather than a
 * border or a fill, so the list reads as a menu and not as a row of chips.
 */
function OptionRow({
  choice,
  selected,
  onSelect,
}: {
  choice: Choice;
  selected: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition-colors duration-fast hover:bg-background-tertiary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary',
        selected ? 'font-semibold text-foreground' : 'text-foreground-secondary',
      )}
    >
      {choice.color ? (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ background: choice.color }}
        />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{choice.label}</span>
      {selected ? (
        <Check className="size-3.5 shrink-0 text-primary-dark" strokeWidth={2.5} />
      ) : null}
    </button>
  );
}

function FilterPopover({
  icon,
  label,
  choices,
  value,
  onChange,
  width = 'w-56',
}: {
  icon: React.ReactNode;
  label: string;
  choices: Choice[];
  value: string;
  onChange: (value: string) => void;
  width?: string;
}): React.JSX.Element {
  const active = choices.find((c) => c.value === value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <FilterButton
          icon={icon}
          label={label}
          value={active?.label ?? null}
          onClear={active ? () => onChange('') : undefined}
        />
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className={cn('p-1.5 shadow-e3', width)}>
        <OptionRow
          choice={{ value: '', label: `All ${label.toLowerCase()}` }}
          selected={!value}
          onSelect={() => onChange('')}
        />
        {choices.map((choice) => (
          <OptionRow
            key={choice.value}
            choice={choice}
            selected={value === choice.value}
            onSelect={() => onChange(choice.value)}
          />
        ))}
      </PopoverContent>
    </Popover>
  );
}

/**
 * The task filters.
 *
 * Each control states its own chosen value, so the row of removable chips this
 * toolbar used to draw underneath is gone — it restated exactly what the
 * buttons above it were already showing, and cost a line of the screen to do
 * it. Clearing is now on the control that set the filter.
 */
export function TaskFilterBar({
  filters,
  setFilter,
  clearFilters,
  taskStatuses,
  priorityOptions,
  avatarMembers,
  milestones,
}: TaskFilterBarProps): React.JSX.Element {
  // Every filter change resets to page 1: staying on page 4 of a narrower
  // result set shows an empty table and reads as "no matches".
  const handleSetFilter = useCallback(
    (key: keyof TaskListFilters, value: string) => {
      setFilter(key, value);
      if (key !== 't_page') setFilter('t_page', '1');
    },
    [setFilter],
  );

  const handleToggleAssignee = useCallback(
    (memberId: string) => {
      handleSetFilter('t_assignee', filters.t_assignee === memberId ? '' : memberId);
    },
    [filters.t_assignee, handleSetFilter],
  );

  const selectedAssigneeIds = useMemo(
    () => (filters.t_assignee ? new Set([filters.t_assignee]) : new Set<string>()),
    [filters.t_assignee],
  );

  const statusChoices = useMemo<Choice[]>(
    () => taskStatuses.map((s) => ({ value: String(s.value), label: s.label, color: s.color })),
    [taskStatuses],
  );
  const priorityChoices = useMemo<Choice[]>(
    () => priorityOptions.map((p) => ({ value: String(p.value), label: p.label, color: p.color })),
    [priorityOptions],
  );
  const phaseChoices = useMemo<Choice[]>(
    () => milestones.map((m) => ({ value: m.name, label: m.name })),
    [milestones],
  );

  const activeCount =
    (filters.t_search ? 1 : 0) +
    (filters.t_status ? 1 : 0) +
    (filters.t_priority ? 1 : 0) +
    (filters.t_assignee ? 1 : 0) +
    (filters.t_milestone ? 1 : 0);

  return (
    <Toolbar>
      <SearchInput
        value={filters.t_search}
        onSearch={(v) => handleSetFilter('t_search', v)}
        placeholder="Search tasks"
        size="sm"
        className="w-full sm:w-52"
      />

      <FilterPopover
        icon={<SlidersHorizontal />}
        label="Status"
        choices={statusChoices}
        value={filters.t_status}
        onChange={(v) => handleSetFilter('t_status', v)}
        width="w-52"
      />

      <FilterPopover
        icon={<Flag />}
        label="Priority"
        choices={priorityChoices}
        value={filters.t_priority}
        onChange={(v) => handleSetFilter('t_priority', v)}
        width="w-48"
      />

      {/* Only when the project actually has phases — an empty menu is a dead control. */}
      {phaseChoices.length > 0 ? (
        <FilterPopover
          icon={<Layers />}
          label="Phase"
          choices={phaseChoices}
          value={filters.t_milestone}
          onChange={(v) => handleSetFilter('t_milestone', v)}
          width="w-64"
        />
      ) : null}

      <TeamAvatarGroup
        members={avatarMembers}
        extraMembers={[{ id: UNASSIGNED_TASK_FILTER, displayName: 'Unassigned', initials: '?' }]}
        max={5}
        size="xs"
        selectable
        selectedIds={selectedAssigneeIds}
        onToggle={handleToggleAssignee}
        onClear={() => handleSetFilter('t_assignee', '')}
      />

      {activeCount > 1 ? (
        <button
          type="button"
          onClick={clearFilters}
          className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill px-3 text-[12.5px] font-medium text-foreground-secondary transition-colors duration-fast hover:bg-background-tertiary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X className="size-3" aria-hidden />
          Clear all
        </button>
      ) : null}
    </Toolbar>
  );
}
