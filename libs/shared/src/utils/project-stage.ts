import { canonicalMilestoneName, canonicalMilestoneOrder } from './milestone';
import { MILESTONE_LIFECYCLE_SEQUENCE } from '../constants/milestone-lifecycle';
import type { StageGroupKey } from '../types/projects-dashboard';

/**
 * Where a project is, in six stages a person can read at a glance.
 *
 * The groups are the comments already written over MILESTONE_LIFECYCLE_SEQUENCE.
 * `Payment 1…5` and custom names belong to no group: a step under them never
 * decides the stage (it shows up as "steps without a stage" instead).
 */
export interface StageGroup {
  key: StageGroupKey;
  label: string;
  phases: readonly string[];
}

export const STAGE_GROUPS: readonly StageGroup[] = [
  {
    key: 'design',
    label: 'Survey & design',
    phases: [
      'Planning',
      'Site Survey & Design',
      'Feasibility Study',
      'Structural Assessment',
      'Shading Analysis',
    ],
  },
  {
    key: 'approvals',
    label: 'Approvals',
    phases: [
      'Permits & Approvals',
      'DISCOM Application',
      'Net Metering Application',
      'Subsidy Application',
      'Loan Processing',
    ],
  },
  { key: 'material', label: 'Material', phases: ['Material Procurement', 'Equipment Delivery'] },
  {
    key: 'installation',
    label: 'Installation',
    phases: [
      'Civil & Structural Work',
      'Electrical Work',
      'Installation',
      'Earthing & Lightning Protection',
    ],
  },
  {
    key: 'meter',
    label: 'Testing & meter',
    phases: [
      'Inspection & Testing',
      'Commissioning',
      'Commissioning & Testing',
      'DISCOM Inspection',
      'Net Meter Installation',
    ],
  },
  {
    key: 'handover',
    label: 'Handover',
    phases: ['Handover', 'Customer Training', 'Documentation', 'AMC / Warranty Registration'],
  },
];

export const STAGE_GROUP_KEYS: readonly StageGroupKey[] = STAGE_GROUPS.map((g) => g.key);

/**
 * Loan and subsidy run beside the job, not in front of it: a bank's final
 * disbursement routinely lands after the meter is in. Their steps never decide
 * the stage and are never "old steps left open". Loan steps are found by the
 * workflow step's `loan_only` flag, because one of them (LOAN-002 Bank Account
 * Opening) sits in Planning.
 */
export const SIDE_TRACK_PHASES: readonly string[] = ['Loan Processing', 'Subsidy Application'];
/** Subsidy application + disbursement, which sit inside Commissioning & Testing. */
export const SIDE_TRACK_STEP_CODES: readonly string[] = ['LIA-014', 'LIA-016'];

export const NET_METER_PHASE = 'Net Meter Installation';

const GROUP_BY_PHASE: ReadonlyMap<string, StageGroupKey> = new Map(
  STAGE_GROUPS.flatMap((g) => g.phases.map((phase) => [phase, g.key] as const)),
);

export function phaseToStageGroup(name: string | null | undefined): StageGroupKey | null {
  if (!name) return null;
  const canonical = canonicalMilestoneName(name);
  return canonical ? (GROUP_BY_PHASE.get(canonical) ?? null) : null;
}

export interface StageTaskInput {
  milestoneName: string | null | undefined;
  done: boolean;
  workflowStepCode: string | null | undefined;
  loanOnly: boolean;
}

export interface ProjectStage {
  /** Catalog spelling of the phase the project is in; null when it has no main-line steps. */
  currentPhase: string | null;
  stageGroup: StageGroupKey | null;
  /** Open main-line steps in phases BEFORE the furthest phase with done work. */
  oldOpenStepCount: number;
}

export function isSideTrackStep(
  task: Pick<StageTaskInput, 'milestoneName' | 'workflowStepCode' | 'loanOnly'>,
): boolean {
  if (task.loanOnly) return true;
  if (task.workflowStepCode && SIDE_TRACK_STEP_CODES.includes(task.workflowStepCode)) return true;
  const canonical = task.milestoneName ? canonicalMilestoneName(task.milestoneName) : undefined;
  return canonical !== undefined && SIDE_TRACK_PHASES.includes(canonical);
}

/**
 * Furthest reached, not first open.
 *
 * Staff often finish a site without ticking an earlier step (a dispatch, a
 * permit). "First open step" then files a project whose meter is already in
 * under Material. So: find the furthest phase with done work, and the project
 * is at the first phase from there on that still has open work. Earlier open
 * steps are counted as old steps left open, for someone to clean up.
 *
 * The SQL twin of this function is PROJECT_FACTS_CTE in
 * apps/backend/src/modules/projects/sql/project-facts.sql.ts. Change both.
 */
export function deriveProjectStage(tasks: readonly StageTaskInput[]): ProjectStage {
  const none: ProjectStage = { currentPhase: null, stageGroup: null, oldOpenStepCount: 0 };

  // Main-line steps only: a known phase that belongs to a stage group, not a side track.
  const main: { index: number; phase: string; done: boolean }[] = [];
  for (const t of tasks) {
    if (isSideTrackStep(t) || !t.milestoneName) continue;
    const phase = canonicalMilestoneName(t.milestoneName);
    if (phase === undefined || !GROUP_BY_PHASE.has(phase)) continue;
    const index = canonicalMilestoneOrder(phase);
    if (index !== undefined) main.push({ index, phase, done: t.done });
  }
  if (main.length === 0) return none;

  // Catalog indexes start at 1, so 0 means "nothing done yet".
  let furthest = 0;
  for (const s of main) if (s.done && s.index > furthest) furthest = s.index;

  // The earliest phase, from the furthest one on, that still has an open step.
  let next: { index: number; phase: string } | undefined;
  let oldOpenStepCount = 0;
  for (const s of main) {
    if (s.done) continue;
    if (s.index < furthest) oldOpenStepCount += 1;
    else if (next === undefined || s.index < next.index) next = s;
  }

  const phase = next?.phase ?? MILESTONE_LIFECYCLE_SEQUENCE[furthest - 1];
  if (phase === undefined) return none;
  return {
    currentPhase: phase,
    stageGroup: GROUP_BY_PHASE.get(phase) ?? null,
    oldOpenStepCount,
  };
}
