import { TaskPriority, TaskStatus } from '@oneohm-epc/shared/types';
import { z } from 'zod';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const optionalIsoDateField = z
  .string()
  .optional()
  .refine((value) => !value || ISO_DATE_PATTERN.test(value), {
    message: 'Enter a valid date',
  });

export const createProjectTaskSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Task name is required')
      .max(255, 'Task name must be 255 characters or fewer'),
    description: z.string().trim().max(2000).optional(),
    status: z.nativeEnum(TaskStatus),
    priority: z.nativeEnum(TaskPriority),
    assignedToUserId: z.string().uuid().nullable().optional(),
    milestoneName: z.string().max(255).nullable().optional(),
    startDate: optionalIsoDateField,
    endDate: optionalIsoDateField,
  })
  .refine(
    ({ startDate, endDate }) => {
      if (!startDate || !endDate) return true;
      return endDate >= startDate;
    },
    {
      message: 'Due date must be on or after start date',
      path: ['endDate'],
    },
  );

export type CreateProjectTaskFormData = z.infer<typeof createProjectTaskSchema>;
