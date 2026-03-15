import { z } from 'zod';

import { MilestoneType, ProjectPriority } from '../types/enums';

const isoDateOrEmpty = z
  .string()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}/.test(v), { message: 'Invalid date format' })
  .optional()
  .or(z.literal(''));

export const projectCreateSchema = z
  .object({
    customerId: z.string().uuid({ message: 'Customer is required' }),
    propertyId: z.string().uuid({ message: 'Property is required' }),
    quoteId: z.string().uuid({ message: 'Quote is required' }),
    name: z.string().min(3, 'Name must be at least 3 characters').max(255),
    description: z.string().max(2000).optional().or(z.literal('')),
    priority: z.nativeEnum(ProjectPriority),
    startDate: isoDateOrEmpty,
    endDate: isoDateOrEmpty,
    projectManagerId: z.string().uuid().optional().or(z.literal('')),
    teamMembers: z.array(
      z.object({
        userId: z.string().uuid(),
        roleName: z.string().min(1, 'Role is required'),
        isProjectManager: z.boolean().optional(),
      }),
    ),
    excludedStepIds: z.array(z.string().uuid()),
    taskAssignments: z.array(
      z.object({
        workflowStepId: z.string().uuid(),
        assignedToUserId: z.string().uuid(),
      }),
    ),
    taskMilestoneOverrides: z.array(
      z.object({
        workflowStepId: z.string().uuid(),
        milestoneOrder: z.number().int().min(0),
      }),
    ),
    milestones: z
      .array(
        z.object({
          id: z.string(),
          name: z.string().min(1, 'Milestone name is required').max(255),
          type: z.nativeEnum(MilestoneType),
          order: z.number().int().min(1),
        }),
      )
      .min(1, 'At least one milestone is required'),
  })
  .refine((d) => !d.startDate || !d.endDate || new Date(d.endDate) >= new Date(d.startDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type ProjectCreateFormData = z.infer<typeof projectCreateSchema>;
