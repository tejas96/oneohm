import { z } from 'zod';

export const installationPricingSchema = z
  .object({
    minSystemSizeKw: z
      .number({ invalid_type_error: 'Minimum size must be a number' })
      .min(0, 'Minimum size must be >= 0'),
    maxSystemSizeKw: z
      .number({ invalid_type_error: 'Maximum size must be a number' })
      .optional()
      .nullable(),
    transportRatePerKm: z
      .number({ invalid_type_error: 'Transport rate must be a number' })
      .min(0, 'Transport rate must be >= 0'),
    floorIncrementPercent: z
      .number({ invalid_type_error: 'Floor increment must be a number' })
      .min(0, 'Floor increment must be >= 0'),
    gstRate: z
      .number({ invalid_type_error: 'GST rate must be a number' })
      .min(0, 'GST rate must be >= 0')
      .max(100, 'GST rate must be <= 100'),
    costComponents: z
      .record(
        z.string(),
        z.number({ invalid_type_error: 'Must be a number' }).min(0, 'Must be >= 0'),
      )
      .refine((obj) => Object.keys(obj).length > 0, 'At least one cost component required'),
    effectiveFrom: z.string().min(1, 'Effective from date is required'),
    effectiveTo: z.string().optional(),
    isActive: z.boolean(),
  })
  .refine((data) => data.maxSystemSizeKw == null || data.maxSystemSizeKw >= data.minSystemSizeKw, {
    message: 'Maximum size must be greater than or equal to minimum size',
    path: ['maxSystemSizeKw'],
  });

export type InstallationPricingFormData = z.infer<typeof installationPricingSchema>;
