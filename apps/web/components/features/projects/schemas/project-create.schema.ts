import { ProjectPriority } from '@oneohm-epc/shared-types';
import { z } from 'zod';

export const projectCreateSchema = z
  .object({
    customerId: z.string().uuid({ message: 'Customer is required' }),
    propertyId: z.string().uuid({ message: 'Property is required' }),
    quoteId: z.string().uuid().optional().or(z.literal('')),
    name: z.string().min(3, 'Name must be at least 3 characters').max(255),
    description: z.string().max(2000).optional().or(z.literal('')),
    projectType: z.string().min(1, 'Project type is required'),
    systemSizeKw: z
      .number({ required_error: 'System size is required' })
      .positive('Must be greater than 0'),
    estimatedCost: z.number().min(0).optional(),
    priority: z.nativeEnum(ProjectPriority),
    startDate: z.string().optional().or(z.literal('')),
    endDate: z.string().optional().or(z.literal('')),
    projectManagerId: z.string().uuid().optional().or(z.literal('')),
    teamMembers: z
      .array(
        z.object({
          userId: z.string().uuid(),
          roleName: z.string().min(1, 'Role is required'),
          isProjectManager: z.boolean().optional(),
        }),
      ),
    excludedTaskTemplateIds: z.array(z.string().uuid()),
  })
  .refine(
    (d) =>
      !d.startDate ||
      !d.endDate ||
      new Date(d.endDate) >= new Date(d.startDate),
    { message: 'End date must be on or after start date', path: ['endDate'] },
  );

export type ProjectCreateFormData = z.infer<typeof projectCreateSchema>;
