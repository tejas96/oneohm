'use client';

import type { MilestoneDisplayStatus } from '@oneohm-epc/shared/types';
import { AlertTriangle, Check, Clock3, Zap } from 'lucide-react';
import Link from 'next/link';
import type { JSX } from 'react';

import { useProjectMilestones } from '../../../../hooks';

import { Progress, Skeleton } from '@/components/ui';

interface OverviewMilestonesFeedProps {
  projectId: string;
  projectPath: string;
  isActive: boolean;
}

function milestoneStatusLabel(status: MilestoneDisplayStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In progress';
    case 'blocked':
      return 'Blocked';
    case 'no_tasks':
      return 'No tasks';
    case 'pending':
    default:
      return 'Pending';
  }
}

function milestoneCardTone(status: MilestoneDisplayStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-success/5 border-success/20';
    case 'in_progress':
      return 'bg-primary/5 border-primary/20';
    case 'blocked':
      return 'bg-error/5 border-error/20';
    case 'no_tasks':
    case 'pending':
    default:
      return 'bg-muted/40 border-border-light/70';
  }
}

function milestoneBadgeTone(status: MilestoneDisplayStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-success/10 text-success';
    case 'in_progress':
      return 'bg-primary/10 text-primary';
    case 'blocked':
      return 'bg-error/10 text-error';
    case 'no_tasks':
    case 'pending':
    default:
      return 'bg-foreground-secondary/10 text-foreground-secondary';
  }
}

function MilestoneTimelineIcon({ status }: { status: MilestoneDisplayStatus }): JSX.Element {
  if (status === 'completed') {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success text-white">
        <Check className="size-5" strokeWidth={2.5} />
      </div>
    );
  }
  if (status === 'in_progress') {
    return (
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white ring-4 ring-primary/20">
        <Zap className="size-5" strokeWidth={2.5} />
      </div>
    );
  }
  if (status === 'blocked') {
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

interface MilestoneRowProps {
  name: string;
  order: number;
  status: MilestoneDisplayStatus;
  completedTasks: number;
  totalTasks: number;
  percent: number;
  projectPath: string;
}

function MilestoneRow({
  name,
  status,
  completedTasks,
  totalTasks,
  percent,
  projectPath,
}: MilestoneRowProps): JSX.Element {
  const isInProgress = status === 'in_progress';
  const taskLine =
    totalTasks > 0 ? `${completedTasks}/${totalTasks} tasks` : 'No task progress yet';

  return (
    <div className="relative flex gap-4">
      <div className="relative z-10 flex w-10 shrink-0 justify-center pt-0.5">
        <MilestoneTimelineIcon status={status} />
      </div>
      <Link
        href={`${projectPath}?tab=tasks&t_milestone=${encodeURIComponent(name)}`}
        className={`min-w-0 flex-1 rounded-lg border p-3 transition-colors hover:opacity-95 ${milestoneCardTone(status)}`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-medium text-foreground truncate">{name}</p>
          <span
            className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium ${milestoneBadgeTone(status)}`}
          >
            {milestoneStatusLabel(status)}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-foreground-secondary">
          <span>{taskLine}</span>
        </div>
        {isInProgress ? (
          <div className="mt-2">
            <Progress value={percent} size="sm" />
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
  const { data: milestones, isLoading } = useProjectMilestones(projectId, { enabled: isActive });

  // Show milestones that have at least one task
  const activeMilestones = milestones?.filter((m) => m.totalTasks > 0);

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
      ) : !activeMilestones || activeMilestones.length === 0 ? (
        <p className="text-xs text-foreground-secondary">No milestones configured yet.</p>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border-light" aria-hidden />
          <div className="space-y-4">
            {activeMilestones.map((milestone) => (
              <MilestoneRow
                key={milestone.name}
                name={milestone.name}
                order={milestone.order}
                status={milestone.status}
                completedTasks={milestone.completedTasks}
                totalTasks={milestone.totalTasks}
                percent={milestone.percent}
                projectPath={projectPath}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
