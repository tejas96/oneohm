'use client';

import { FollowupStatus, FollowupType, FollowupPriority } from '@oneohm-epc/shared/types';
import { Check, Clock } from 'lucide-react';
import { type JSX } from 'react';

import type { FollowupResponse } from '@/components/features/followups/hooks';
import { Badge, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface FollowupMiniListProps {
  followups: FollowupResponse[];
  isLoading: boolean;
  onViewAll: () => void;
  onMarkComplete: (id: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_LABELS: Record<FollowupType, string> = {
  [FollowupType.VISIT]: 'Visit',
  [FollowupType.MEETING]: 'Meeting',
  [FollowupType.TASK]: 'Task',
  [FollowupType.REMINDER]: 'Reminder',
  [FollowupType.DOCUMENT_COLLECTION]: 'Docs',
};

const PRIORITY_DOTS: Record<FollowupPriority, string> = {
  [FollowupPriority.HIGH]: 'bg-error',
  [FollowupPriority.NORMAL]: 'bg-warning',
  [FollowupPriority.LOW]: 'bg-info',
};

// ============================================================================
// Helpers
// ============================================================================

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return `In ${diffDays}d`;
}

function isOverdue(dateStr: string, status: FollowupStatus): boolean {
  return status === FollowupStatus.PENDING && new Date(dateStr) < new Date();
}

// ============================================================================
// Component
// ============================================================================

export function FollowupMiniList({
  followups,
  isLoading,
  onViewAll,
  onMarkComplete,
}: FollowupMiniListProps): JSX.Element {
  const pendingFollowups = followups.filter((f) => f.status === FollowupStatus.PENDING).slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  if (pendingFollowups.length === 0) {
    return (
      <p className="text-sm text-foreground-tertiary py-3 text-center">No pending followups</p>
    );
  }

  return (
    <div className="space-y-2">
      {pendingFollowups.map((followup) => (
        <div
          key={followup.id}
          className={cn(
            'p-2.5 rounded-lg border',
            isOverdue(followup.scheduledAt, followup.status)
              ? 'bg-warning/5 border-warning/20'
              : 'bg-background border-border-light',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Badge variant="secondary" size="xs">
                  {TYPE_LABELS[followup.type]}
                </Badge>
                <span
                  className={cn('size-2 rounded-full shrink-0', PRIORITY_DOTS[followup.priority])}
                />
                {isOverdue(followup.scheduledAt, followup.status) && (
                  <Badge variant="warning" size="xs">
                    Overdue
                  </Badge>
                )}
              </div>
              <p className="text-sm text-foreground truncate">{followup.subject}</p>
              <p className="text-2xs text-foreground-tertiary mt-0.5">
                <Clock className="inline size-3 mr-1" />
                {formatRelativeDate(followup.scheduledAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onMarkComplete(followup.id)}
              className="p-1 text-success hover:bg-success/10 rounded transition-colors shrink-0"
              title="Mark Complete"
            >
              <Check className="size-icon-xs" />
            </button>
          </div>
        </div>
      ))}

      {followups.filter((f) => f.status === FollowupStatus.PENDING).length > 5 && (
        <button
          type="button"
          onClick={onViewAll}
          className="w-full text-sm text-primary hover:underline py-1 text-center"
        >
          View All Followups
        </button>
      )}
    </div>
  );
}
