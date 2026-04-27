'use client';

import { Flag, Milestone, Search, SlidersHorizontal, X } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';

import { TaskViewToggle } from './task-view-toggle';
import { UNASSIGNED_TASK_FILTER, type TaskListFilters, type TaskViewMode } from '../../../../constants';
import type { TeamMemberSummary } from '../../../../hooks';
import type { ProjectMilestone } from '../../../../hooks/types';
import { TeamAvatarGroup } from '../../../team-avatar-group';

import { SearchInput } from '@/components/shared/search';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { LookupOption } from '@/lib/hooks/resources';
import { cn } from '@/lib/utils';

// ── Types ───────────────────────────────────────────────────────────────────

interface TaskListToolbarProps {
  filters: TaskListFilters;
  setFilter: (key: keyof TaskListFilters, value: string) => void;
  clearFilters: () => void;
  taskStatuses: { code: string; label: string; color: string }[];
  priorityOptions: LookupOption[];
  avatarMembers: TeamMemberSummary[];
  milestones: ProjectMilestone[];
  totalTasks?: number;
  view: TaskViewMode;
  onViewChange: (view: TaskViewMode) => void;
}

// ── Internal sub-components ─────────────────────────────────────────────────

function FilterSection({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-2xs font-medium text-foreground-tertiary mb-1.5">
        {icon}
        {label}
      </div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function FilterOption({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-2xs transition-all',
        selected
          ? 'border-primary/40 bg-primary/10 text-primary font-medium shadow-sm'
          : 'border-border-light bg-background text-foreground-secondary hover:border-border hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

function FilterChip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-2xs text-primary">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full hover:bg-primary/10 p-0.5 transition-colors"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function TaskListToolbar({
  filters,
  setFilter,
  clearFilters,
  taskStatuses,
  priorityOptions,
  avatarMembers,
  milestones,
  totalTasks,
  view,
  onViewChange,
}: TaskListToolbarProps) {
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.t_search) count++;
    if (filters.t_status) count++;
    if (filters.t_priority) count++;
    if (filters.t_assignee) count++;
    if (filters.t_milestone) count++;
    return count;
  }, [filters]);

  const handleSetFilter = useCallback(
    (key: keyof TaskListFilters, value: string) => {
      setFilter(key, value);
      if (key !== 't_page') {
        setFilter('t_page', '1');
      }
    },
    [setFilter],
  );

  const handleToggleAssignee = useCallback(
    (memberId: string) => {
      const next = filters.t_assignee === memberId ? '' : memberId;
      handleSetFilter('t_assignee', next);
    },
    [filters.t_assignee, handleSetFilter],
  );

  const handleClearAssignee = useCallback(() => {
    handleSetFilter('t_assignee', '');
  }, [handleSetFilter]);

  const selectedAssigneeIds = useMemo(
    () => (filters.t_assignee ? new Set([filters.t_assignee]) : new Set<string>()),
    [filters.t_assignee],
  );

  const statusFilterCount = filters.t_status ? 1 : 0;
  const priorityFilterCount = filters.t_priority ? 1 : 0;
  const milestoneFilterCount = filters.t_milestone ? 1 : 0;

  const activeStatusLabel = useMemo(
    () => taskStatuses.find((s) => s.code === filters.t_status)?.label ?? filters.t_status,
    [taskStatuses, filters.t_status],
  );
  const activePriorityLabel = useMemo(
    () => priorityOptions.find((p) => p.value === filters.t_priority)?.label ?? filters.t_priority,
    [priorityOptions, filters.t_priority],
  );
  const activeMilestoneLabel = useMemo(
    () => milestones.find((m) => m.id === filters.t_milestone)?.name ?? 'Milestone',
    [milestones, filters.t_milestone],
  );
  const activeAssigneeName = useMemo(() => {
    if (!filters.t_assignee) return '';
    if (filters.t_assignee === UNASSIGNED_TASK_FILTER) return 'Unassigned';
    const member = avatarMembers.find((m) => m.id === filters.t_assignee);
    if (!member) return '';
    return `${member.firstName} ${member.lastName ?? ''}`.trim();
  }, [avatarMembers, filters.t_assignee]);

  return (
    <div className="space-y-2">
      {/* Toolbar row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <SearchInput
          value={filters.t_search}
          onSearch={(v) => handleSetFilter('t_search', v)}
          placeholder="Search tasks..."
          size="sm"
          className="w-48"
        />

        <div className="h-5 w-px bg-border-light" />

        {/* Status filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 gap-1.5 text-xs font-normal',
                statusFilterCount > 0 && 'border-primary/40 bg-primary/5 text-primary',
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Status
              {statusFilterCount > 0 && (
                <Badge
                  variant="default"
                  className="ml-0.5 h-4 min-w-4 px-1 text-section leading-none rounded-full"
                >
                  {statusFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-52 p-3">
            <FilterSection icon={<SlidersHorizontal className="h-3.5 w-3.5" />} label="Status">
              <FilterOption
                selected={!filters.t_status}
                onClick={() => handleSetFilter('t_status', '')}
              >
                All
              </FilterOption>
              {taskStatuses.map((s) => (
                <FilterOption
                  key={s.code}
                  selected={filters.t_status === s.code}
                  onClick={() => handleSetFilter('t_status', s.code)}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full mr-1.5 shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                </FilterOption>
              ))}
            </FilterSection>
          </PopoverContent>
        </Popover>

        {/* Priority filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 gap-1.5 text-xs font-normal',
                priorityFilterCount > 0 && 'border-primary/40 bg-primary/5 text-primary',
              )}
            >
              <Flag className="h-3.5 w-3.5" />
              Priority
              {priorityFilterCount > 0 && (
                <Badge
                  variant="default"
                  className="ml-0.5 h-4 min-w-4 px-1 text-section leading-none rounded-full"
                >
                  {priorityFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-44 p-3">
            <FilterSection icon={<Flag className="h-3.5 w-3.5" />} label="Priority">
              <FilterOption
                selected={!filters.t_priority}
                onClick={() => handleSetFilter('t_priority', '')}
              >
                All
              </FilterOption>
              {priorityOptions.map((p) => (
                <FilterOption
                  key={p.value}
                  selected={filters.t_priority === p.value}
                  onClick={() => handleSetFilter('t_priority', p.value)}
                >
                  {p.color && (
                    <span
                      className="inline-block h-2 w-2 rounded-full mr-1.5 shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                  )}
                  {p.label}
                </FilterOption>
              ))}
            </FilterSection>
          </PopoverContent>
        </Popover>

        {/* Milestone filter — only shown when milestones exist */}
        {milestones.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-8 gap-1.5 text-xs font-normal',
                  milestoneFilterCount > 0 && 'border-primary/40 bg-primary/5 text-primary',
                )}
              >
                <Milestone className="h-3.5 w-3.5" />
                Milestone
                {milestoneFilterCount > 0 && (
                  <Badge
                    variant="default"
                    className="ml-0.5 h-4 min-w-4 px-1 text-section leading-none rounded-full"
                  >
                    {milestoneFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-3">
              <FilterSection icon={<Milestone className="h-3.5 w-3.5" />} label="Milestone">
                <FilterOption
                  selected={!filters.t_milestone}
                  onClick={() => handleSetFilter('t_milestone', '')}
                >
                  All
                </FilterOption>
                {milestones.map((m) => (
                  <FilterOption
                    key={m.id}
                    selected={filters.t_milestone === m.id}
                    onClick={() => handleSetFilter('t_milestone', m.id)}
                  >
                    {m.name}
                  </FilterOption>
                ))}
              </FilterSection>
            </PopoverContent>
          </Popover>
        )}

        <div className="h-5 w-px bg-border-light" />

        {/* Assignee — includes unassigned as Jira-style '?' avatar */}
        <TeamAvatarGroup
          members={avatarMembers}
          extraMembers={[
            {
              id: UNASSIGNED_TASK_FILTER,
              displayName: 'Unassigned',
              initials: '?',
            },
          ]}
          max={5}
          size="xs"
          selectable
          selectedIds={selectedAssigneeIds}
          onToggle={handleToggleAssignee}
          onClear={handleClearAssignee}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* View Toggle */}
        <TaskViewToggle view={view} onViewChange={onViewChange} />

        {/* Clear all */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-foreground-muted gap-1"
            onClick={clearFilters}
          >
            <X className="h-3 w-3" />
            Clear filters
          </Button>
        )}

        {/* Task count */}
        {totalTasks !== undefined && (
          <span className="text-xs text-foreground-secondary whitespace-nowrap">
            {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
          </span>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.t_search && (
            <FilterChip onRemove={() => handleSetFilter('t_search', '')}>
              <Search className="h-2.5 w-2.5 mr-0.5" />
              {filters.t_search}
            </FilterChip>
          )}
          {filters.t_status && (
            <FilterChip onRemove={() => handleSetFilter('t_status', '')}>
              {activeStatusLabel}
            </FilterChip>
          )}
          {filters.t_priority && (
            <FilterChip onRemove={() => handleSetFilter('t_priority', '')}>
              {activePriorityLabel}
            </FilterChip>
          )}
          {filters.t_milestone && (
            <FilterChip onRemove={() => handleSetFilter('t_milestone', '')}>
              {activeMilestoneLabel}
            </FilterChip>
          )}
          {filters.t_assignee && activeAssigneeName && (
            <FilterChip onRemove={() => handleSetFilter('t_assignee', '')}>
              {activeAssigneeName}
            </FilterChip>
          )}
        </div>
      )}
    </div>
  );
}
