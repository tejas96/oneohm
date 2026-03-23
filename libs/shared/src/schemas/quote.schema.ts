import { z } from 'zod';

import {
  ProjectType,
  PhaseType,
  DcrPreference,
  PanelTechnology,
  StructureType,
} from '../types/enums';

export const quoteBuilderSchema = z.object({
  customerId: z.string().uuid('Please select a customer'),
  propertyId: z.string().uuid().optional(),
  projectType: z.nativeEnum(ProjectType, {
    errorMap: () => ({ message: 'Please select project type' }),
  }),
  systemSizeKw: z
    .number({ coerce: true })
    .min(1, 'System size must be at least 1 kW')
    .max(1000, 'System size cannot exceed 1000 kW'),
  phaseType: z.nativeEnum(PhaseType, {
    errorMap: () => ({ message: 'Please select phase type' }),
  }),
  selectedSubsidyIds: z.array(z.string()).optional(),
  dcrPreference: z.nativeEnum(DcrPreference).default(DcrPreference.DCR_ONLY),
  preferredPanelBrand: z.string().optional(),
  preferredPanelTechnology: z.nativeEnum(PanelTechnology).optional(),
  preferredPanelWattage: z.number().min(100).max(1000).optional(),
  preferredInverterBrand: z.string().optional(),
  preferredInverterCapacityKw: z.number().min(1).optional(),
  structureType: z.union([z.nativeEnum(StructureType), z.literal('')], {
    errorMap: () => ({ message: 'Please select structure type' }),
  }),
  floorNumber: z
    .number({ coerce: true })
    .min(0, 'Floor number cannot be negative')
    .max(50, 'Floor number must be 50 or below')
    .default(0),
  distanceKm: z
    .number({ coerce: true })
    .min(0, 'Distance cannot be negative')
    .max(500, 'Distance cannot exceed 500 km')
    .default(0),
  discountAmount: z.number({ coerce: true }).min(0, 'Discount cannot be negative').default(0),
  internalNotes: z.string().max(1000, 'Notes too long').optional(),
  customerNotes: z.string().max(1000, 'Notes too long').optional(),
});

export const createQuoteSchema = quoteBuilderSchema;
export type QuoteBuilderFormData = z.infer<typeof quoteBuilderSchema>;
export type CreateQuoteFormData = QuoteBuilderFormData;

export const acceptQuoteSchema = z.object({
  acceptedByCustomerSignature: z.string().min(1, 'Customer signature/confirmation is required'),
  createProject: z.boolean().default(false),
  projectStartDate: z.date().optional(),
});
export type AcceptQuoteFormData = z.infer<typeof acceptQuoteSchema>;

export const rejectQuoteSchema = z.object({
  rejectionReason: z.string().min(1, 'Please provide a reason'),
  createRevision: z.boolean().default(false),
  revisionNotes: z.string().max(500, 'Notes too long').optional().or(z.literal('')),
});
export type RejectQuoteFormData = z.infer<typeof rejectQuoteSchema>;
