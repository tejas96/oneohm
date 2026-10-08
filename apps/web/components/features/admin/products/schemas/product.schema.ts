import { zodResolver } from '@hookform/resolvers/zod';
import { ProductStatus, UnitOfMeasure } from '@tejas96/shared/types';
import type { Resolver } from 'react-hook-form';
import { z } from 'zod';

import type { ProductTypeAttribute } from '@/lib/hooks/resources';

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

const NUMERIC_TYPES = new Set(['number', 'integer', 'decimal']);

// structure_type has its own check on submit.
const SELF_CHECKED_KEYS = new Set(['structure_type']);

function limit(validation: ProductTypeAttribute['validation'], key: 'min' | 'max') {
  const raw = validation?.[key];
  const value = typeof raw === 'string' ? Number(raw) : raw;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** The first problem with one specification value, or null when it is fine. */
function specificationProblem(attr: ProductTypeAttribute, value: unknown): string | null {
  const isBlank = value === undefined || value === null || value === '';
  if (isBlank) return attr.isRequired ? `${attr.label} is required` : null;
  if (!NUMERIC_TYPES.has(attr.dataType)) return null;

  const num = Number(value);
  if (!Number.isFinite(num)) return `${attr.label} must be a number`;
  if (attr.dataType === 'integer' && !Number.isInteger(num)) {
    return `${attr.label} must be a whole number`;
  }
  const min = limit(attr.validation, 'min');
  const max = limit(attr.validation, 'max');
  if (min !== undefined && num < min) return `${attr.label} must be at least ${min}`;
  if (max !== undefined && num > max) return `${attr.label} must be at most ${max}`;
  return null;
}

/**
 * The product schema plus the rules of the chosen product type. The browser's own
 * number check is off on these forms, so a bad value must be named here, beside
 * its field, instead of the Save button silently doing nothing.
 */
export function buildProductSchema(attributes: ProductTypeAttribute[]) {
  return productSchema.superRefine((data, ctx) => {
    for (const attr of attributes) {
      if (!attr.attributeKey || SELF_CHECKED_KEYS.has(attr.attributeKey)) continue;
      if (attr.dataType === 'boolean') continue;
      const message = specificationProblem(attr, data.specifications?.[attr.attributeKey]);
      if (message) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: ['specifications', attr.attributeKey],
        });
      }
    }
  });
}

/** A resolver that reads the product type's attributes at validation time. */
export function createProductResolver(
  getAttributes: () => ProductTypeAttribute[],
): Resolver<ProductFormData> {
  return (values, context, options) =>
    zodResolver(buildProductSchema(getAttributes()))(values, context, options) as ReturnType<
      Resolver<ProductFormData>
    >;
}
