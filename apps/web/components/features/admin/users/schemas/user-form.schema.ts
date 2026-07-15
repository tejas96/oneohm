import { z } from 'zod';

// Fields shared between create and edit (email and password intentionally excluded)
const baseUserFields = {
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().max(100).optional().or(z.literal('')),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  profileKind: z.enum(['staff', 'reseller']).default('staff'),
  // Staff fields
  employeeId: z.string().max(50).optional().or(z.literal('')),
  department: z.string().max(100).optional().or(z.literal('')),
  designation: z.string().max(100).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  // Reseller fields
  companyName: z.string().max(100).optional().or(z.literal('')),
  companyCode: z.string().max(50).optional().or(z.literal('')),
  contactPersonName: z.string().max(100).optional().or(z.literal('')),
  commissionPercentage: z.string().optional().or(z.literal('')),
  gstin: z.string().max(15).optional().or(z.literal('')),
  pan: z.string().max(10).optional().or(z.literal('')),
  bankName: z.string().max(100).optional().or(z.literal('')),
  accountNumber: z.string().max(50).optional().or(z.literal('')),
  ifscCode: z.string().max(20).optional().or(z.literal('')),
  accountHolderName: z.string().max(100).optional().or(z.literal('')),
};

const validateProfileFields = (data: any, ctx: z.RefinementCtx) => {
  if (data.profileKind === 'reseller') {
    if (!data.companyName || data.companyName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Company name is required for reseller',
        path: ['companyName'],
      });
    }
    if (!data.companyCode || data.companyCode.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Company code is required for reseller',
        path: ['companyCode'],
      });
    }
    if (!data.commissionPercentage || data.commissionPercentage.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Commission percentage is required for reseller',
        path: ['commissionPercentage'],
      });
    } else {
      const val = parseFloat(data.commissionPercentage);
      if (Number.isNaN(val) || val < 0 || val > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Commission percentage must be a valid number between 0 and 100',
          path: ['commissionPercentage'],
        });
      }
    }
  }
};

export const createUserSchema = z
  .object({
    ...baseUserFields,
    email: z.string().email('Invalid email address').max(255).min(1, 'Email is required'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(50),
  })
  .superRefine(validateProfileFields);

// Edit mode: email is editable but optional (users may not have one), password is never changed here
export const editUserSchema = z
  .object({
    ...baseUserFields,
    email: z.string().email('Invalid email address').max(255).optional().or(z.literal('')),
  })
  .superRefine(validateProfileFields);

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type EditUserFormData = z.infer<typeof editUserSchema>;
export type UserFormData = CreateUserFormData | EditUserFormData;
