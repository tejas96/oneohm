import type { MilestoneDisplayStatus } from '../types/enums/project.enum';

export interface MilestoneTaskStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
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
