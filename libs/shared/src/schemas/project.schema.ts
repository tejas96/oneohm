import { z } from 'zod';

import { ProjectPriority } from '../types/enums';

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
        roleName: z.string(),
        isProjectManager: z.boolean().optional(),
      }),
    ),
    excludedStepIds: z.array(z.string().uuid()),
    taskAssignments: z.array(
      z.object({
        workflowStepId: z.string().uuid(),
        assignedToUserId: z.string().uuid().or(z.literal('')),
      }),
    ),
    taskMilestoneOverrides: z.array(
      z.object({
        workflowStepId: z.string().uuid(),
        milestoneName: z.string().max(255).nullable(),
        milestoneOrder: z.number().int().min(0).nullable(),
      }),
    ),
    milestones: z
      .array(
        z.object({
          name: z.string().min(1, 'Milestone name is required').max(255),
          order: z.number().int().min(1),
        }),
      )
      .min(1, 'At least one milestone is required')
      .refine(
        (items) => {
          const trimmed = items.map((m) => m.name.trim().toLowerCase());
          return new Set(trimmed).size === trimmed.length;
        },
        { message: 'Milestone names must be unique within a project' },
      ),
  })
  .refine((d) => !d.startDate || !d.endDate || new Date(d.endDate) >= new Date(d.startDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type ProjectCreateFormData = z.infer<typeof projectCreateSchema>;
