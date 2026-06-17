import { type TaskChecklist, type WorkflowStep } from '@tejas96/shared/types';

import { type WorkflowStepFormValues } from '../schemas/workflow-step.schema';

export function buildWorkflowStepPayload(data: WorkflowStepFormValues): Partial<WorkflowStep> {
  const depCodes = (data.dependsOnTaskCodes ?? []).filter(Boolean);
  const checklistItems = (data.checklistTemplate ?? []).filter((item) => item.title.trim());

  return {
    name: data.name,
    code: data.code,
    description: data.description || undefined,
    type: data.type || undefined,
    defaultRoleCode: data.defaultRoleCode || undefined,
    defaultDepartment: data.defaultDepartment || undefined,
    defaultMilestoneName: data.defaultMilestoneName || undefined,
    defaultMilestoneOrder: data.defaultMilestoneOrder ?? undefined,
    sequenceOrder: data.sequenceOrder,
    effortDays:
      data.effortDays !== '' && data.effortDays != null ? Number(data.effortDays) : undefined,
    isMandatory: data.isMandatory ?? true,
    canRunParallel: data.canRunParallel ?? false,
    dependsOnTaskCodes: depCodes,
    checklistTemplate: { items: checklistItems } as TaskChecklist,
  };
}
