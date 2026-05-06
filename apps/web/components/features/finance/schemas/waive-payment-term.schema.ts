import { z } from 'zod';

/**
 * Schema for the "Waive Term" confirmation dialog. Backend requires a
 * non-empty reason that gets persisted on the term and surfaced in the
 * audit trail.
 */
export const waivePaymentTermSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Reason is required (min 3 characters)')
    .max(500, 'Reason must be 500 characters or less'),
});

export type WaivePaymentTermFormValues = z.infer<typeof waivePaymentTermSchema>;
