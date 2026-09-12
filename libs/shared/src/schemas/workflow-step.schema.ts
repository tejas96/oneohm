import { z } from 'zod';

import { ChangeRequestType } from '../types/enums/change-request.enum';
import { PropertyType } from '../types/enums/customer.enum';
import { WorkflowStepType } from '../types/enums/project.enum';
import {
  customerUpdateTextProblem,
  normalizeCustomerUpdateText,
} from '../utils/customer-update-text';

const checklistItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  isCompleted: z.boolean(),
  order: z.number(),
});

export type ChecklistItem = z.infer<typeof checklistItemSchema>;

/**
 * A number box the admin is allowed to leave blank. An empty box means "not
 * set", never zero, so '' / null / NaN all land on null. NaN is included
 * because an emptied <input type="number"> reaches the resolver as NaN;
 * rejecting it here would block the whole submit with no field to hang the
 * message on.
 */
function blankableInt(
  message: string,
): z.ZodType<number | null, z.ZodTypeDef, '' | number | null | undefined> {
  return z
    .union([z.literal(''), z.null(), z.nan(), z.coerce.number().int(message).min(0, message)])
    .optional()
    .transform((value): number | null => {
      if (value === '' || value === null || value === undefined) return null;
      return Number.isNaN(value) ? null : value;
    });
}

export const workflowStepSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters'),
    code: z.string().min(1, 'Code is required').max(100, 'Code must be at most 100 characters'),
    description: z.string().optional(),
    type: z
      .nativeEnum(WorkflowStepType, {
        errorMap: () => ({ message: 'Pick a step type from the list' }),
      })
      .nullable()
      .optional(),
    defaultRoleCode: z.string().optional(),
    defaultDepartment: z.string().optional(),
    defaultMilestoneName: z.string().max(255).nullable().optional(),
    defaultMilestoneOrder: blankableInt('Milestone order must be a whole number, 0 or more'),
    sequenceOrder: z.coerce.number().int().min(1, 'Sequence order must be at least 1'),
    effortDays: blankableInt('Effort must be a whole number of days, 0 or more'),
    isMandatory: z.boolean().default(true),
    canRunParallel: z.boolean().default(false),
    isSpecial: z.boolean().default(false),
    changeRequestType: z.nativeEnum(ChangeRequestType).nullable().optional(),
    dependsOnTaskCodes: z.array(z.string()).optional().default([]),
    checklistTemplate: z.array(checklistItemSchema).optional().default([]),
    loanOnly: z.boolean().default(false),
    propertyTypes: z.array(z.nativeEnum(PropertyType)).default([]),
    whatsappOnDone: z.boolean().default(false),
    customerUpdateText: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // A change-request template is only ever found through its type, so the pair
    // has to stay whole. The backend refuses the same halves.
    if (data.isSpecial && !data.changeRequestType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pick which change request this step handles',
        path: ['changeRequestType'],
      });
    }

    // The same rules the backend applies: required when ticked, and nothing Meta
    // would refuse inside a template parameter.
    const updateText = normalizeCustomerUpdateText(data.customerUpdateText);
    if (data.whatsappOnDone && !updateText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Write the update the customer gets',
        path: ['customerUpdateText'],
      });
    } else if (updateText) {
      const problem = customerUpdateTextProblem(updateText);
      if (problem) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem, path: ['customerUpdateText'] });
      }
    }
  });

export type WorkflowStepFormValues = z.input<typeof workflowStepSchema>;
