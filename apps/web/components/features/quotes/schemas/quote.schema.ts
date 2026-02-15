import {
  SystemType,
  PhaseType,
  DcrPreference,
  StructureType,
} from '@oneohm-epc/shared-types';
import { z } from 'zod';


// ============================================================================
// Quote Builder Schema
// ============================================================================

// Step 1: Customer & Property Selection
export const quoteCustomerPropertySchema = z.object({
  customerId: z.string().optional(), // Optional because customer context may come from property
  propertyId: z.string().min(1, 'Please select a property'),
});

// Step 2: System Configuration
export const quoteSystemConfigSchema = z.object({
  systemSizeKw: z
    .number({ coerce: true })
    .min(1, 'System size must be at least 1 kW')
    .max(500, 'System size cannot exceed 500 kW'),
  systemType: z.nativeEnum(SystemType, {
    errorMap: () => ({ message: 'Please select system type' }),
  }),
  phaseType: z.nativeEnum(PhaseType, {
    errorMap: () => ({ message: 'Please select phase type' }),
  }),
  isSubsidyApplicable: z.boolean().default(true),
  dcrPreference: z.nativeEnum(DcrPreference).default(DcrPreference.DCR_ONLY),
});

// Step 3: Equipment Selection
export const quoteEquipmentSchema = z.object({
  panelId: z.string().optional().or(z.literal('')),
  inverterId: z.string().optional().or(z.literal('')),
  preferredPanelBrand: z
    .string()
    .max(100, 'Brand name too long')
    .optional()
    .or(z.literal('')),
  preferredPanelTechnology: z
    .string()
    .max(100, 'Technology name too long')
    .optional()
    .or(z.literal('')),
  preferredInverterBrand: z
    .string()
    .max(100, 'Brand name too long')
    .optional()
    .or(z.literal('')),
  structureType: z.nativeEnum(StructureType).optional(),
});

// Step 4: Site & Pricing
export const quoteSitePricingSchema = z.object({
  floorNumber: z
    .number({ coerce: true })
    .min(0, 'Floor number cannot be negative')
    .max(100, 'Floor number too high')
    .default(0),
  distanceKm: z
    .number({ coerce: true })
    .min(0, 'Distance cannot be negative')
    .max(1000, 'Distance too far')
    .default(0),
  discountAmount: z
    .number({ coerce: true })
    .min(0, 'Discount cannot be negative')
    .default(0),
  internalNotes: z
    .string()
    .max(1000, 'Notes too long')
    .optional()
    .or(z.literal('')),
  customerNotes: z
    .string()
    .max(1000, 'Notes too long')
    .optional()
    .or(z.literal('')),
});

// Combined Quote Builder Schema
export const quoteBuilderSchema = quoteCustomerPropertySchema
  .merge(quoteSystemConfigSchema)
  .merge(quoteEquipmentSchema)
  .merge(quoteSitePricingSchema);

// Alias for backward compatibility
export const createQuoteSchema = quoteBuilderSchema;

export type QuoteCustomerPropertyFormData = z.infer<typeof quoteCustomerPropertySchema>;
export type QuoteSystemConfigFormData = z.infer<typeof quoteSystemConfigSchema>;
export type QuoteEquipmentFormData = z.infer<typeof quoteEquipmentSchema>;
export type QuoteSitePricingFormData = z.infer<typeof quoteSitePricingSchema>;
export type QuoteBuilderFormData = z.infer<typeof quoteBuilderSchema>;
export type CreateQuoteFormData = QuoteBuilderFormData;

// ============================================================================
// Accept Quote Schema
// ============================================================================

export const acceptQuoteSchema = z.object({
  acceptedByCustomerSignature: z
    .string()
    .min(1, 'Customer signature/confirmation is required'),
  createProject: z.boolean().default(false),
  projectStartDate: z.date().optional(),
});

export type AcceptQuoteFormData = z.infer<typeof acceptQuoteSchema>;

// ============================================================================
// Reject Quote Schema
// ============================================================================

export const rejectQuoteSchema = z.object({
  rejectionReason: z.string().min(1, 'Please provide a reason'),
  createRevision: z.boolean().default(false),
  revisionNotes: z
    .string()
    .max(500, 'Notes too long')
    .optional()
    .or(z.literal('')),
});

export type RejectQuoteFormData = z.infer<typeof rejectQuoteSchema>;

// ============================================================================
// Quick System Size Options
// ============================================================================

export const QUICK_SIZE_OPTIONS = [3, 5, 7, 10, 15, 20] as const;

// ============================================================================
// Rejection Reasons
// ============================================================================

export const REJECTION_REASONS = [
  { value: 'price_too_high', label: 'Price too high' },
  { value: 'competitor_chosen', label: 'Chose competitor' },
  { value: 'project_delayed', label: 'Project delayed' },
  { value: 'requirements_changed', label: 'Requirements changed' },
  { value: 'financing_issues', label: 'Financing issues' },
  { value: 'other', label: 'Other' },
] as const;
