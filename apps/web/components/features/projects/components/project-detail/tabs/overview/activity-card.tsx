'use client';

import { TASK_PRIORITY_OPTIONS, TASK_STATUS_CATALOG } from '@tejas96/shared/constants';
import type { TaskPriority, TaskStatus } from '@tejas96/shared/types';
import {
  ArrowRight,
  Flag,
  History,
  MessageSquare,
  Pencil,
  Plus,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import * as React from 'react';

import { DetailCard, EmptyPane, IconCircle, type Tone } from '../../primitives';
import type { Panel } from '../../types';

import { Skeleton } from '@/components/ui/skeleton';
import type { ActivityFeedItem, ProjectSummary } from '@/lib/hooks/resources';
import { formatTimeAgo } from '@/lib/utils';

interface ActivityMeta {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: Tone;
}

const ACTIVITY_META: Record<string, ActivityMeta> = {
  status_changed: { Icon: ArrowRight, tone: 'info' },
  priority_changed: { Icon: Flag, tone: 'warning' },
  assigned: { Icon: UserRound, tone: 'accent' },
  created: { Icon: Plus, tone: 'success' },
  commented: { Icon: MessageSquare, tone: 'neutral' },
  progress_updated: { Icon: TrendingUp, tone: 'accent' },
  updated: { Icon: Pencil, tone: 'neutral' },
};

const DEFAULT_META: ActivityMeta = { Icon: Pencil, tone: 'neutral' };

function statusLabel(code?: string): string {
  if (!code) return '?';
  return TASK_STATUS_CATALOG[code as TaskStatus]?.label ?? code;
}

function priorityLabel(code?: string): string {
  if (!code) return '?';
  return TASK_PRIORITY_OPTIONS.find((p) => p.value === (code as TaskPriority))?.label ?? code;
}

function Strong({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <span className="font-medium text-foreground">{children}</span>;
}

function message(entry: ActivityFeedItem): React.ReactNode {
  const task = <Strong>{entry.taskCode}</Strong>;
  switch (entry.activityType) {
    case 'status_changed':
      return (
        <>
          moved {task} from <Strong>{statusLabel(entry.oldValue)}</Strong> to{' '}
          <Strong>{statusLabel(entry.newValue)}</Strong>
        </>
      );
    case 'priority_changed':
      return (
        <>
          set {task} to <Strong>{priorityLabel(entry.newValue)}</Strong> priority
        </>
      );
    case 'assigned':
      return (
        <>
          assigned {task} to <Strong>{entry.newValue ?? 'someone'}</Strong>
        </>
      );
    case 'created':
      return <>created {task}</>;
    case 'commented':
      return <>commented on {task}</>;
    case 'progress_updated':
      return (
        <>
          moved {task} to <Strong>{entry.newValue ?? '?'}%</Strong>
        </>
      );
    case 'updated':
      return (
        <>
          updated <Strong>{entry.fieldName ?? 'a field'}</Strong> on {task}
        </>
      );
    default:
      return <>updated {task}</>;
  }
}

interface ActivityCardProps {
  summary: Panel<ProjectSummary>;
  className?: string;
}

/**
 * The last things that happened to this project's tasks, newest first.
 *
 * Every entry the server sends is rendered, and the list scrolls inside the
 * card. There is deliberately no "full log" link: the summary endpoint caps
 * this feed at twenty entries and no screen in the product holds more, so a
 * link promising the rest would go nowhere.
 */
export function ActivityCard({ summary, className }: ActivityCardProps): React.JSX.Element {
  const entries = summary.data?.recentActivity ?? [];

  return (
    <DetailCard
      label="Recent activity"
      aside={entries.length > 0 ? `Last ${entries.length}` : undefined}
      isError={summary.isError}
      onRetry={summary.refetch}
      className={className}
    >
      {summary.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-10 rounded-2xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyPane
          icon={<History className="size-4" strokeWidth={2} />}
          title="Nothing yet"
          description="Task changes on this project will show up here."
        />
      ) : (
        <ol className="-mr-1 flex max-h-[420px] flex-col overflow-y-auto pr-1 scrollbar-thin">
          {entries.map((entry, index) => {
            const meta = ACTIVITY_META[entry.activityType] ?? DEFAULT_META;
            const isLast = index === entries.length - 1;
            return (
              <li
                key={`${entry.taskId}-${entry.createdAt}-${index}`}
                className="relative flex gap-3 pb-3 last:pb-0"
              >
                {!isLast ? (
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-[13px] top-7 w-[2px] rounded-pill"
                    style={{ background: 'var(--ds-canvas-sunken)' }}
                  />
                ) : null}
                <IconCircle tone={meta.tone} size={28} className="relative">
                  <meta.Icon className="size-3.5" strokeWidth={2} />
                </IconCircle>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[12.5px] leading-snug text-foreground-secondary">
                    <Strong>{entry.userName ?? 'System'}</Strong> {message(entry)}
                    {entry.taskName ? (
                      <span className="text-foreground-tertiary"> · {entry.taskName}</span>
                    ) : null}
                  </p>
                  <span className="mt-0.5 block text-[10.5px] text-foreground-tertiary">
                    {formatTimeAgo(entry.createdAt)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </DetailCard>
  );
}
