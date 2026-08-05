export {
  fixedRoleCodeSchema,
  workflowStepDefaultRoleCodeSchema,
  workflowStepSchema,
  type WorkflowStepFormValues,
  type ChecklistItem,
} from '@tejas96/shared/schemas';

import {
  workflowStepDefaultRoleCodeSchema,
  workflowStepSchema,
} from '@tejas96/shared/schemas';
import type { z } from 'zod';

export const fixedModeWorkflowStepSchema = workflowStepSchema.extend({
  defaultRoleCode: workflowStepDefaultRoleCodeSchema.optional(),
});

export type FixedModeWorkflowStepFormValues = z.infer<typeof fixedModeWorkflowStepSchema>;
