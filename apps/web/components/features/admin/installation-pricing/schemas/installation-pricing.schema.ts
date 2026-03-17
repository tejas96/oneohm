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
    costComponents: z.object({
      electrical_work: z
        .number({ invalid_type_error: 'Electrical work must be a number' })
        .min(0, 'Must be >= 0'),
      fixed_material: z
        .number({ invalid_type_error: 'Fixed material must be a number' })
        .min(0, 'Must be >= 0'),
      structure_cost: z
        .number({ invalid_type_error: 'Structure cost must be a number' })
        .min(0, 'Must be >= 0'),
      installation_labor: z
        .number({ invalid_type_error: 'Installation labor must be a number' })
        .min(0, 'Must be >= 0'),
      loading_unloading: z
        .number({ invalid_type_error: 'Loading/unloading must be a number' })
        .min(0, 'Must be >= 0'),
      msedcl_charges: z
        .number({ invalid_type_error: 'MSEDCL charges must be a number' })
        .min(0, 'Must be >= 0'),
      supervision: z
        .number({ invalid_type_error: 'Supervision must be a number' })
        .min(0, 'Must be >= 0'),
      variable_floor: z
        .number({ invalid_type_error: 'Variable floor must be a number' })
        .min(0, 'Must be >= 0'),
      profitability_percent: z
        .number({ invalid_type_error: 'Profitability must be a number' })
        .min(0, 'Must be >= 0'),
    }),
    effectiveFrom: z.string().min(1, 'Effective from date is required'),
    effectiveTo: z.string().optional(),
    isActive: z.boolean(),
  })
  .refine((data) => data.maxSystemSizeKw == null || data.maxSystemSizeKw > data.minSystemSizeKw, {
    message: 'Maximum size must be greater than minimum size',
    path: ['maxSystemSizeKw'],
  });

export type InstallationPricingFormData = z.infer<typeof installationPricingSchema>;
