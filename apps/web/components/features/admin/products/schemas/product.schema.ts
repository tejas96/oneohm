import { ProductStatus, UnitOfMeasure } from '@tejas96/shared/types';
import { z } from 'zod';

// Coerces NaN (produced by valueAsNumber on empty input) and empty string to
// undefined so optional number fields stay valid when left blank.
const optionalNumber = (label: string) =>
  z
    .union([
      z.number({ invalid_type_error: `${label} must be a number` }).min(0, `${label} must be >= 0`),
      z.nan().transform(() => undefined as unknown as number),
    ])
    .optional();

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required'),
  code: z.string().trim().min(1, 'Product code is required'),
  productTypeId: z.string().uuid('Select a product type'),
  brandId: z.string().uuid('Select a brand'),
  description: z.string().trim().optional(),
  modelNumber: z.string().trim().optional(),
  specifications: z.record(z.unknown()),
  unitOfMeasure: z.nativeEnum(UnitOfMeasure),
  productWarrantyYears: optionalNumber('Warranty'),
  performanceWarrantyYears: optionalNumber('Warranty'),
  status: z.nativeEnum(ProductStatus),
});

export type ProductFormData = z.infer<typeof productSchema>;
