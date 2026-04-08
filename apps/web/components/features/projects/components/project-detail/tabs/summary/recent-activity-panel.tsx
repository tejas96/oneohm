'use client';

import { ArrowRight, Edit2, Flag, MessageSquare, Plus, TrendingUp, User } from 'lucide-react';
import React from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { ActivityFeedItem, LookupByTypeCode, LookupOption } from '@/lib/hooks/resources';
import { getInitials } from '@/lib/utils/format';

function formatDistanceToNow(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type ActivityIcon = React.ElementType;

interface ActivityTypeMeta {
  Icon: ActivityIcon;
  color: string; // tailwind text class
  bg: string; // tailwind bg class
}

const ACTIVITY_META: Record<string, ActivityTypeMeta> = {
  status_changed: {
    Icon: ArrowRight,
    color: 'text-info',
    bg: 'bg-info/10',
  },
  priority_changed: {
    Icon: Flag,
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  assigned: {
    Icon: User,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  created: {
    Icon: Plus,
    color: 'text-success',
    bg: 'bg-success/10',
  },
  commented: {
    Icon: MessageSquare,
    color: 'text-foreground-secondary',
    bg: 'bg-border-light',
  },
  progress_updated: {
    Icon: TrendingUp,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  updated: {
    Icon: Edit2,
    color: 'text-foreground-secondary',
    bg: 'bg-border-light',
  },
};

const DEFAULT_META: ActivityTypeMeta = {
  Icon: Edit2,
  color: 'text-foreground-secondary',
  bg: 'bg-border-light',
};

function formatActivityMessage(
  entry: ActivityFeedItem,
  statusMap: Record<string, LookupByTypeCode>,
  priorityMap: Record<string, LookupOption>,
): React.ReactNode {
  const getStatusLabel = (code?: string) => (code ? (statusMap[code]?.label ?? code) : '?');
  const getPriorityLabel = (code?: string) => (code ? (priorityMap[code]?.label ?? code) : '?');

  const task = <span className="font-medium text-foreground">{entry.taskCode}</span>;

  switch (entry.activityType) {
    case 'status_changed':
      return (
        <>
          changed status from{' '}
          <span className="font-medium text-foreground">{getStatusLabel(entry.oldValue)}</span> →{' '}
          <span className="font-medium text-foreground">{getStatusLabel(entry.newValue)}</span> on{' '}
          {task}
        </>
      );
    case 'priority_changed':
      return (
        <>
          changed priority from{' '}
          <span className="font-medium text-foreground">{getPriorityLabel(entry.oldValue)}</span> →{' '}
          <span className="font-medium text-foreground">{getPriorityLabel(entry.newValue)}</span> on{' '}
          {task}
        </>
      );
    case 'assigned':
      return (
        <>
          assigned {task} to{' '}
          <span className="font-medium text-foreground">{entry.newValue ?? 'someone'}</span>
        </>
      );
    case 'created':
      return <>created task {task}</>;
    case 'commented':
      return <>commented on {task}</>;
    case 'progress_updated':
      return (
        <>
          updated progress to{' '}
          <span className="font-medium text-foreground">{entry.newValue ?? '?'}%</span> on {task}
        </>
      );
    case 'updated':
      return (
        <>
          updated{' '}
          <span className="font-medium text-foreground">{entry.fieldName ?? 'a field'}</span> on{' '}
          {task}
        </>
      );
    default:
      return <>updated {task}</>;
  }
}

interface RecentActivityPanelProps {
  activity: ActivityFeedItem[] | undefined;
  statusLookupMap: Record<string, LookupByTypeCode>;
  priorityLookupMap: Record<string, LookupOption>;
  isLoading: boolean;
}

export function RecentActivityPanel({
  activity,
  statusLookupMap,
  priorityLookupMap,
  isLoading,
}: RecentActivityPanelProps) {
  return (
    <div className="bg-surface border border-border-light rounded-xl p-5 flex flex-col">
      <p className="text-sm font-semibold text-foreground mb-4">Recent Activity</p>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="size-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5 pt-0.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : !activity || activity.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 min-h-[140px] gap-2 text-foreground-tertiary">
          <MessageSquare className="size-8 opacity-30" />
          <span className="text-xs">No recent activity</span>
        </div>
      ) : (
        <ul className="space-y-0 max-h-96 overflow-y-auto -mr-1 pr-1">
          {activity.map((entry, idx) => {
            const displayName = entry.userName ?? 'Unknown User';
            const message = formatActivityMessage(entry, statusLookupMap, priorityLookupMap);
            const meta = ACTIVITY_META[entry.activityType] ?? DEFAULT_META;
            const isLast = idx === activity.length - 1;

            return (
              <li key={`${entry.taskId}-${entry.createdAt}`} className="flex gap-3 relative">
                {/* Timeline line: icon is size-7 (28px), center at 14px = left-3.5, starts below icon (top-7 = 28px) */}
                {!isLast && (
                  <div className="absolute left-3.5 top-7 bottom-0 w-px bg-border-light" />
                )}

                {/* Activity type icon chip */}
                <div
                  className={`size-7 rounded-full flex items-center justify-center shrink-0 z-1 ${meta.bg}`}
                >
                  <meta.Icon className={`size-3 ${meta.color}`} />
                </div>

                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-start gap-2">
                    <Avatar className="size-5 shrink-0 mt-0.5">
                      <AvatarFallback className="text-[9px] font-semibold">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground-secondary leading-snug">
                        <span className="font-semibold text-foreground">{displayName}</span>{' '}
                        {message}
                      </p>
                      <span className="text-[10px] text-foreground-tertiary mt-0.5 block">
                        {formatDistanceToNow(entry.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
