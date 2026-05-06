import { ExpenseCategory, ExpensePaidByType, PaymentMethod } from '@oneohm-epc/shared/types';
import { z } from 'zod';

import { expenseProductLineSchema } from './expense-product-line.schema';

/**
 * Schema for the two-step Expense drawer. Step 1 collects the
 * essentials (category, vendor, amount, etc.). Step 2 — only shown for
 * the MATERIALS category — collects optional product-line breakdown
 * for procurement-status aggregation.
 *
 * Mirrors backend CreateExpenseDto:
 *   - `paidBy` defaults to COMPANY, which makes `paidByEmployeeId` optional
 *   - `paidBy = EMPLOYEE` requires `paidByEmployeeId`
 *   - `override = true` requires `overrideReason`
 *   - Sum of (quantity * unitPrice) across productLinks must not exceed
 *     `amount` (server validates too — we surface early to avoid a 400)
 */
export const createExpenseSchema = z
  .object({
    category: z.nativeEnum(ExpenseCategory, {
      errorMap: () => ({ message: 'Pick a category' }),
    }),
    vendorName: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v ? v : undefined)),
    amount: z.coerce
      .number({ invalid_type_error: 'Amount is required' })
      .positive('Amount must be greater than 0'),
    expenseDate: z
      .string()
      .trim()
      .min(1, 'Expense date is required')
      .refine(
        (v) => !Number.isNaN(new Date(v).getTime()) && new Date(v).getTime() <= Date.now(),
        'Date cannot be in the future',
      ),
    paymentMethod: z.nativeEnum(PaymentMethod, {
      errorMap: () => ({ message: 'Select a payment method' }),
    }),
    paidBy: z.nativeEnum(ExpensePaidByType),
    paidByEmployeeId: z
      .string()
      .uuid('Invalid employee')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    notes: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .transform((v) => (v ? v : undefined)),
    productLinks: z.array(expenseProductLineSchema).optional(),
    override: z.boolean().optional(),
    overrideReason: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .superRefine((val, ctx) => {
    if (val.paidBy === ExpensePaidByType.EMPLOYEE && !val.paidByEmployeeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paidByEmployeeId'],
        message: 'Pick the employee who paid',
      });
    }
    if (val.override && !val.overrideReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['overrideReason'],
        message: 'Reason required when overriding the procurement guard',
      });
    }
    if (val.productLinks && val.productLinks.length > 0) {
      const lineTotal = val.productLinks.reduce((acc, l) => {
        const qty = Number(l.quantity ?? 0);
        const price = Number(l.unitPrice ?? 0);
        return acc + qty * price;
      }, 0);
      // Allow ~1 paisa rounding tolerance.
      if (lineTotal - Number(val.amount ?? 0) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['amount'],
          message: `Line items total ₹${lineTotal.toFixed(2)} exceeds expense amount`,
        });
      }
    }
  });

export type CreateExpenseFormValues = z.infer<typeof createExpenseSchema>;
