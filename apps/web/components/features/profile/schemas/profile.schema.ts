import { UserGender } from '@oneohm-epc/shared/types';
import { z } from 'zod';

// ── Phone validation helpers ───────────────────────────────────

const PHONE_DIGITS_REGEX = /^\d+$/;

function validatePhone(val: string | undefined, ctx: z.RefinementCtx): void {
  if (!val || val.trim() === '') return;
  const raw = val.trim();
  // Strip leading +91 or 0 prefix for length check
  const digits = raw.replace(/^(\+91|91|0)/, '').replace(/\D/g, '');
  if (!PHONE_DIGITS_REGEX.test(digits)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phone must contain digits only' });
    return;
  }
  if (digits.length < 10) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phone must be at least 10 digits' });
    return;
  }
  if (digits.length > 15) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phone number is too long' });
  }
}

// ── Personal Info ──────────────────────────────────────────────

export const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().max(100).optional().or(z.literal('')),
  phone: z
    .string()
    .optional()
    .or(z.literal(''))
    .superRefine((val, ctx) => {
      validatePhone(val, ctx);
    }),
  alternatePhone: z
    .string()
    .optional()
    .or(z.literal(''))
    .superRefine((val, ctx) => {
      validatePhone(val, ctx);
    }),
  dateOfBirth: z.date().optional().nullable(),
  gender: z.nativeEnum(UserGender).optional(),
});

export type PersonalInfoFormValues = z.infer<typeof personalInfoSchema>;

// ── Address ────────────────────────────────────────────────────

export const addressSchema = z.object({
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  country: z.string().min(1, 'Country is required').max(100),
  pincode: z
    .string()
    .optional()
    .or(z.literal(''))
    .superRefine((val, ctx) => {
      if (!val || val.trim() === '') return;
      const trimmed = val.trim();
      if (!/^\d+$/.test(trimmed)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'PIN must contain digits only' });
        return;
      }
      if (trimmed.length < 6 || trimmed.length > 10) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'PIN must be 6–10 digits' });
      }
    }),
});

export type AddressFormValues = z.infer<typeof addressSchema>;
