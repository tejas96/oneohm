import { type MilestoneDisplayStatus, ProjectPriority, ProjectStatus } from '@tejas96/shared/types';
import { compareMilestoneSequence } from '@tejas96/shared/utils';

import { MS_PER_DAY } from '../../../constants';
import type {
  MilestoneAggregateItem,
  ProjectDetail,
  ProjectTeamMember,
} from '../../../hooks/types';
import type { Tone } from '../primitives';

import type { MilestoneBalance, ProjectLedgerSummary } from '@/lib/hooks/resources/ledger';

/**
 * Pure derivations for the project detail page.
 *
 * Nothing here fetches, formats currency, or touches React. Each function takes
 * the API's shape and returns the fact the page states — so the header and the
 * Overview cards cannot disagree about what "behind" or "overdue" means.
 */

// ============================================================================
// Dates
// ============================================================================

/** Local start-of-day in ms, or null when the value is absent or unparseable. */
export function dayStart(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface ProjectClock {
  /** Whole days from start to end, never below 1. */
  totalDays: number;
  /** Days used so far, clamped to the plan. */
  elapsedDays: number;
  /** Signed. Negative means the end date has passed. */
  remainingDays: number;
  /** 0–100. */
  elapsedPct: number;
  startMs: number;
  endMs: number;
}

/**
 * Where today falls on the planned window. Needs both dates — with one, the
 * page states the date rather than a proportion.
 */
export function computeClock(
  project: Pick<ProjectDetail, 'startDate' | 'endDate'>,
  now: Date = new Date(),
): ProjectClock | null {
  const startMs = dayStart(project.startDate);
  const endMs = dayStart(project.endDate);
  const todayMs = dayStart(now);
  if (startMs == null || endMs == null || todayMs == null) return null;

  const totalDays = Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY));
  const rawElapsed = Math.round((todayMs - startMs) / MS_PER_DAY);
  const elapsedDays = Math.min(Math.max(0, rawElapsed), totalDays);
  const remainingDays = Math.round((endMs - todayMs) / MS_PER_DAY);

  return {
    totalDays,
    elapsedDays,
    remainingDays,
    elapsedPct: (elapsedDays / totalDays) * 100,
    startMs,
    endMs,
  };
}

/** Signed whole days from today to `date`; null when there is no usable date. */
export function daysUntil(date: string | null | undefined, now: Date = new Date()): number | null {
  const target = dayStart(date);
  const today = dayStart(now);
  if (target == null || today == null) return null;
  return Math.round((target - today) / MS_PER_DAY);
}

// ============================================================================
// Health
// ============================================================================

export type ProjectHealth = 'on_track' | 'at_risk' | 'delayed';

/**
 * Mirrors `computeHealthStatus` in the backend project service, which is what
 * the project list's health column runs on. The detail endpoint does not
 * return it, so it is derived here from the same inputs — and only for an
 * active project, since a paused or finished one has no schedule to be
 * against.
 */
export function computeHealth(
  project: Pick<ProjectDetail, 'status' | 'endDate' | 'progressPercentage'>,
  now: Date = new Date(),
): ProjectHealth | null {
  if (project.status !== ProjectStatus.ACTIVE) return null;
  if (!project.endDate) return 'on_track';

  const due = new Date(project.endDate);
  if (Number.isNaN(due.getTime())) return 'on_track';
  if (due.getTime() < now.getTime()) return 'delayed';

  const fourteenDays = 14 * MS_PER_DAY;
  if (due.getTime() - now.getTime() < fourteenDays && (project.progressPercentage ?? 0) < 80) {
    return 'at_risk';
  }
  return 'on_track';
}

export const HEALTH_TONE: Record<ProjectHealth, Tone> = {
  on_track: 'success',
  at_risk: 'warning',
  delayed: 'danger',
};

export const PRIORITY_TONE: Record<string, Tone> = {
  [ProjectPriority.URGENT]: 'danger',
  [ProjectPriority.HIGH]: 'warning',
  [ProjectPriority.MEDIUM]: 'info',
  [ProjectPriority.NORMAL]: 'neutral',
  [ProjectPriority.LOW]: 'neutral',
};

