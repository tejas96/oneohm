import { z } from 'zod';

/**
 * Schema for the "Add Manual Term" dialog. Mirrors backend
 * CreatePaymentTermDto. `displayOrder` is auto-assigned server-side
 * (next available position for the project) so it is intentionally
 * omitted from the form.
 */
export const addPaymentTermSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be 120 characters or less'),
  stage: z
    .string()
    .trim()
    .min(1, 'Stage is required')
    .max(80, 'Stage must be 80 characters or less'),
  expectedAmount: z.coerce
    .number({ invalid_type_error: 'Amount is required' })
    .positive('Amount must be greater than 0')
    .refine((v) => Number.isFinite(v), 'Amount must be a valid number'),
  dueDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes must be 1000 characters or less')
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type AddPaymentTermFormValues = z.infer<typeof addPaymentTermSchema>;
