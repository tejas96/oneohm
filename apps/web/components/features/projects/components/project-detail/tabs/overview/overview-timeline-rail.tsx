'use client';

import { MilestoneStatus } from '@oneohm-epc/shared/types';
import { Milestone } from 'lucide-react';

import type { ProjectDetail, ProjectMilestone } from '../../../../hooks/types';

import { useProjectSummary } from '@/lib/hooks/resources';
import { formatDate } from '@/lib/utils/format';

interface OverviewTimelineRailProps {
  project: ProjectDetail;
  projectId: string;
  isActive: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────

type MilestoneProgress = {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  percent: number;
};

function deriveEffectiveStatus(
  entityStatus: MilestoneStatus,
  progress: MilestoneProgress | undefined,
): MilestoneStatus {
  if (entityStatus === MilestoneStatus.BLOCKED || entityStatus === MilestoneStatus.SKIPPED) {
    return entityStatus;
  }
  if (!progress || progress.totalTasks === 0) return entityStatus;
  if (progress.completedTasks >= progress.totalTasks) return MilestoneStatus.COMPLETED;
  if (progress.completedTasks > 0) return MilestoneStatus.IN_PROGRESS;
  return entityStatus;
}

function dotColor(status: MilestoneStatus): string {
  switch (status) {
    case MilestoneStatus.COMPLETED:
    case MilestoneStatus.SKIPPED:
      return 'bg-success';
    case MilestoneStatus.IN_PROGRESS:
      return 'bg-primary';
    case MilestoneStatus.BLOCKED:
      return 'bg-error';
    case MilestoneStatus.PENDING:
    default:
      return 'bg-border';
  }
}

type LabelKind = 'completed' | 'active' | 'upcoming' | 'blocked';

function labelKind(status: MilestoneStatus): LabelKind {
  switch (status) {
    case MilestoneStatus.COMPLETED:
    case MilestoneStatus.SKIPPED:
      return 'completed';
    case MilestoneStatus.IN_PROGRESS:
      return 'active';
    case MilestoneStatus.BLOCKED:
      return 'blocked';
    case MilestoneStatus.PENDING:
    default:
      return 'upcoming';
  }
}

const LABEL_CLASSES: Record<LabelKind, { name: string; date: string; suffix?: string }> = {
  completed: { name: 'text-foreground font-medium', date: 'text-foreground-muted' },
  active: {
    name: 'text-primary font-medium',
    date: 'text-primary font-medium',
    suffix: ' · active',
  },
  blocked: { name: 'font-medium text-error', date: 'text-error' },
  upcoming: { name: 'text-foreground-secondary font-medium', date: 'text-foreground-muted' },
};

const RAIL_COLORS = {
  success: 'rgb(34, 197, 94)',
  primary: 'rgb(118, 192, 68)',
  track: 'rgb(228, 228, 231)',
} as const;

/**
 * Even spacing: milestone at index i out of N is at  i / (N-1) * 100 %.
 * Single milestone → 50 %.
 */
function slotPct(index: number, total: number): number {
  if (total <= 1) return 50;
  return (index / (total - 1)) * 100;
}

// ── Component ────────────────────────────────────────────────────

export function OverviewTimelineRail({
  project,
  projectId,
  isActive,
}: OverviewTimelineRailProps): React.ReactElement {
  const { data: summary } = useProjectSummary(projectId, { enabled: isActive });
  const progressMap = new Map(
    (summary?.milestoneProgress ?? []).map((m) => [m.id, m] as [string, MilestoneProgress]),
  );

  // Gate: need dates
  if (!project.startDate || !project.endDate) {
    return (
      <section className="rounded-xl border border-border-light/70 bg-card p-5 shadow-card">
        <p className="text-sm font-semibold text-foreground">Project Journey</p>
        <p className="mt-1 text-xs text-foreground-secondary">
          Timeline will appear once both start and end dates are set.
        </p>
      </section>
    );
  }

  const start = new Date(project.startDate);
  const end = new Date(project.endDate);

  // Only milestones that have tasks (consistent with Summary tab).
  const sorted = [...project.milestones]
    .filter((m) => progressMap.has(m.id))
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  if (sorted.length === 0) {
    return (
      <section className="rounded-xl border border-border-light/70 bg-card p-5 shadow-card">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Milestone className="size-4 text-primary" />
          Project Journey
        </p>
        <p className="mt-1 text-xs text-foreground-secondary">
          No milestones configured yet. Add milestones to see the project timeline.
        </p>
      </section>
    );
  }

  // Derive effective statuses from task-completion data.
  const statusOf = (m: ProjectMilestone): MilestoneStatus =>
    deriveEffectiveStatus(m.status, progressMap.get(m.id));

  const statuses = sorted.map(statusOf);
  const positions = sorted.map((_, i) => slotPct(i, sorted.length));

  // ── Gradient computation ──
  // Walk from left to right.  The green part covers all completed milestones.
  // The primary part extends through any in-progress milestone.
  // Everything else is the gray track.

  let greenEnd = 0; // right edge of the solid green (completed) zone
  let activeEnd = 0; // right edge of the primary (in-progress) zone

  let lastCompletedIdx = -1;
  let lastInProgressIdx = -1;

  for (let i = 0; i < sorted.length; i++) {
    const s = statuses[i]!;
    if (s === MilestoneStatus.COMPLETED || s === MilestoneStatus.SKIPPED) lastCompletedIdx = i;
    if (s === MilestoneStatus.IN_PROGRESS) lastInProgressIdx = i;
  }

  if (lastCompletedIdx >= 0) {
    greenEnd = positions[lastCompletedIdx] ?? 0;
  }

  if (lastInProgressIdx >= 0) {
    activeEnd = positions[lastInProgressIdx] ?? 0;
  } else if (lastCompletedIdx >= 0 && lastCompletedIdx < sorted.length - 1) {
    const nextPos = positions[lastCompletedIdx + 1] ?? greenEnd;
    activeEnd = greenEnd + (nextPos - greenEnd) * 0.2;
  } else {
    activeEnd = greenEnd;
  }

  // If everything is completed, fill entirely green.
  const allCompleted = statuses.every(
    (s) => s === MilestoneStatus.COMPLETED || s === MilestoneStatus.SKIPPED,
  );
  if (allCompleted) {
    greenEnd = 100;
    activeEnd = 100;
  }

  const railBackground =
    greenEnd === 0 && activeEnd === 0
      ? RAIL_COLORS.track
      : `linear-gradient(90deg, ${RAIL_COLORS.success} 0%, ${RAIL_COLORS.success} ${greenEnd}%, ${RAIL_COLORS.primary} ${greenEnd}%, ${RAIL_COLORS.primary} ${activeEnd}%, ${RAIL_COLORS.track} ${activeEnd}%, ${RAIL_COLORS.track} 100%)`;

  // ── TODAY marker ──
  // Position on the same sequence-based axis using the overall project
  // progress percentage (which is already a 0-100 value the backend computes).
  // Map it to the rail: 0% progress → left of first milestone,
  // 100% progress → right of last milestone.
  const progressPct = Math.min(100, Math.max(0, project.progressPercentage));
  const todayPct = progressPct;

  return (
    <section className="rounded-xl border border-border-light/70 bg-card p-5 shadow-card">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Milestone className="size-4 text-primary" />
            Project Journey
          </p>
          <p className="mt-1 text-[11px] text-foreground-secondary">
            {formatDate(start, 'short')} — {formatDate(end, 'short')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-foreground-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full bg-success" />
            Completed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full bg-primary" />
            In progress
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full bg-border" />
            Upcoming
          </span>
        </div>
      </div>

      <div className="relative pb-11 pt-6">
        {/* TODAY marker — positioned using project.progressPercentage */}
        <div className="absolute top-0 z-10 -translate-x-1/2" style={{ left: `${todayPct}%` }}>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            TODAY
          </span>
          <div className="mx-auto mt-1 h-8 w-0.5 bg-primary" />
        </div>

        {/* Rail */}
        <div className="relative h-1.5 rounded-full" style={{ background: railBackground }}>
          {sorted.map((milestone, idx) => {
            const st = statuses[idx] ?? MilestoneStatus.PENDING;
            return (
              <div
                key={milestone.id}
                className={`absolute -top-1.5 size-4 rounded-full border-2 border-white ${dotColor(st)}`}
                style={{ left: `${positions[idx] ?? 0}%`, transform: 'translateX(-50%)' }}
                title={`${milestone.name} — ${st}`}
              />
            );
          })}
        </div>

        {/* Labels */}
        <div
          className="mt-4 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${sorted.length}, 1fr)` }}
        >
          {sorted.map((milestone, idx) => {
            const kind = labelKind(statuses[idx] ?? MilestoneStatus.PENDING);
            const cls = LABEL_CLASSES[kind];
            return (
              <div key={milestone.id} className="text-center min-w-0">
                <p className={`truncate text-[11px] ${cls.name}`}>{milestone.name}</p>
                <p className={`text-[10px] ${cls.date}`}>
                  {milestone.endDate ? formatDate(milestone.endDate, 'short') : 'TBD'}
                  {cls.suffix ?? ''}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
