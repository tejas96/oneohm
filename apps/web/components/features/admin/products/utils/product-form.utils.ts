import { normalizeStructureTypeCode } from '@tejas96/shared/utils';

import type { ProductFormData } from '../schemas/product.schema';

export const MOUNTING_STRUCTURE_PRODUCT_TYPE_CODE = 'mounting_structure';

export const STRUCTURE_TYPE_FIELD = 'specifications.structure_type' as const;

export type ProductSpecificationsSubmitResult =
  | { ok: true; specifications: Record<string, unknown> }
  | { ok: false; message: string };

export function resolveProductSpecificationsForSubmit(
  data: ProductFormData,
  productTypeCode?: string,
): ProductSpecificationsSubmitResult {
  const specifications = { ...(data.specifications ?? {}) };

  if (productTypeCode !== MOUNTING_STRUCTURE_PRODUCT_TYPE_CODE) {
    return { ok: true, specifications };
  }

  const rawStructureType = specifications.structure_type;
  const normalized =
    typeof rawStructureType === 'string' ? normalizeStructureTypeCode(rawStructureType) : null;

  if (!normalized) {
    return {
      ok: false,
      message: 'Structure type is required and must be a valid code',
    };
  }

  return {
    ok: true,
    specifications: {
      ...specifications,
      structure_type: normalized,
    },
  };
}
