import { type TaskChecklist, type WorkflowStep } from '@tejas96/shared/types';

import { type WorkflowStepFormValues } from '../schemas/workflow-step.schema';

// PATCH drops undefined keys before the request leaves the browser, so an
// emptied field has to travel as an explicit null or the column keeps its old
// value and the "updated" toast lies.

function textOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function intOrNull(value: number | string | null | undefined): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildWorkflowStepPayload(data: WorkflowStepFormValues): Partial<WorkflowStep> {
  const depCodes = (data.dependsOnTaskCodes ?? []).filter(Boolean);
  const checklistItems = (data.checklistTemplate ?? []).filter((item) => item.title.trim());

  return {
    name: data.name,
    code: data.code,
    description: textOrNull(data.description),
    // Already a fixed list from the dropdown; only the empty choice needs mapping.
    type: data.type ?? null,
    defaultRoleCode: textOrNull(data.defaultRoleCode),
    defaultDepartment: textOrNull(data.defaultDepartment),
    defaultMilestoneName: textOrNull(data.defaultMilestoneName),
    defaultMilestoneOrder: intOrNull(data.defaultMilestoneOrder),
    sequenceOrder: Number(data.sequenceOrder),
    effortDays: intOrNull(data.effortDays),
    isMandatory: data.isMandatory ?? true,
    canRunParallel: data.canRunParallel ?? false,
    isSpecial: data.isSpecial ?? false,
    // Only a change-request step carries a type; clearing the flag clears the pair.
    changeRequestType: data.isSpecial ? (data.changeRequestType ?? null) : null,
    dependsOnTaskCodes: depCodes,
    checklistTemplate: { items: checklistItems } as TaskChecklist,
  };
}
