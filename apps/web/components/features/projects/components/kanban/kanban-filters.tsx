'use client';

import { TaskPriority } from '@oneohm-epc/shared-types';
import { SlidersHorizontal, Flag, Milestone, Tag, User, X } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';

import type { BoardFilters, KanbanFilterState } from '../../hooks/use-kanban-board';
import type { TeamMemberSummary } from '../../hooks/use-projects';
import { TeamAvatarGroup } from '../team-avatar-group';

import { SearchInput } from '@/components/shared/search';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type { KanbanFilterState };

const PRIORITY_CONFIG: Record<string, { label: string; dot: string }> = {
  [TaskPriority.URGENT]: { label: 'Urgent', dot: 'bg-red-500' },
  [TaskPriority.HIGH]: { label: 'High', dot: 'bg-orange-500' },
  [TaskPriority.MEDIUM]: { label: 'Medium', dot: 'bg-yellow-500' },
  [TaskPriority.LOW]: { label: 'Low', dot: 'bg-blue-400' },
};

interface KanbanFiltersProps {
  filters: KanbanFilterState;
  setFilter: (key: keyof KanbanFilterState, value: string) => void;
  clearFilters: () => void;
  boardFilters?: BoardFilters;
}

export function KanbanFilters({
  filters,
  setFilter,
  clearFilters,
  boardFilters,
}: KanbanFiltersProps) {
  const nonAssigneeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.priority) count++;
    if (filters.milestoneId) count++;
    if (filters.label) count++;
    if (filters.myTasks === 'true') count++;
    return count;
  }, [filters]);

  const teamMembers: TeamMemberSummary[] = useMemo(
    () =>
      (boardFilters?.team ?? []).map((m) => {
        const parts = m.name.split(' ');
        return {
          id: m.userId,
          firstName: parts[0] ?? '',
          lastName: parts.slice(1).join(' ') || undefined,
          isProjectManager: false,
        };
      }),
    [boardFilters?.team],
  );

  const selectedAssigneeIds = useMemo(
    () => (filters.assigneeId ? new Set([filters.assigneeId]) : new Set<string>()),
    [filters.assigneeId],
  );

  const handleToggleAssignee = useCallback(
    (memberId: string) => {
      setFilter('assigneeId', filters.assigneeId === memberId ? '' : memberId);
    },
    [filters.assigneeId, setFilter],
  );

  const handleClearAssignee = useCallback(() => {
    setFilter('assigneeId', '');
  }, [setFilter]);

  return (
    <div className="flex items-center gap-2">
      {/* Search */}
      <SearchInput
        value={filters.search}
        onSearch={(v) => setFilter('search', v)}
        placeholder="Search tasks..."
        size="sm"
        className="w-48"
      />

      <div className="h-5 w-px bg-border-light" />

      {/* Team avatar group — inline selectable */}
      {teamMembers.length > 0 && (
        <TeamAvatarGroup
          members={teamMembers}
          max={3}
          size="xs"
          selectable
          selectedIds={selectedAssigneeIds}
          onToggle={handleToggleAssignee}
          onClear={handleClearAssignee}
        />
      )}

      <div className="h-5 w-px bg-border-light" />

      {/* More filters popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-8 gap-1.5 text-xs font-normal',
              nonAssigneeFilterCount > 0 && 'border-primary/40 bg-primary/5 text-primary',
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {nonAssigneeFilterCount > 0 && (
              <Badge
                variant="default"
                className="ml-0.5 h-4 min-w-4 px-1 text-section leading-none rounded-full"
              >
                {nonAssigneeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-3 space-y-3">
          {/* Priority */}
          <FilterSection icon={<Flag className="h-3.5 w-3.5" />} label="Priority">
            <FilterOption
              selected={!filters.priority}
              onClick={() => setFilter('priority', '')}
            >
              All
            </FilterOption>
            {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
              <FilterOption
                key={value}
                selected={filters.priority === value}
                onClick={() => setFilter('priority', value)}
              >
                <span className={cn('inline-block h-2 w-2 rounded-full mr-1.5', config.dot)} />
                {config.label}
              </FilterOption>
            ))}
          </FilterSection>

          {/* Milestone */}
          {boardFilters?.milestones && boardFilters.milestones.length > 0 && (
            <FilterSection icon={<Milestone className="h-3.5 w-3.5" />} label="Milestone">
              <FilterOption
                selected={!filters.milestoneId}
                onClick={() => setFilter('milestoneId', '')}
              >
                All
              </FilterOption>
              {boardFilters.milestones.map((m) => (
                <FilterOption
                  key={m.id}
                  selected={filters.milestoneId === m.id}
                  onClick={() => setFilter('milestoneId', m.id)}
                >
                  {m.name}
                </FilterOption>
              ))}
            </FilterSection>
          )}

          {/* Labels */}
          {boardFilters?.labels && boardFilters.labels.length > 0 && (
            <FilterSection icon={<Tag className="h-3.5 w-3.5" />} label="Label">
              <FilterOption
                selected={!filters.label}
                onClick={() => setFilter('label', '')}
              >
                All
              </FilterOption>
              {boardFilters.labels.map((l) => (
                <FilterOption
                  key={l}
                  selected={filters.label === l}
                  onClick={() => setFilter('label', l)}
                >
                  {l}
                </FilterOption>
              ))}
            </FilterSection>
          )}

          <div className="h-px bg-border-light" />

          {/* My Tasks toggle */}
          <button
            type="button"
            onClick={() =>
              setFilter('myTasks', filters.myTasks === 'true' ? '' : 'true')
            }
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
              filters.myTasks === 'true'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-foreground-secondary hover:bg-muted',
            )}
          >
            <User className="h-3.5 w-3.5" />
            Only my tasks
          </button>

          {nonAssigneeFilterCount > 0 && (
            <>
              <div className="h-px bg-border-light" />
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs text-foreground-muted"
                onClick={clearFilters}
              >
                <X className="mr-1 h-3 w-3" />
                Clear all filters
              </Button>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Active filter chips (non-assignee only) */}
      {nonAssigneeFilterCount > 0 && (
        <div className="flex items-center gap-1">
          {filters.priority && (
            <FilterChip onRemove={() => setFilter('priority', '')}>
              <span className={cn('inline-block h-1.5 w-1.5 rounded-full mr-1', PRIORITY_CONFIG[filters.priority]?.dot)} />
              {PRIORITY_CONFIG[filters.priority]?.label ?? filters.priority}
            </FilterChip>
          )}
          {filters.milestoneId && boardFilters?.milestones && (
            <FilterChip onRemove={() => setFilter('milestoneId', '')}>
              {boardFilters.milestones.find((m) => m.id === filters.milestoneId)?.name ?? 'Milestone'}
            </FilterChip>
          )}
          {filters.label && (
            <FilterChip onRemove={() => setFilter('label', '')}>
              {filters.label}
            </FilterChip>
          )}
          {filters.myTasks === 'true' && (
            <FilterChip onRemove={() => setFilter('myTasks', '')}>
              My tasks
            </FilterChip>
          )}
        </div>
      )}
    </div>
  );
}

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
      <div className="flex items-center gap-1.5 text-2xs font-medium text-foreground-tertiary mb-1">
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

function FilterChip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-2xs text-foreground-secondary">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5 transition-colors"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}
