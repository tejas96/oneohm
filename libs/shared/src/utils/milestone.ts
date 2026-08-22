import {
  MILESTONE_LIFECYCLE_ALIASES,
  MILESTONE_LIFECYCLE_SEQUENCE,
  UNKNOWN_MILESTONE_SEQUENCE_BASE,
} from '../constants/milestone-lifecycle';
import type { MilestoneDisplayStatus } from '../types/enums/project.enum';

export interface MilestoneTaskStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
}

export interface MilestoneSequenceRef {
  name: string;
  order?: number | null;
}

function normalizeMilestoneName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const SEQUENCE_BY_NORMALIZED_NAME: ReadonlyMap<string, number> = (() => {
  const map = new Map<string, number>();
  MILESTONE_LIFECYCLE_SEQUENCE.forEach((name, index) => {
    map.set(normalizeMilestoneName(name), index + 1);
  });
  for (const [alias, target] of Object.entries(MILESTONE_LIFECYCLE_ALIASES)) {
    const targetIndex = map.get(normalizeMilestoneName(target));
    if (targetIndex !== undefined) {
      map.set(normalizeMilestoneName(alias), targetIndex);
    }
  }
  return map;
})();

/**
 * Catalog index (1-based) for a known work-stage name, or undefined if custom.
 * Exact normalized match only — "Installation" must not match "Net Meter Installation".
 */
export function canonicalMilestoneOrder(name: string): number | undefined {
  if (!name.trim()) return undefined;
  return SEQUENCE_BY_NORMALIZED_NAME.get(normalizeMilestoneName(name));
}

/**
 * Stable sort key: catalog index for known names, otherwise stored order
 * shifted above the catalog so custom names cannot leapfrog Planning/Installation.
 */
export function milestoneSequenceIndex(name: string, storedOrder?: number | null): number {
  const canonical = canonicalMilestoneOrder(name);
  if (canonical !== undefined) return canonical;
  const fallback =
    storedOrder == null || Number.isNaN(Number(storedOrder)) ? 9999 : Number(storedOrder);
  return UNKNOWN_MILESTONE_SEQUENCE_BASE + fallback;
}

export function compareMilestoneSequence(a: MilestoneSequenceRef, b: MilestoneSequenceRef): number {
  const delta =
    milestoneSequenceIndex(a.name, a.order) - milestoneSequenceIndex(b.name, b.order);
  if (delta !== 0) return delta;
  return a.name.localeCompare(b.name);
}

/**
 * Derive a milestone's display status from its aggregated task counts.
 * Cancelled tasks are excluded before calling this function (not counted in totals).
 */
export function deriveMilestoneStatus(stats: MilestoneTaskStats): MilestoneDisplayStatus {
  const { totalTasks, completedTasks, inProgressTasks, blockedTasks } = stats;

  if (totalTasks === 0) return 'no_tasks';
  if (blockedTasks > 0) return 'blocked';
  if (completedTasks === totalTasks) return 'completed';
  if (inProgressTasks > 0 || completedTasks > 0) return 'in_progress';
  return 'pending';
}
