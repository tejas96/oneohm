import { FollowupType, FollowupPriority } from '@oneohm-epc/shared/types';
import { z } from 'zod';

// ============================================================================
// Create/Edit Followup Schema
// ============================================================================

export const followupSchema = z.object({
  // Property (required)
  propertyId: z.string().min(1, 'Please select a property'),

  // Followup Type
  type: z.nativeEnum(FollowupType, {
    errorMap: () => ({ message: 'Please select a followup type' }),
  }),

  // Subject
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),

  // Date and Time
  scheduledDate: z.date({
    required_error: 'Please select a date',
    invalid_type_error: 'Invalid date',
  }),
  scheduledTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format')
    .optional(),

  // Priority (default: normal)
  priority: z.nativeEnum(FollowupPriority).default(FollowupPriority.NORMAL),

  // Notes
  notes: z.string().max(1000, 'Notes too long').optional().or(z.literal('')),

  // Assigned to (user ID)
  assignedToUserId: z.string().optional(),
});

export type FollowupFormData = z.infer<typeof followupSchema>;

// ============================================================================
// Reschedule Followup Schema
// ============================================================================

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

// ============================================================================
// Complete Followup Schema
// ============================================================================

export const completeFollowupSchema = z.object({
  outcome: z.string().min(1, 'Please describe the outcome').max(500, 'Outcome too long'),
  nextSteps: z.string().max(500, 'Next steps too long').optional().or(z.literal('')),
  scheduleNextFollowup: z.boolean().default(false),
});

export type CompleteFollowupFormData = z.infer<typeof completeFollowupSchema>;

// ============================================================================
// Followup Type Options
// ============================================================================

export const FOLLOWUP_TYPE_OPTIONS = [
  { value: FollowupType.VISIT, label: 'Site Visit', icon: 'MapPin' },
  { value: FollowupType.MEETING, label: 'Meeting', icon: 'Users' },
  { value: FollowupType.TASK, label: 'Task', icon: 'CheckSquare' },
  { value: FollowupType.REMINDER, label: 'Reminder', icon: 'Bell' },
  { value: FollowupType.DOCUMENT_COLLECTION, label: 'Document Collection', icon: 'FileText' },
] as const;

export const PRIORITY_OPTIONS = [
  { value: FollowupPriority.LOW, label: 'Low' },
  { value: FollowupPriority.NORMAL, label: 'Normal' },
  { value: FollowupPriority.HIGH, label: 'High' },
] as const;
