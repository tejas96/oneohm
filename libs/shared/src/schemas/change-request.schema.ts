import { z } from 'zod';

import { ConnectionType, PropertyType } from '../types/enums';
import { ChangeRequestType } from '../types/enums/change-request.enum';

const consumerNameChangeSchema = z.object({
  type: z.literal(ChangeRequestType.CONSUMER_NAME_CHANGE),
  newName: z.string().trim().min(1, 'New consumer name is required').max(255, 'Name too long'),
});

const nameSpellingCorrectionSchema = z.object({
  type: z.literal(ChangeRequestType.NAME_SPELLING_CORRECTION),
  correctedName: z.string().trim().min(1, 'Corrected name is required').max(255, 'Name too long'),
});

const propertyTypeChangeSchema = z.object({
  type: z.literal(ChangeRequestType.PROPERTY_TYPE_CHANGE),
  newPropertyType: z.nativeEnum(PropertyType, {
    errorMap: () => ({ message: 'Please select a property type' }),
  }),
});

const loadChangeSchema = z.object({
  type: z.literal(ChangeRequestType.LOAD_CHANGE),
  phase: z.nativeEnum(ConnectionType, {
    errorMap: () => ({ message: 'Please select connection type' }),
  }),
  newSanctionedLoad: z
    .number({ coerce: true })
    .min(0, 'Load must be 0 or greater')
    .max(1000, 'Load too high')
    .optional(),
});

const newEvMeterSchema = z.object({
  type: z.literal(ChangeRequestType.NEW_EV_METER),
  note: z.string().max(500, 'Note too long').optional().or(z.literal('')),
});

const newConnectionSchema = z.object({
  type: z.literal(ChangeRequestType.NEW_CONNECTION),
  phase: z.nativeEnum(ConnectionType, {
    errorMap: () => ({ message: 'Please select connection type' }),
  }),
  note: z.string().max(500, 'Note too long').optional().or(z.literal('')),
});

export const changeRequestItemSchema = z.discriminatedUnion('type', [
  consumerNameChangeSchema,
  nameSpellingCorrectionSchema,
  propertyTypeChangeSchema,
  loadChangeSchema,
  newEvMeterSchema,
  newConnectionSchema,
]);

export type ChangeRequestItemFormData = z.infer<typeof changeRequestItemSchema>;

export const changeRequestsSchema = z
  .array(changeRequestItemSchema)
  .max(6, 'Too many change requests')
  .refine(
    (items) => new Set(items.map((i) => i.type)).size === items.length,
    'Duplicate change request types are not allowed',
  )
  .optional()
  .default([]);

export type ChangeRequestsFormData = z.infer<typeof changeRequestsSchema>;