/** Clamped, rounded percent for display. */
export function progressPct(project: Pick<ProjectDetail, 'progressPercentage'>): number {
  const raw = Number(project.progressPercentage);
  if (!Number.isFinite(raw)) return 0;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

// ============================================================================
// Phases (milestones)
// ============================================================================

/**
 * Phases in lifecycle order, keeping only those that hold tasks. The
 * aggregation endpoint also returns names with zero tasks; drawing them as
 * stages would promise work that does not exist.
 */
export function sortPhases(items: MilestoneAggregateItem[] | undefined): MilestoneAggregateItem[] {
  if (!items) return [];
  return items.filter((m) => m.totalTasks > 0).sort(compareMilestoneSequence);
}

export function phaseTone(status: MilestoneDisplayStatus): Tone {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'accent';
    case 'blocked':
      return 'danger';
    case 'pending':
    case 'no_tasks':
    default:
      return 'neutral';
  }
}

export const PHASE_STATUS_LABEL: Record<MilestoneDisplayStatus, string> = {
  completed: 'Done',
  in_progress: 'In progress',
  blocked: 'Blocked',
  pending: 'Not started',
  no_tasks: 'No tasks',
};

/**
 * The phase the project is in: the first, in lifecycle order, that is not
 * finished. −1 when every phase is done or there are none.
 */
export function currentPhaseIndex(sorted: MilestoneAggregateItem[]): number {
  return sorted.findIndex((m) => m.status !== 'completed');
}

/** Deep link to the Tasks tab filtered to one phase. */
export function milestoneTasksHref(projectPath: string, milestoneName: string): string {
  const params = new URLSearchParams({ tab: 'tasks', t_milestone: milestoneName });
  return `${projectPath}?${params.toString()}`;
}

// ============================================================================
// Journey
// ============================================================================

export interface JourneySegment {
  key: string;
  name: string;
  status: MilestoneDisplayStatus;
  total: number;
  done: number;
  blocked: number;
  inProgress: number;
  /** This phase's share of all the work, as a percent of the track. */
  widthPct: number;
  /** Where the segment starts on the track, percent. */
  startPct: number;
  /** How much of THIS phase is done, percent of the segment. */
  donePct: number;
}

export interface Journey {
  segments: JourneySegment[];
  totalTasks: number;
  doneTasks: number;
  /** Tasks done as a percent of all tasks — the same scale the clock uses. */
  workPct: number;
}

/**
 * The work, drawn to scale.
 *
 * Segment width is the phase's share of the tasks, so the big phase is
 * visibly the big one. Nothing is positioned by a date: milestones carry no
 * dates, and task dates cannot stand in for them. Time gets its own axis.
 */
export function computeJourney(sorted: MilestoneAggregateItem[]): Journey {
  const totalTasks = sorted.reduce((sum, m) => sum + m.totalTasks, 0);
  const doneTasks = sorted.reduce((sum, m) => sum + m.completedTasks, 0);
  let cursor = 0;
  const segments: JourneySegment[] = sorted.map((m) => {
    const widthPct = totalTasks > 0 ? (m.totalTasks / totalTasks) * 100 : 0;
    const segment: JourneySegment = {
      key: m.name,
      name: m.name,
      status: m.status,
      total: m.totalTasks,
      done: m.completedTasks,
      blocked: m.blockedTasks,
      inProgress: m.inProgressTasks,
      widthPct,
      startPct: cursor,
      donePct: m.totalTasks > 0 ? (m.completedTasks / m.totalTasks) * 100 : 0,
    };
    cursor += widthPct;
    return segment;
  });
  return {
    segments,
    totalTasks,
    doneTasks,
    workPct: totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0,
  };
}

export interface Pace {
  kind: 'ahead' | 'behind' | 'on_pace';
  /** Percentage points between work done and time used. */
  points: number;
}

