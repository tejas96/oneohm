'use client';

import {
  FollowupPriority,
  FollowupStatus,
  FollowupType,
} from '@oneohm-epc/shared-types';
import {
  AlertCircle,
  Bell,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Edit,
  FileText,
  MapPin,
  Plus,
  Users,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type JSX, useCallback, useState } from 'react';

import {
  useFollowups,
  useMarkFollowupComplete,
  useMarkFollowupCancelled,
type  FollowupResponse } from '@/components/features/followups/hooks';
import { EmptyState } from '@/components/shared';
import { Badge, Button, Skeleton, showToast } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { cn, getErrorMessage } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface PropertyFollowupsTabProps {
  propertyId: string;
  customerId: string;
}

type FilterStatus = 'pending' | 'completed' | 'all';

// ============================================================================
// Constants
// ============================================================================

const TYPE_CONFIG: Record<FollowupType, { label: string; icon: typeof MapPin }> = {
  [FollowupType.VISIT]: { label: 'Visit', icon: MapPin },
  [FollowupType.MEETING]: { label: 'Meeting', icon: Users },
  [FollowupType.TASK]: { label: 'Task', icon: CheckSquare },
  [FollowupType.REMINDER]: { label: 'Reminder', icon: Bell },
  [FollowupType.DOCUMENT_COLLECTION]: { label: 'Docs', icon: FileText },
};

const PRIORITY_CONFIG: Record<FollowupPriority, { label: string; variant: 'error' | 'warning' | 'info' }> = {
  [FollowupPriority.HIGH]: { label: 'High', variant: 'error' },
  [FollowupPriority.NORMAL]: { label: 'Normal', variant: 'warning' },
  [FollowupPriority.LOW]: { label: 'Low', variant: 'info' },
};

// ============================================================================
// Helpers
// ============================================================================

function formatFollowupDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })  } at ${  date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`;
}

function isOverdue(dateStr: string, status: FollowupStatus): boolean {
  return status === FollowupStatus.PENDING && new Date(dateStr) < new Date();
}

function getAssignedName(followup: FollowupResponse): string {
  if (!followup.assignedToUser) return '';
  const { firstName, lastName } = followup.assignedToUser;
  return [firstName, lastName].filter(Boolean).join(' ');
}

// ============================================================================
// Component
// ============================================================================

export function PropertyFollowupsTab({
  propertyId,
  customerId,
}: PropertyFollowupsTabProps): JSX.Element {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');

  const { data, isLoading, isError, error } = useFollowups({
    propertyId,
    limit: 100,
  });

  const markComplete = useMarkFollowupComplete();
  const markCancelled = useMarkFollowupCancelled();

  const followups = data?.data ?? [];
  const pendingCount = followups.filter((f) => f.status === FollowupStatus.PENDING).length;
  const completedCount = followups.filter((f) => f.status === FollowupStatus.COMPLETED).length;

  const filteredFollowups = followups.filter((f) => {
    if (filterStatus === 'pending') return f.status === FollowupStatus.PENDING;
    if (filterStatus === 'completed') return f.status === FollowupStatus.COMPLETED;
    return true;
  });

  const handleMarkComplete = useCallback(
    (followupId: string) => {
      markComplete.mutate(
        { id: followupId, propertyId },
        {
          onSuccess: () => showToast.success('Followup marked as completed'),
          onError: (err) => showToast.error(getErrorMessage(err)),
        },
      );
    },
    [markComplete, propertyId],
  );

  const handleMarkCancelled = useCallback(
    (followupId: string) => {
      markCancelled.mutate(
        { id: followupId },
        {
          onSuccess: () => showToast.success('Followup cancelled'),
          onError: (err) => showToast.error(getErrorMessage(err)),
        },
      );
    },
    [markCancelled],
  );

  const handleAddFollowup = useCallback(() => {
    router.push(
      `${ROUTES.FOLLOWUPS.NEW}?propertyId=${propertyId}&customerId=${customerId}`,
    );
  }, [router, propertyId, customerId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 text-error">
          <AlertCircle className="size-5 shrink-0" />
          <p className="text-sm">{error ? getErrorMessage(error) : 'Failed to load followups'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header: Filters + Add Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {([
            { key: 'pending' as const, label: 'Pending', count: pendingCount },
            { key: 'completed' as const, label: 'Completed', count: completedCount },
            { key: 'all' as const, label: 'All', count: followups.length },
          ]).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterStatus(tab.key)}
              className={cn(
                'px-3 py-1.5 text-2xs font-medium rounded-lg transition-colors',
                filterStatus === tab.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground-secondary hover:bg-background-secondary',
              )}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        <Button size="sm" onClick={handleAddFollowup}>
          <Plus className="mr-1.5 size-icon-xs" />
          Add Followup
        </Button>
      </div>

      {/* Followup List */}
      {filteredFollowups.length === 0 ? (
        <EmptyState
          icon={<Clock className="size-icon-xl text-foreground-tertiary" />}
          title={filterStatus === 'pending' ? 'No pending followups' : 'No followups found'}
          description={
            filterStatus === 'pending'
              ? 'Schedule a followup to stay on track with this property.'
              : undefined
          }
          action={
            filterStatus === 'pending'
              ? { label: 'Add Followup', onClick: handleAddFollowup }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredFollowups.map((followup) => {
            const typeConfig = TYPE_CONFIG[followup.type];
            const priorityConfig = PRIORITY_CONFIG[followup.priority];
            const overdue = isOverdue(followup.scheduledAt, followup.status);
            const isCompleted = followup.status === FollowupStatus.COMPLETED;
            const isCancelled = followup.status === FollowupStatus.CANCELLED;
            const assignedName = getAssignedName(followup);

            return (
              <div
                key={followup.id}
                className={cn(
                  'p-4 rounded-lg border',
                  overdue && 'bg-warning/5 border-warning/20',
                  isCompleted && 'bg-success/5 border-success/20 opacity-75',
                  isCancelled && 'opacity-50',
                  !overdue && !isCompleted && !isCancelled && 'bg-background border-border-light',
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" size="xs">
                        {typeConfig.label}
                      </Badge>
                      <Badge variant={priorityConfig.variant} size="xs">
                        {priorityConfig.label}
                      </Badge>
                      {overdue && (
                        <Badge variant="warning" size="xs">Overdue</Badge>
                      )}
                      {isCompleted && (
                        <Badge variant="success" size="xs">Completed</Badge>
                      )}
                      {isCancelled && (
                        <Badge variant="default" size="xs">Cancelled</Badge>
                      )}
                    </div>

                    {/* Subject */}
                    <h4
                      className={cn(
                        'font-medium text-foreground',
                        isCompleted && 'line-through text-foreground-secondary',
                      )}
                    >
                      {followup.subject}
                    </h4>

                    {/* Notes preview */}
                    {followup.notes && (
                      <p className="text-sm text-foreground-secondary mt-1 line-clamp-2">
                        {followup.notes}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 mt-2 text-2xs text-foreground-tertiary">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatFollowupDate(followup.scheduledAt)}
                      </span>
                      {assignedName && (
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {assignedName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {followup.status === FollowupStatus.PENDING && (
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        type="button"
                        onClick={() => handleMarkComplete(followup.id)}
                        className="p-1.5 text-success hover:bg-success/10 rounded-lg transition-colors"
                        title="Mark Complete"
                        disabled={markComplete.isPending}
                      >
                        <Check className="size-icon-sm" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(buildRoute(ROUTES.FOLLOWUPS.EDIT, { id: followup.id }))
                        }
                        className="p-1.5 text-foreground-tertiary hover:bg-background-secondary rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="size-icon-sm" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkCancelled(followup.id)}
                        className="p-1.5 text-error/60 hover:bg-error/10 rounded-lg transition-colors"
                        title="Cancel"
                        disabled={markCancelled.isPending}
                      >
                        <X className="size-icon-sm" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
