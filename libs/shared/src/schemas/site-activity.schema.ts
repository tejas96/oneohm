import { z } from 'zod';

import { gpsCoordinatesSchema } from './coordinates.schema';

const shadingAnalysisSchema = z.object({
  hasShading: z.boolean(),
  shadingPercentage: z.number().optional(),
  shadingSource: z.array(z.string()).optional(),
  shadingTimes: z.array(z.string()).optional(),
  mitigationRequired: z.boolean().optional(),
  notes: z.string().optional(),
});

const electricalDetailsSchema = z.object({
  panelType: z.string().optional(),
  panelCapacity: z.number().optional(),
  voltage: z.number().optional(),
  phaseType: z.enum(['single_phase', 'three_phase']).optional(),
  distanceToPanel: z.number().optional(),
  existingInverter: z.boolean().optional(),
  gridConnectionType: z.string().optional(),
  notes: z.string().optional(),
});

const surveyDataSchema = z.object({
  roofType: z.string().optional(),
  roofCondition: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  roofOrientation: z
    .enum(['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'])
    .optional(),
  roofTiltAngle: z.number().optional(),
  availableAreaSqm: z.number().optional(),
  shadingAnalysis: shadingAnalysisSchema.optional(),
  electricalDetails: electricalDetailsSchema.optional(),
  structuralAssessment: z.string().optional(),
  siteAccess: z.string().optional(),
  safetyConcerns: z.string().optional(),
  recommendations: z.string().optional(),
  notes: z.string().optional(),
});

export const createSiteActivitySchema = z.object({
  propertyId: z.string().uuid('Invalid property ID'),
});

export type CreateSiteActivityFormData = z.infer<typeof createSiteActivitySchema>;

export const updateSiteActivitySchema = z.object({
  availableRoofAreaSqft: z.number().positive().optional(),
  shadingAnalysis: shadingAnalysisSchema.optional(),
  notes: z.string().max(2000, 'Notes too long').optional().or(z.literal('')),
  surveyData: surveyDataSchema.optional(),
});

export type UpdateSiteActivityFormData = z.infer<typeof updateSiteActivitySchema>;

export const completeVisitSchema = z.object({
  availableRoofAreaSqft: z.number().positive('Roof area must be greater than 0'),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export type CompleteVisitFormData = z.infer<typeof completeVisitSchema>;

export const completeSurveySchema = z.object({
  surveyData: surveyDataSchema.refine(
    (data) => data.roofType && data.roofCondition,
    'Roof type and condition are required for survey completion',
  ),
});

export type CompleteSurveyFormData = z.infer<typeof completeSurveySchema>;

export { gpsCoordinatesSchema, shadingAnalysisSchema, electricalDetailsSchema, surveyDataSchema };
