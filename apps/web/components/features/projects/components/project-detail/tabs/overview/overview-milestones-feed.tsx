'use client';

import { MilestoneStatus } from '@oneohm-epc/shared/types';
import { AlertTriangle, Check, Clock3, Zap } from 'lucide-react';
import Link from 'next/link';
import type { JSX } from 'react';

import { usePaymentMilestones, type ProjectMilestone } from '../../../../hooks';

import { Progress, Skeleton } from '@/components/ui';
import { type MilestoneProgressEntry, useProjectSummary } from '@/lib/hooks/resources';
import { formatDate } from '@/lib/utils/format';

interface OverviewMilestonesFeedProps {
  projectId: string;
  projectPath: string;
  isActive: boolean;
}

function milestoneStatusLabel(status: MilestoneStatus): string {
  switch (status) {
    case MilestoneStatus.COMPLETED:
      return 'Completed';
    case MilestoneStatus.IN_PROGRESS:
      return 'In progress';
    case MilestoneStatus.BLOCKED:
      return 'Blocked';
    case MilestoneStatus.SKIPPED:
      return 'Skipped';
    case MilestoneStatus.PENDING:
    default:
      return 'Pending';
  }
}

function milestoneCardTone(status: MilestoneStatus): string {
  switch (status) {
    case MilestoneStatus.COMPLETED:
      return 'bg-success/5 border-success/20';
    case MilestoneStatus.IN_PROGRESS:
      return 'bg-primary/5 border-primary/20';
    case MilestoneStatus.BLOCKED:
      return 'bg-error/5 border-error/20';
    case MilestoneStatus.PENDING:
    case MilestoneStatus.SKIPPED:
      return 'bg-muted/40 border-border-light/70';
  }
}

function milestoneBadgeTone(status: MilestoneStatus): string {
  switch (status) {
    case MilestoneStatus.COMPLETED:
      return 'bg-success/10 text-success';
    case MilestoneStatus.IN_PROGRESS:
      return 'bg-primary/10 text-primary';
    case MilestoneStatus.BLOCKED:
      return 'bg-error/10 text-error';
    case MilestoneStatus.PENDING:
    case MilestoneStatus.SKIPPED:
      return 'bg-foreground-secondary/10 text-foreground-secondary';
  }
}

function MilestoneTimelineIcon({ status }: { status: MilestoneStatus }): JSX.Element {
  if (status === MilestoneStatus.COMPLETED) {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success text-white">
        <Check className="size-5" strokeWidth={2.5} />
      </div>
    );
  }
  if (status === MilestoneStatus.IN_PROGRESS) {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white ring-4 ring-primary/20">
        <Zap className="size-5" strokeWidth={2.5} />
      </div>
    );
  }
  if (status === MilestoneStatus.BLOCKED) {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-error text-white">
        <AlertTriangle className="size-5" strokeWidth={2.5} />
      </div>
    );
  }
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-200">
      <Clock3 className="size-5 text-gray-500" strokeWidth={2.5} />
    </div>
  );
}

/**
 * Derive the effective display status for a milestone by combining
 * the stored entity status with the actual task-completion data from
 * the summary API.  The entity status can be stale (e.g. still
 * "pending" even though all tasks are done), so we reconcile here.
 */
function deriveEffectiveStatus(
  entityStatus: MilestoneStatus,
  progress: { completedTasks: number; totalTasks: number } | undefined,
): MilestoneStatus {
  if (entityStatus === MilestoneStatus.BLOCKED || entityStatus === MilestoneStatus.SKIPPED) {
    return entityStatus;
  }
  if (!progress || progress.totalTasks === 0) return entityStatus;
  if (progress.completedTasks >= progress.totalTasks) return MilestoneStatus.COMPLETED;
  if (progress.completedTasks > 0) return MilestoneStatus.IN_PROGRESS;
  return entityStatus;
}

function MilestoneRow({
  milestone,
  projectPath,
  milestoneProgress,
}: {
  milestone: ProjectMilestone;
  projectPath: string;
  milestoneProgress: { completedTasks: number; totalTasks: number; percent: number } | undefined;
}): JSX.Element {
  const effectiveStatus = deriveEffectiveStatus(milestone.status, milestoneProgress);
  const isInProgress = effectiveStatus === MilestoneStatus.IN_PROGRESS;
  const completed = milestoneProgress?.completedTasks ?? 0;
  const total = milestoneProgress?.totalTasks ?? 0;
  const progressPct = milestoneProgress?.percent ?? milestone.progressPercentage;
  const taskLine =
    milestoneProgress && milestoneProgress.totalTasks > 0
      ? `${completed}/${total} tasks`
      : 'No task progress yet';

  return (
    <div className="relative flex gap-4">
      <div className="relative z-10 flex w-10 shrink-0 justify-center pt-0.5">
        <MilestoneTimelineIcon status={effectiveStatus} />
      </div>
      <Link
        href={`${projectPath}?tab=tasks&t_milestone=${milestone.id}`}
        className={`min-w-0 flex-1 rounded-lg border p-3 transition-colors hover:opacity-95 ${milestoneCardTone(effectiveStatus)}`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-medium text-foreground truncate">{milestone.name}</p>
          <span
            className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium ${milestoneBadgeTone(effectiveStatus)}`}
          >
            {milestoneStatusLabel(effectiveStatus)}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-foreground-secondary">
          <span>{taskLine}</span>
          {milestone.endDate ? (
            <>
              <span aria-hidden>·</span>
              <span>{formatDate(milestone.endDate, 'short')}</span>
            </>
          ) : null}
        </div>
        {isInProgress ? (
          <div className="mt-2">
            <Progress value={progressPct} size="sm" />
          </div>
        ) : null}
      </Link>
    </div>
  );
}

export function OverviewMilestonesFeed({
  projectId,
  projectPath,
  isActive,
}: OverviewMilestonesFeedProps): JSX.Element {
  const { data: allMilestones, isLoading } = usePaymentMilestones(projectId, { enabled: isActive });
  const { data: summary } = useProjectSummary(projectId, { enabled: isActive });
  const milestoneProgressRows: MilestoneProgressEntry[] = summary?.milestoneProgress ?? [];
  const progressByMilestone = new Map(
    milestoneProgressRows.map((m) => [m.id, m] as [string, MilestoneProgressEntry]),
  );

  // Only show milestones that have tasks (consistent with Summary tab's MilestoneProgressPanel).
  // Milestones with 0 tasks don't appear in the summary milestoneProgress data.
  const milestones = allMilestones?.filter((m) => progressByMilestone.has(m.id));

  return (
    <div className="rounded-xl border border-border-light/70 bg-card shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-foreground">Milestones</p>
        <Link
          href={`${projectPath}?tab=summary`}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : !milestones || milestones.length === 0 ? (
        <p className="text-xs text-foreground-secondary">No milestones configured yet.</p>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border-light" aria-hidden />
          <div className="space-y-4">
            {milestones.map((milestone) => (
              <MilestoneRow
                key={milestone.id}
                milestone={milestone}
                projectPath={projectPath}
                milestoneProgress={progressByMilestone.get(milestone.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
