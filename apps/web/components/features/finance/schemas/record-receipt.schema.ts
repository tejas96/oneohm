import { PaymentMethod } from '@oneohm-epc/shared/types';
import { z } from 'zod';

/**
 * Schema for the "Record Receipt" dialog. Mirrors backend
 * CreateReceiptDto — `customerId` is omitted because the server
 * auto-fills it from the project's quote, and `paymentTermId` is the
 * (optional) link to a planned installment. `proofDocument` is wired
 * up in a later slice when storage uploads are integrated.
 */
export const recordReceiptSchema = z
  .object({
    paymentTermId: z
      .string()
      .uuid('Invalid term selection')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    paidAmount: z.coerce
      .number({ invalid_type_error: 'Amount is required' })
      .positive('Amount must be greater than 0')
      .refine(
        (v) => Number.isFinite(v) && Number((v * 100).toFixed(0)) / 100 === v,
        'At most 2 decimal places',
      ),
    paymentMethod: z.nativeEnum(PaymentMethod, {
      errorMap: () => ({ message: 'Select a payment method' }),
    }),
    paidAt: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : undefined))
      .refine(
        (v) => !v || new Date(v).getTime() <= Date.now(),
        'Receipt date cannot be in the future',
      ),
    paymentReference: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => (v ? v : undefined)),
    bankName: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => (v ? v : undefined)),
    accountNumber: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((v) => (v ? v : undefined)),
    ifscCode: z
      .string()
      .trim()
      .max(20)
      .optional()
      .transform((v) => (v ? v : undefined)),
    notes: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .superRefine((val, ctx) => {
    // For bank-rail methods we strongly recommend a reference for
    // auditability. Surface as a warning-level issue (still allowed but
    // forces the user to acknowledge by typing one in).
    const needsRef =
      val.paymentMethod === PaymentMethod.NEFT ||
      val.paymentMethod === PaymentMethod.RTGS ||
      val.paymentMethod === PaymentMethod.UPI ||
      val.paymentMethod === PaymentMethod.CHEQUE;
    if (needsRef && !val.paymentReference) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentReference'],
        message: 'Reference (UTR / UPI ID / cheque #) is required for this method',
      });
    }
  });

export type RecordReceiptFormValues = z.infer<typeof recordReceiptSchema>;