/**
 * Work against the clock, both in percent of their own total. Within five
 * points is called even — the plan is in whole days and tasks are lumpy, so
 * a smaller gap is noise, not a verdict.
 */
export function computePace(workPct: number, elapsedPct: number): Pace {
  const delta = Math.round(workPct - elapsedPct);
  if (Math.abs(delta) < 5) return { kind: 'on_pace', points: Math.abs(delta) };
  return { kind: delta > 0 ? 'ahead' : 'behind', points: Math.abs(delta) };
}

// ============================================================================
// Money (integer paise throughout — never summed in rupees)
// ============================================================================

function isOpen(m: MilestoneBalance): boolean {
  return (m.derivedStatus === 'pending' || m.derivedStatus === 'partial') && m.balancePaise > 0;
}

/**
 * The money actually written off, as opposed to the API's `waivedPaise`.
 *
 * `waivedPaise` is the sum of EXPECTED on every waived milestone, so anything
 * already collected against one is counted twice — once as received, once as
 * waived. A real project showed contract ₹1,60,537, received ₹30,000,
 * outstanding ₹16,053 and waived ₹1,44,483: read together those overshoot the
 * contract by exactly the ₹30,000 that had been paid before the milestone was
 * written off.
 *
 * Summing the outstanding BALANCE on waived milestones gives the amount nobody
 * intends to collect, and makes received + outstanding + waived come to the
 * contract to the paisa.
 */
export function waivedRemainderPaise(ledger: ProjectLedgerSummary): number {
  return ledger.milestones
    .filter((m) => m.derivedStatus === 'waived')
    .reduce((sum, m) => sum + Math.max(0, m.balancePaise), 0);
}

/** Milestones past their due date with money still owed on them. */
export function overdueMilestones(ledger: ProjectLedgerSummary): MilestoneBalance[] {
  return ledger.milestones.filter((m) => isOpen(m) && m.daysOverdue > 0);
}

export function overduePaise(ledger: ProjectLedgerSummary): number {
  return overdueMilestones(ledger).reduce((sum, m) => sum + m.balancePaise, 0);
}

/**
 * Open milestones in the order they fall due: overdue first (most overdue
 * on top), then dated ones soonest first, then undated in schedule order.
 */
export function openMilestonesByUrgency(ledger: ProjectLedgerSummary): MilestoneBalance[] {
  return ledger.milestones.filter(isOpen).sort((a, b) => {
    if (a.daysOverdue !== b.daysOverdue) return b.daysOverdue - a.daysOverdue;
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return a.displayOrder - b.displayOrder;
  });
}

/**
 * Contract minus spend.
 *
 * Null until there is a contract AND at least one cost recorded against it.
 * With nothing spent the arithmetic returns the whole contract, which the card
 * then printed as "Margin left ₹1,54,444" beside "Contract ₹1,54,444" — the
 * same figure twice, claiming a margin nobody has verified. Unknown is the
 * honest answer, and the card says so.
 */
export function marginPaise(ledger: ProjectLedgerSummary): number | null {
  if (ledger.contractPaise <= 0) return null;
  if (ledger.spentPaise <= 0) return null;
  return ledger.contractPaise - ledger.spentPaise;
}

// ============================================================================
// People
// ============================================================================

export function memberName(member: ProjectTeamMember): string {
  const name = [member.user?.firstName, member.user?.lastName].filter(Boolean).join(' ').trim();
  return name || member.user?.email || 'Unknown';
}

export function projectManager(
  team: ProjectTeamMember[] | undefined,
): ProjectTeamMember | undefined {
  return team?.find((m) => m.isProjectManager);
}

/** Project manager first, then the rest in the order the API gave them. */
export function sortTeam(team: ProjectTeamMember[] | undefined): ProjectTeamMember[] {
  if (!team) return [];
  return [...team].sort((a, b) => Number(b.isProjectManager) - Number(a.isProjectManager));
}

// ============================================================================
// Text
// ============================================================================

export function plural(count: number, one: string, many = `${one}s`): string {
  return count === 1 ? one : many;
}
