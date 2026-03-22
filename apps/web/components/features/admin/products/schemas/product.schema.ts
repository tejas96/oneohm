import { ProductStatus, UnitOfMeasure } from '@oneohm-epc/shared/types';
import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required'),
  code: z.string().trim().min(1, 'Product code is required'),
  productTypeId: z.string().uuid('Select a product type'),
  brandId: z.string().uuid('Select a brand'),
  description: z.string().trim().optional(),
  modelNumber: z.string().trim().optional(),
  specifications: z.record(z.unknown()),
  unitOfMeasure: z.nativeEnum(UnitOfMeasure),
  productWarrantyYears: z.preprocess(
    (v) => (v === '' || (typeof v === 'number' && isNaN(v)) ? undefined : v),
    z.number({ invalid_type_error: 'Warranty must be a number' }).min(0, 'Warranty must be >= 0').optional(),
  ),
  performanceWarrantyYears: z.preprocess(
    (v) => (v === '' || (typeof v === 'number' && isNaN(v)) ? undefined : v),
    z.number({ invalid_type_error: 'Warranty must be a number' }).min(0, 'Warranty must be >= 0').optional(),
  ),
  status: z.nativeEnum(ProductStatus),
});

export type ProductFormData = z.infer<typeof productSchema>;
