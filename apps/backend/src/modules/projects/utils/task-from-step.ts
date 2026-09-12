import { TaskStatus } from '@tejas96/shared/types';
import { canonicalMilestoneOrder } from '@tejas96/shared/utils';

import { type ProjectTaskEntity } from '../entities/project-task.entity';
import { type WorkflowStepEntity } from '../entities/workflow-step.entity';

/** Tasks sort on the board by their step's sequence, spaced for manual reordering. */
const KANBAN_ORDER_MULTIPLIER = 100;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * The columns every task built from a workflow step starts with.
 *
 * Project creation and the loan sync both build tasks here, so a task the sync
 * adds later looks exactly like one the project was created with.
 *
 * `milestone` is the wizard's override when there is one; otherwise the step's
 * default name and order apply. A name with a canonical lifecycle position always
 * takes that order.
 */
export function buildTaskFromStep(params: {
  step: WorkflowStepEntity;
  projectId: string;
  code: string;
  baseDate: Date;
  createdBy: string | null;
  milestone?: { name: string | null; order: number | null };
  milestoneNameToOrder?: Map<string, number>;
}): Partial<ProjectTaskEntity> {
  const { step, projectId, code, baseDate, createdBy, milestone, milestoneNameToOrder } = params;

  let milestoneName: string | null;
  let milestoneOrder: number | null;
  if (milestone !== undefined) {
    milestoneName = milestone.name;
    milestoneOrder =
      milestone.order ??
      (milestoneName ? (milestoneNameToOrder?.get(milestoneName) ?? null) : null);
  } else {
    milestoneName = step.defaultMilestoneName ?? null;
    milestoneOrder =
      step.defaultMilestoneOrder ??
      (milestoneName ? (milestoneNameToOrder?.get(milestoneName) ?? null) : null);
  }

  if (milestoneName) {
    const canonical = canonicalMilestoneOrder(milestoneName);
    if (canonical !== undefined) {
      milestoneOrder = canonical;
    }
  }

  return {
    projectId,
    workflowStepId: step.id,
    code,
    kanbanOrder: step.sequenceOrder * KANBAN_ORDER_MULTIPLIER,
    endDate: step.effortDays != null ? addDays(baseDate, step.effortDays) : undefined,
    status: TaskStatus.BACKLOG,
    milestoneName,
    milestoneOrder,
    createdBy: createdBy ?? undefined,
    updatedBy: createdBy ?? undefined,
  };
}
