import { z } from 'zod';

import { ConnectionType, LeadTemperature, PropertyType } from '../types/enums';
import {
  CONSUMER_NUMBER_MESSAGE,
  CONSUMER_NUMBER_REGEX,
  normalizeConsumerNumber,
} from '../utils/validation';

const consumerNumberSchema = z
  .string()
  .transform(normalizeConsumerNumber)
  .pipe(
    z
      .string()
      .min(1, 'Consumer number is required')
      .regex(CONSUMER_NUMBER_REGEX, CONSUMER_NUMBER_MESSAGE),
  );

const consumerNameSchema = z
  .string()
  .trim()
  .min(1, 'Consumer name is required')
  .max(255, 'Consumer name too long');

const discomNameSchema = z
  .string()
  .min(1, 'Please select a DISCOM provider')
  .max(100, 'DISCOM name too long');

const connectionTypeSchema = z.nativeEnum(ConnectionType, {
  errorMap: () => ({ message: 'Please select connection type' }),
});

const currentLoadSchema = z.string().max(50, 'Current load too long').optional().or(z.literal(''));

export const createPropertySchema = z.object({
  customerId: z.string().uuid('Please select a customer'),
  propertyName: z.string().min(1, 'Property name is required').max(200, 'Property name too long'),
  propertyType: z.nativeEnum(PropertyType, {
    errorMap: () => ({ message: 'Please select a property type' }),
  }),
  isPrimary: z.boolean().optional(),
  address: z.string().min(1, 'Address is required').max(500, 'Address too long'),
  city: z.string().min(1, 'City is required').max(100, 'City too long'),
  state: z.string().max(100, 'State too long').optional().or(z.literal('')),
  pincode: z
    .string()
    .min(6, 'Pincode must be 6 digits')
    .max(6, 'Pincode must be 6 digits')
    .regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  country: z.string().min(1, 'Country is required').max(100, 'Country too long'),
  consumerNumber: consumerNumberSchema,
  consumerName: consumerNameSchema,
  discomName: discomNameSchema,
  connectionType: connectionTypeSchema,
  sanctionedLoad: z
    .number({ coerce: true })
    .min(0.1, 'Sanctioned load must be greater than 0')
    .max(1000, 'Sanctioned load too high')
    .optional(),
  currentLoad: currentLoadSchema,
  meterNumber: z.string().max(50, 'Meter number too long').optional().or(z.literal('')),
  leadTemperature: z.nativeEnum(LeadTemperature, {
    errorMap: () => ({ message: 'Please select lead temperature' }),
  }),
  wantsLoan: z.boolean().optional(),
  notes: z.string().max(1000, 'Notes too long').optional().or(z.literal('')),
});

export type CreatePropertyFormData = z.infer<typeof createPropertySchema>;

/** @deprecated Use createPropertySchema instead */
export const addPropertySchema = createPropertySchema.omit({ customerId: true });
export type AddPropertyFormData = z.infer<typeof addPropertySchema>;

export const editPropertySchema = addPropertySchema.partial().extend({
  propertyName: z.string().min(1, 'Property name is required'),
  consumerNumber: consumerNumberSchema,
  consumerName: consumerNameSchema,
  discomName: discomNameSchema,
  connectionType: connectionTypeSchema,
});
export type EditPropertyFormData = z.infer<typeof editPropertySchema>;

export const markAsLostSchema = z.object({
  reason: z.string().min(1, 'Please select a reason'),
  notes: z.string().max(500, 'Notes too long').optional().or(z.literal('')),
});

export type MarkAsLostFormData = z.infer<typeof markAsLostSchema>;
