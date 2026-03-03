import { ConnectionType, LeadTemperature, PropertyType } from '@oneohm-epc/shared-types';
import { z } from 'zod';

// ============================================================================
// Create Property Schema (for API submission)
// ============================================================================

export const createPropertySchema = z.object({
  // Customer Reference (required for API)
  customerId: z.string().uuid('Please select a customer'),

  // Property Details
  propertyName: z.string().min(1, 'Property name is required').max(200, 'Property name too long'),
  propertyType: z.nativeEnum(PropertyType, {
    errorMap: () => ({ message: 'Please select a property type' }),
  }),
  isPrimary: z.boolean().optional(),

  // Address
  address: z.string().min(1, 'Address is required').max(500, 'Address too long'),
  city: z.string().min(1, 'City is required').max(100, 'City too long'),
  state: z.string().max(100, 'State too long').optional().or(z.literal('')),
  pincode: z
    .string()
    .min(6, 'Pincode must be 6 digits')
    .max(6, 'Pincode must be 6 digits')
    .regex(/^\d{6}$/, 'Pincode must be 6 digits'),

  // Electricity Details (all optional)
  consumerNumber: z.string().max(50, 'Consumer number too long').optional().or(z.literal('')),
  discomName: z.string().max(100, 'DISCOM name too long').optional().or(z.literal('')),
  connectionType: z.nativeEnum(ConnectionType).optional(),
  sanctionedLoad: z
    .number({ coerce: true })
    .min(0.1, 'Sanctioned load must be greater than 0')
    .max(1000, 'Sanctioned load too high')
    .optional(),
  meterNumber: z.string().max(50, 'Meter number too long').optional().or(z.literal('')),
  monthlyBill: z.number({ coerce: true }).min(0, 'Monthly bill cannot be negative').optional(),

  // Lead Status
  leadTemperature: z.nativeEnum(LeadTemperature, {
    errorMap: () => ({ message: 'Please select lead temperature' }),
  }),
  wantsLoan: z.boolean().optional(),
  notes: z.string().max(1000, 'Notes too long').optional().or(z.literal('')),
});

export type CreatePropertyFormData = z.infer<typeof createPropertySchema>;

// ============================================================================
// Add Property Schema (legacy - for backward compatibility)
// ============================================================================

/** @deprecated Use createPropertySchema instead */
export const addPropertySchema = createPropertySchema.omit({ customerId: true });

export type AddPropertyFormData = z.infer<typeof addPropertySchema>;

// ============================================================================
// Edit Property Schema
// ============================================================================

export const editPropertySchema = addPropertySchema.partial().extend({
  propertyName: z.string().min(1, 'Property name is required'),
});

export type EditPropertyFormData = z.infer<typeof editPropertySchema>;

// ============================================================================
// Mark as Lost Schema
// ============================================================================

export const markAsLostSchema = z.object({
  reason: z.string().min(1, 'Please select a reason'),
  notes: z.string().max(500, 'Notes too long').optional().or(z.literal('')),
});

export type MarkAsLostFormData = z.infer<typeof markAsLostSchema>;

// ============================================================================
// Lost Reasons (for dropdown)
// ============================================================================

export const LOST_REASONS = [
  { value: 'price_too_high', label: 'Price too high' },
  { value: 'chose_competitor', label: 'Chose competitor' },
  { value: 'not_interested', label: 'No longer interested' },
  { value: 'budget_constraints', label: 'Budget constraints' },
  { value: 'timing_issues', label: 'Timing issues' },
  { value: 'property_unsuitable', label: 'Property unsuitable' },
  { value: 'other', label: 'Other' },
] as const;
