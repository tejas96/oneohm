import { z } from 'zod';

// ============================================================================
// Schedule Site Visit Schema
// ============================================================================

export const scheduleSiteVisitSchema = z.object({
  // Property Selection
  customerId: z.string().min(1, 'Please select a customer'),
  propertyId: z.string().min(1, 'Please select a property'),

  // Schedule
  scheduledDate: z.date({
    required_error: 'Please select a date',
    invalid_type_error: 'Invalid date',
  }),
  scheduledTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),

  // Assignment
  assignedToUserId: z.string().min(1, 'Please assign a technician'),

  // Visit Configuration
  visitType: z.enum(['initial_assessment', 'technical_survey', 'follow_up'], {
    errorMap: () => ({ message: 'Please select visit type' }),
  }),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),

  // Additional Info
  notes: z
    .string()
    .max(1000, 'Notes too long')
    .optional()
    .or(z.literal('')),
  sendSmsReminder: z.boolean().default(true),
});

export type ScheduleSiteVisitFormData = z.infer<typeof scheduleSiteVisitSchema>;

// ============================================================================
// Reschedule Visit Schema
// ============================================================================

export const rescheduleVisitSchema = z.object({
  scheduledDate: z.date({
    required_error: 'Please select a new date',
    invalid_type_error: 'Invalid date',
  }),
  scheduledTime: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  reason: z.string().min(1, 'Please provide a reason'),
  notifyCustomer: z.boolean().default(true),
});

export type RescheduleVisitFormData = z.infer<typeof rescheduleVisitSchema>;

// ============================================================================
// Cancel Visit Schema
// ============================================================================

export const cancelVisitSchema = z.object({
  reason: z.string().min(1, 'Please provide a reason'),
  notifyCustomer: z.boolean().default(true),
});

export type CancelVisitFormData = z.infer<typeof cancelVisitSchema>;

// ============================================================================
// Visit Type Options
// ============================================================================

export const VISIT_TYPE_OPTIONS = [
  { value: 'initial_assessment', label: 'Initial Assessment', description: 'First site visit to assess feasibility' },
  { value: 'technical_survey', label: 'Technical Survey', description: 'Detailed technical measurement and evaluation' },
  { value: 'follow_up', label: 'Follow-up Visit', description: 'Follow-up on previous assessment' },
] as const;

export const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
] as const;

// ============================================================================
// Time Slot Options
// ============================================================================

export const TIME_SLOT_OPTIONS = [
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '17:00', label: '5:00 PM' },
] as const;
