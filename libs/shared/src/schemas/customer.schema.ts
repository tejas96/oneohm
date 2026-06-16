import { z } from 'zod';

import { CustomerStatus, LeadSource } from '../types/enums';

const indianMobileSchema = z
  .string()
  .length(10, 'Phone must be 10 digits')
  .regex(/^[6-9]\d{9}$/, 'Enter a valid Indian mobile number');

export const createCustomerProfileSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
    middleName: z.string().min(1, 'Middle name is required').max(100, 'Middle name too long'),
    lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
    phone: indianMobileSchema,
    email: z.union([z.string().email('Invalid email address'), z.literal('')]).optional(),
    alternatePhone: z.union([z.literal(''), indianMobileSchema]).optional(),
    address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
    city: z.string().min(1, 'City is required').max(100, 'City too long'),
    state: z.string().min(1, 'State is required').max(100, 'State too long'),
    pincode: z
      .string()
      .length(6, 'Pincode must be 6 digits')
      .regex(/^\d{6}$/, 'Pincode must contain only digits'),
    leadSource: z.string().max(50, 'Lead source too long').nullish(),
    /** Form-only field: shown when leadSource === 'other'. Actual custom text sent as leadSource. */
    leadSourceOther: z.string().max(50, 'Source description too long').optional().or(z.literal('')),
    referralCode: z.string().max(50, 'Referral code too long').optional().or(z.literal('')),
    status: z.nativeEnum(CustomerStatus).nullish(),
    /** Group assignment: code of an existing group */
    groupCode: z.string().max(20).optional().or(z.literal('')),
    /** Group assignment: name for new group (when no groupCode) or label of existing group */
    groupName: z.string().max(100).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.leadSource === LeadSource.OTHER && !data.leadSourceOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please specify the source',
        path: ['leadSourceOther'],
      });
    }
  });

export type CreateCustomerProfileFormData = z.infer<typeof createCustomerProfileSchema>;
