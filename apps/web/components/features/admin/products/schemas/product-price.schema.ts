import { ProjectType } from '@oneohm-epc/shared/types';
import { z } from 'zod';

export const productPriceSchema = z.object({
  unitPrice: z
    .number({ invalid_type_error: 'Unit price must be a number' })
    .min(0, 'Unit price must be >= 0'),
  costMultiplier: z
    .number({ invalid_type_error: 'Cost multiplier must be a number' })
    .min(0, 'Cost multiplier must be >= 0'),
  gstRate: z
    .number({ invalid_type_error: 'GST rate must be a number' })
    .min(0, 'GST rate must be >= 0')
    .max(100, 'GST rate must be <= 100'),
  currency: z.string().trim().min(1, 'Currency is required').max(3),
  projectType: z.nativeEnum(ProjectType).optional(),
  effectiveFrom: z.string().min(1, 'Effective from date is required'),
  effectiveTo: z.string().optional(),
});

export type ProductPriceFormData = z.infer<typeof productPriceSchema>;
