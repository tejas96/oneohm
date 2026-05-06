import { z } from 'zod';

const checklistItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  isCompleted: z.boolean(),
  order: z.number(),
});

export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const workflowStepSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters'),
  code: z.string().min(1, 'Code is required').max(100, 'Code must be at most 100 characters'),
  description: z.string().optional(),
  type: z.string().optional(),
  defaultRoleCode: z.string().optional(),
  defaultDepartment: z.string().optional(),
  defaultMilestoneName: z.string().max(255).nullable().optional(),
  defaultMilestoneOrder: z.coerce.number().int().min(0).nullable().optional(),
  sequenceOrder: z.coerce.number().int().min(1, 'Sequence order must be at least 1'),
  effortDays: z.coerce
    .number()
    .int()
    .min(0, 'Effort must be at least 0')
    .optional()
    .or(z.literal('')),
  isMandatory: z.boolean().default(true),
  canRunParallel: z.boolean().default(false),
  dependsOnTaskCodes: z.array(z.string()).optional().default([]),
  checklistTemplate: z.array(checklistItemSchema).optional().default([]),
});

export type WorkflowStepFormValues = z.input<typeof workflowStepSchema>;
