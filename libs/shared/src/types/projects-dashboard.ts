/**
 * Projects dashboard (`GET /projects/dashboard`) — request and response shapes.
 * Definitions of every figure live in
 * docs/superpowers/specs/2026-10-08-projects-dashboard-design.md.
 */

export type StageGroupKey =
  | 'design'
  | 'approvals'
  | 'material'
  | 'installation'
  | 'meter'
  | 'handover';

export type DashboardPeriod = 'this_month' | 'last_month' | 'this_quarter' | 'this_fy' | 'custom';
export type DashboardFinancing = 'all' | 'cash' | 'loan';
export type ProjectProgress = 'live' | 'not_started' | 'in_progress';
export type ProjectAttention = 'late_steps' | 'old_steps' | 'unstaged_steps';

/** All dates are IST calendar days, `YYYY-MM-DD`, inclusive. */
export interface DashboardRange {
  from: string;
  to: string;
  /** The comparison window. Cut to the same number of days when the period includes today. */
  previousFrom: string;
  previousTo: string;
  /** "Oct", "Oct–Dec", "FY 26-27", "1 Sep – 30 Sep". */
  label: string;
  /** "Sep", or "1–8 Sep" when cut. */
  previousLabel: string;
}

export interface DashboardKwCount {
  count: number;
  /** Sum over the projects whose kW is known. */
  kw: number;
  /** Projects in `count` with no signed-quote kW. Never folded into `kw` as 0. */
  kwUnknown: number;
}

export interface NeedsActionRow {
  projectId: string;
  projectNumber: string;
  customerName: string | null;
  taskId: string;
  stepName: string;
  department: string | null;
  assigneeName: string | null;
  daysLate: number;
}

export interface ProjectsDashboard {
  period: DashboardRange;
  strip: {
    onboarded: DashboardKwCount & { cash: number; loan: number };
    live: DashboardKwCount & { notStarted: number; inProgress: number };
    meterInstalled: DashboardKwCount & { previousCount: number };
    late: { count: number; percentOfLive: number };
    /** null when the caller lacks `finance.view` (and is not an admin). */
    money: { toCollectPaise: number; meterInStillOwedPaise: number } | null;
  };
  stages: Array<{
    key: StageGroupKey;
    label: string;
    count: number;
    lateCount: number;
    kw: number;
    phases: Array<{ name: string; count: number }>;
  }>;
  stageNotes: { noStage: number; unstagedSteps: number; oldStepsOpen: number };
  needsAction: { total: number; rows: NeedsActionRow[] };
  teams: Array<{ department: string; lateSteps: number }>;
  /** 12 months, oldest first, current month last. `month` is `YYYY-MM`. */
  trend: Array<{
    month: string;
    onboarded: number;
    onboardedKw: number;
    meterInstalled: number;
    meterKw: number;
  }>;
  comingUp: {
    count: number;
    kw: number;
    thisWeek: number;
    nextWeek: number;
    /** Window bounds, so links open exactly these rows. */
    from: string;
    to: string;
    thisWeekTo: string;
    nextWeekFrom: string;
    nextWeekTo: string;
  };
}

export interface StageProjectRow {
  projectId: string;
  projectNumber: string;
  customerName: string | null;
  kw: number | null;
  currentPhase: string | null;
  daysLate: number | null;
}

export interface StageProjects {
  total: number;
  rows: StageProjectRow[];
}
