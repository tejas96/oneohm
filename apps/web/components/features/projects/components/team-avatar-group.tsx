'use client';

import { Crown } from 'lucide-react';

import type { TeamMemberSummary } from '../hooks';

import { Avatar, AvatarFallback, getAvatarFallbackColorClass } from '@/components/ui/avatar';
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
}

export function TeamAvatarGroup({ members, max = 3, size = 'xs' }: TeamAvatarGroupProps) {
  if (!members || members.length === 0) {
    return <span className="text-2xs text-foreground-tertiary">No team</span>;
  }

  const visible = members.slice(0, max);
  const remaining = members.length - max;

  const sizeClass = size === 'xs' ? 'size-7' : 'size-8';
  const textClass = size === 'xs' ? 'text-section' : 'text-xs';

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((member) => {
        const fullName = getFullName(member);
        return (
          <Avatar key={member.id} size={size} className="border-2 border-white">
            <AvatarFallback size={size} name={fullName}>
              {getInitials(member.firstName, member.lastName)}
            </AvatarFallback>
          </Avatar>
        );
      })}

      {remaining > 0 && (
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
            className="w-48! p-1! border-border-light shadow-md"
          >
            <p className="px-2 py-1.5 text-xs font-semibold text-foreground-secondary">
              Team ({members.length})
            </p>
            {members.map((member) => {
              const fullName = getFullName(member);
              const colorClass = getAvatarFallbackColorClass(fullName);
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent"
                >
                  <div
                    className={cn(
                      'size-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0',
                      colorClass,
                    )}
                  >
                    {getInitials(member.firstName, member.lastName)}
                  </div>
                  <span className="text-sm text-foreground truncate">
                    {fullName}
                  </span>
                  {member.isProjectManager && (
                    <Crown className="size-3.5 text-warning shrink-0 ml-auto" />
                  )}
                </div>
              );
            })}
          </PopoverContent>
        </Popover>
        </div>
      )}
    </div>
  );
}
