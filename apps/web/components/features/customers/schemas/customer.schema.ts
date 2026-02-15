import {
  CustomerStatus,
  LeadSource,
  LeadTemperature,
  PropertyType,
  ConnectionType,
} from '@oneohm-epc/shared-types';
import { z } from 'zod';


// ============================================================================
// Create Customer Schema (Multi-step wizard)
// ============================================================================

// Step 1: Customer Info
export const customerInfoSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name too long'),
  lastName: z
    .string()
    .max(100, 'Last name too long')
    .optional(),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^[+]?[\d\s-]+$/, 'Invalid phone number format'),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  alternatePhone: z
    .string()
    .regex(/^[+]?[\d\s-]*$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
});

// Step 2: Property Details
export const propertyDetailsSchema = z.object({
  propertyName: z
    .string()
    .min(1, 'Property name is required')
    .max(200, 'Property name too long'),
  propertyType: z.nativeEnum(PropertyType, {
    errorMap: () => ({ message: 'Please select a property type' }),
  }),
  address: z
    .string()
    .min(1, 'Address is required')
    .max(500, 'Address too long'),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100, 'City too long'),
  state: z
    .string()
    .max(100, 'State too long')
    .optional()
    .or(z.literal('')),
  pincode: z
    .string()
    .min(6, 'Pincode must be 6 digits')
    .max(6, 'Pincode must be 6 digits')
    .regex(/^\d{6}$/, 'Pincode must be 6 digits'),
});

// Step 3: Electricity Details
export const electricityDetailsSchema = z.object({
  consumerNumber: z
    .string()
    .max(50, 'Consumer number too long')
    .optional()
    .or(z.literal('')),
  discomName: z
    .string()
    .min(1, 'DISCOM name is required')
    .max(100, 'DISCOM name too long'),
  connectionType: z.nativeEnum(ConnectionType, {
    errorMap: () => ({ message: 'Please select a connection type' }),
  }),
  sanctionedLoad: z
    .number({ coerce: true })
    .min(0.1, 'Sanctioned load must be greater than 0')
    .max(1000, 'Sanctioned load too high'),
  meterNumber: z
    .string()
    .max(50, 'Meter number too long')
    .optional()
    .or(z.literal('')),
  monthlyBill: z
    .number({ coerce: true })
    .min(0, 'Monthly bill cannot be negative')
    .optional(),
});

// Step 4: Lead Status
export const leadStatusSchema = z.object({
  leadTemperature: z.nativeEnum(LeadTemperature, {
    errorMap: () => ({ message: 'Please select lead temperature' }),
  }),
  wantsLoan: z.boolean().default(false),
  leadSource: z.nativeEnum(LeadSource).optional(),
  notes: z
    .string()
    .max(1000, 'Notes too long')
    .optional()
    .or(z.literal('')),
});

// Step 5: Review (billing address)
export const reviewStepSchema = z.object({
  billingAddressSameAsProperty: z.boolean().default(true),
  billingAddress: z.string().optional().or(z.literal('')),
  billingCity: z.string().optional().or(z.literal('')),
  billingState: z.string().optional().or(z.literal('')),
  billingPincode: z.string().optional().or(z.literal('')),
});

// Combined Create Customer Schema
export const createCustomerSchema = customerInfoSchema
  .merge(propertyDetailsSchema)
  .merge(electricityDetailsSchema)
  .merge(leadStatusSchema)
  .merge(reviewStepSchema);

export type CustomerInfoFormData = z.infer<typeof customerInfoSchema>;
export type PropertyDetailsFormData = z.infer<typeof propertyDetailsSchema>;
export type ElectricityDetailsFormData = z.infer<typeof electricityDetailsSchema>;
export type LeadStatusFormData = z.infer<typeof leadStatusSchema>;
export type ReviewStepFormData = z.infer<typeof reviewStepSchema>;
export type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;

// ============================================================================
// Edit Customer Schema
// ============================================================================

export const editCustomerSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name too long'),
  lastName: z
    .string()
    .max(100, 'Last name too long')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^[+]?[\d\s-]+$/, 'Invalid phone number format'),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
  alternatePhone: z
    .string()
    .regex(/^[+]?[\d\s-]*$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  status: z.nativeEnum(CustomerStatus).optional(),
  billingAddress: z.string().optional().or(z.literal('')),
  billingCity: z.string().optional().or(z.literal('')),
  billingState: z.string().optional().or(z.literal('')),
  billingPincode: z.string().optional().or(z.literal('')),
});

export type EditCustomerFormData = z.infer<typeof editCustomerSchema>;

// ============================================================================
// Import Customers Schema
// ============================================================================

export const importCustomersSchema = z.object({
  file: z.instanceof(File, { message: 'Please select a file' }),
  skipDuplicates: z.boolean().default(true),
  fieldMapping: z.record(z.string()).optional(),
});

export type ImportCustomersFormData = z.infer<typeof importCustomersSchema>;
