import { z } from 'zod';

/**
 * Single material line item attached to a materials-category expense.
 * Mirrors backend ExpenseProductLinkDto: either `productId` (catalog
 * item from the project BOM) OR `itemName` (off-list ad-hoc item) must
 * be present; both is allowed but only `productId` is meaningful for
 * procurement-status aggregation.
 */
export const expenseProductLineSchema = z
  .object({
    productId: z
      .string()
      .uuid()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    itemName: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v ? v : undefined)),
    unit: z
      .string()
      .trim()
      .max(20)
      .optional()
      .transform((v) => (v ? v : undefined)),
    quantity: z.coerce
      .number({ invalid_type_error: 'Quantity is required' })
      .positive('Quantity must be greater than 0'),
    // Coerced number; empty input becomes NaN which we treat as "unset"
    // via the refine below (kept optional in payload assembly).
    unitPrice: z.coerce
      .number()
      .nonnegative('Unit price cannot be negative')
      .optional()
      .or(z.nan().transform(() => undefined)),
    notes: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .refine((v) => Boolean(v.productId || v.itemName), {
    message: 'Pick a BOM item or enter an item name',
    path: ['productId'],
  });

export type ExpenseProductLineFormValues = z.infer<typeof expenseProductLineSchema>;
