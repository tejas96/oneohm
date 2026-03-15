import { CustomerStatus, LeadSource } from '@oneohm-epc/shared/types';
import { z } from 'zod';

// ============================================================================
// Create Customer Profile Schema (Simplified - Customer Profile Only)
// ============================================================================

export const createCustomerProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
  phone: z
    .string()
    .length(10, 'Phone must be 10 digits')
    .regex(/^[6-9]\d{9}$/, 'Enter a valid Indian mobile number'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  alternatePhone: z
    .string()
    .regex(/^\d{0,10}$/, 'Phone must contain only digits')
    .optional()
    .or(z.literal('')),
  address: z.string().max(500, 'Address too long').optional().or(z.literal('')),
  city: z.string().min(1, 'City is required').max(100, 'City too long'),
  state: z.string().min(1, 'State is required').max(100, 'State too long'),
  pincode: z
    .string()
    .length(6, 'Pincode must be 6 digits')
    .regex(/^\d{6}$/, 'Pincode must contain only digits'),
  leadSource: z.nativeEnum(LeadSource).nullish(),
  referralCode: z.string().max(50, 'Referral code too long').optional().or(z.literal('')),
  status: z.nativeEnum(CustomerStatus).nullish(),
});

export type CreateCustomerProfileFormData = z.infer<typeof createCustomerProfileSchema>;

// ============================================================================
// Import Customers Schema
// ============================================================================

export const importCustomersSchema = z.object({
  file: z.instanceof(File, { message: 'Please select a file' }),
  skipDuplicates: z.boolean().default(true),
  fieldMapping: z.record(z.string()).optional(),
});

export type ImportCustomersFormData = z.infer<typeof importCustomersSchema>;
