import { z } from 'zod';

export const scheduleSiteVisitSchema = z.object({
  customerId: z.string().min(1, 'Please select a customer'),
  propertyId: z.string().min(1, 'Please select a property'),
  scheduledDate: z.date({
    required_error: 'Please select a date',
    invalid_type_error: 'Invalid date',
  }),
  scheduledTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  assignedToUserId: z.string().min(1, 'Please assign a technician'),
  visitType: z.enum(['initial_assessment', 'technical_survey', 'follow_up'], {
    errorMap: () => ({ message: 'Please select visit type' }),
  }),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  notes: z.string().max(1000, 'Notes too long').optional().or(z.literal('')),
  sendSmsReminder: z.boolean().default(true),
});

export type ScheduleSiteVisitFormData = z.infer<typeof scheduleSiteVisitSchema>;

export const rescheduleVisitSchema = z.object({
  scheduledDate: z.date({
    required_error: 'Please select a new date',
    invalid_type_error: 'Invalid date',
  }),
  scheduledTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  reason: z.string().min(1, 'Please provide a reason'),
  notifyCustomer: z.boolean().default(true),
});

export type RescheduleVisitFormData = z.infer<typeof rescheduleVisitSchema>;

export const cancelVisitSchema = z.object({
  reason: z.string().min(1, 'Please provide a reason'),
  notifyCustomer: z.boolean().default(true),
});

export type CancelVisitFormData = z.infer<typeof cancelVisitSchema>;
