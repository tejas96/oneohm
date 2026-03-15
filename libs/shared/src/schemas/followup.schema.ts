import { z } from 'zod';

import { FollowupType, FollowupPriority } from '../types/enums';

export const followupSchema = z.object({
  propertyId: z.string().min(1, 'Please select a property'),
  type: z.nativeEnum(FollowupType, {
    errorMap: () => ({ message: 'Please select a followup type' }),
  }),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  scheduledDate: z.date({
    required_error: 'Please select a date',
    invalid_type_error: 'Invalid date',
  }),
  scheduledTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format')
    .optional(),
  priority: z.nativeEnum(FollowupPriority).default(FollowupPriority.NORMAL),
  notes: z.string().max(1000, 'Notes too long').optional().or(z.literal('')),
  assignedToUserId: z.string().optional(),
});

export type FollowupFormData = z.infer<typeof followupSchema>;

export const rescheduleFollowupSchema = z.object({
  scheduledDate: z.date({
    required_error: 'Please select a new date',
    invalid_type_error: 'Invalid date',
  }),
  scheduledTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format')
    .optional(),
  reason: z.string().min(1, 'Please provide a reason'),
  notes: z.string().max(500, 'Notes too long').optional().or(z.literal('')),
});

export type RescheduleFollowupFormData = z.infer<typeof rescheduleFollowupSchema>;

export const completeFollowupSchema = z.object({
  outcome: z.string().min(1, 'Please describe the outcome').max(500, 'Outcome too long'),
  nextSteps: z.string().max(500, 'Next steps too long').optional().or(z.literal('')),
  scheduleNextFollowup: z.boolean().default(false),
});

export type CompleteFollowupFormData = z.infer<typeof completeFollowupSchema>;
