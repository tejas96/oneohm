'use client';

import { Check, Crown, X } from 'lucide-react';

import type { TeamMemberSummary } from '../hooks';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

function getInitials(firstName: string, lastName?: string): string {
  const first = firstName.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  return `${first}${last}`.toUpperCase() || '?';
}

function getFullName(member: TeamMemberSummary): string {
  return `${member.firstName}${member.lastName ? ` ${member.lastName}` : ''}`.trim() || 'Unknown';
}

interface TeamAvatarGroupProps {
  members: TeamMemberSummary[];
  max?: number;
  size?: 'xs' | 'sm';
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggle?: (memberId: string) => void;
  onClear?: () => void;
}

export function TeamAvatarGroup({
  members,
  max = 3,
  size = 'xs',
  selectable,
  selectedIds,
  onToggle,
  onClear,
}: TeamAvatarGroupProps) {
  if (!members || members.length === 0) {
    return <span className="text-2xs text-foreground-tertiary">No team</span>;
  }

  const visible = members.slice(0, max);
  const remaining = members.length - max;
  const hasSelection = selectable && selectedIds && selectedIds.size > 0;

  return (
    <div className="flex items-center gap-1">
      <div className={cn('flex items-center', selectable ? '-space-x-1' : '-space-x-2')}>
        {visible.map((member) => {
          const fullName = getFullName(member);
          const isSelected = selectedIds?.has(member.id);

          if (selectable) {
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onToggle?.(member.id)}
                title={fullName}
                className={cn(
                  'relative rounded-full transition-all cursor-pointer border-2 border-white hover:z-10',
                  isSelected && 'ring-2 ring-primary ring-offset-1 z-10',
                )}
              >
                <Avatar size={size}>
                  <AvatarFallback size={size} name={fullName}>
                    {getInitials(member.firstName, member.lastName)}
                  </AvatarFallback>
                </Avatar>
                {isSelected && (
                  <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-primary flex items-center justify-center border-2 border-white z-20">
                    <Check className="size-2 text-white" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          }

          return (
            <Avatar key={member.id} size={size} className="border-2 border-white">
              <AvatarFallback size={size} name={fullName}>
                {getInitials(member.firstName, member.lastName)}
              </AvatarFallback>
            </Avatar>
          );
        })}

        {remaining > 0 && (
          <OverflowPopover
            members={members}
            remaining={remaining}
            size={size}
            selectable={selectable}
            selectedIds={selectedIds}
            onToggle={onToggle}
          />
        )}
      </div>

      {hasSelection && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-0.5 text-2xs text-foreground-tertiary hover:text-foreground-secondary transition-colors cursor-pointer ml-1"
        >
          <X className="size-3" />
          Clear
        </button>
      )}
    </div>
  );
}

function OverflowPopover({
  members,
  remaining,
  size,
  selectable,
  selectedIds,
  onToggle,
}: {
  members: TeamMemberSummary[];
  remaining: number;
  size: 'xs' | 'sm';
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggle?: (memberId: string) => void;
}) {
  const sizeClass = size === 'xs' ? 'size-7' : 'size-8';
  const textClass = size === 'xs' ? 'text-section' : 'text-xs';

  return (
    <div
      className="inline-flex"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Popover modal={false}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Show all ${members.length} team members`}
            className={cn(
              'flex items-center justify-center rounded-full border-2 border-white bg-muted text-foreground-secondary font-semibold cursor-pointer hover:bg-muted/80 transition-colors relative z-10',
              sizeClass,
              textClass,
            )}
          >
            +{remaining}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          className="w-48! p-1! border-border-light shadow-sm"
        >
          <p className="px-2 py-1.5 text-xs font-semibold text-foreground-secondary">
            Team ({members.length})
          </p>
          {members.map((member) => {
            const fullName = getFullName(member);
            const isSelected = selectedIds?.has(member.id);
            const Tag = selectable ? 'button' : 'div';

            return (
              <Tag
                key={member.id}
                type={selectable ? 'button' : undefined}
                onClick={selectable ? () => onToggle?.(member.id) : undefined}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-sm w-full text-left',
                  selectable ? 'hover:bg-accent cursor-pointer' : 'hover:bg-accent',
                  selectable && isSelected && 'bg-primary/5',
                )}
              >
                <Avatar size="xs" className="size-6 shrink-0">
                  <AvatarFallback size="xs" name={fullName} className="text-[10px]">
                    {getInitials(member.firstName, member.lastName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground truncate flex-1">
                  {fullName}
                </span>
                {selectable && isSelected && (
                  <Check className="size-3.5 text-primary shrink-0" />
                )}
                {!selectable && member.isProjectManager && (
                  <Crown className="size-3.5 text-warning shrink-0 ml-auto" />
                )}
                {selectable && !isSelected && member.isProjectManager && (
                  <Crown className="size-3.5 text-warning shrink-0" />
                )}
              </Tag>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
