'use client';

import type { MilestoneDisplayStatus } from '@oneohm-epc/shared/types';
import { Milestone } from 'lucide-react';

import { useProjectMilestones } from '../../../../hooks';
import type { ProjectDetail } from '../../../../hooks/types';

import { formatDate } from '@/lib/utils/format';

interface OverviewTimelineRailProps {
  project: ProjectDetail;
  projectId: string;
  isActive: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────

function dotColor(status: MilestoneDisplayStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-success';
    case 'in_progress':
      return 'bg-primary';
    case 'blocked':
      return 'bg-error';
    case 'no_tasks':
    case 'pending':
    default:
      return 'bg-border';
  }
}

type LabelKind = 'completed' | 'active' | 'upcoming' | 'blocked';

function labelKind(status: MilestoneDisplayStatus): LabelKind {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'in_progress':
      return 'active';
    case 'blocked':
      return 'blocked';
    case 'no_tasks':
    case 'pending':
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
  const { data: milestonesRaw } = useProjectMilestones(projectId, { enabled: isActive });

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

  // Only milestones that have tasks, sorted by order
  const sorted = milestonesRaw
    ? [...milestonesRaw].filter((m) => m.totalTasks > 0).sort((a, b) => a.order - b.order)
    : [];

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

  const statuses = sorted.map((m) => m.status);
  const positions = sorted.map((_, i) => slotPct(i, sorted.length));

  // ── Gradient computation ──
  let greenEnd = 0;
  let activeEnd = 0;

  let lastCompletedIdx = -1;
  let lastInProgressIdx = -1;

  for (let i = 0; i < sorted.length; i++) {
    const s = statuses[i]!;
    if (s === 'completed') lastCompletedIdx = i;
    if (s === 'in_progress') lastInProgressIdx = i;
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

  const allCompleted = statuses.every((s) => s === 'completed');
  if (allCompleted) {
    greenEnd = 100;
    activeEnd = 100;
  }

  const railBackground =
    greenEnd === 0 && activeEnd === 0
      ? RAIL_COLORS.track
      : `linear-gradient(90deg, ${RAIL_COLORS.success} 0%, ${RAIL_COLORS.success} ${greenEnd}%, ${RAIL_COLORS.primary} ${greenEnd}%, ${RAIL_COLORS.primary} ${activeEnd}%, ${RAIL_COLORS.track} ${activeEnd}%, ${RAIL_COLORS.track} 100%)`;

  const progressPct = Math.min(100, Math.max(0, project.progressPercentage));

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
        {/* TODAY marker */}
        <div className="absolute top-0 z-10 -translate-x-1/2" style={{ left: `${progressPct}%` }}>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            TODAY
          </span>
          <div className="mx-auto mt-1 h-8 w-0.5 bg-primary" />
        </div>

        {/* Rail */}
        <div className="relative h-1.5 rounded-full" style={{ background: railBackground }}>
          {sorted.map((milestone, idx) => {
            const st = statuses[idx] ?? 'pending';
            return (
              <div
                key={milestone.name}
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
            const kind = labelKind(statuses[idx] ?? 'pending');
            const cls = LABEL_CLASSES[kind];
            return (
              <div key={milestone.name} className="text-center min-w-0">
                <p className={`truncate text-[11px] ${cls.name}`}>{milestone.name}</p>
                <p className={`text-[10px] ${cls.date}`}>{cls.suffix ?? ''}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
