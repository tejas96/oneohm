import { BadRequestException } from '@nestjs/common';

import { type SavedViewResource } from './saved-view-resource';

/**
 * Per-resource filter allow-list.
 *
 * The plan calls for "Zod schema per resource"; we accomplish the same
 * intent with a hand-rolled allow-list validator to avoid pulling Zod into
 * the backend (no other code uses it). The contract:
 *   - filters MUST be a plain object (not array, not null)
 *   - every key MUST be in the allow-list for the resource
 *   - every value must pass the column's type guard
 *   - extra keys raise 400 BadRequest with the offending key listed
 *
 * The keys mirror the filter shapes accepted by the corresponding repo
 * findAll() calls so a saved view can be replayed against the list/export
 * APIs without further translation.
 */

type Guard = (v: unknown) => boolean;

const isString: Guard = (v) => typeof v === 'string';
const isBool: Guard = (v) => typeof v === 'boolean';
const isUuid: Guard = (v) =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const isIsoDate: Guard = (v) =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}(T.+)?$/.test(v) && !Number.isNaN(Date.parse(v));

const FILTER_SCHEMAS: Record<SavedViewResource, Record<string, Guard>> = {
  'inventory-stock': {
    warehouseId: isUuid,
    productId: isUuid,
    lowStock: isBool,
    search: isString,
  },
  'inventory-transactions': {
    transactionType: isString,
    warehouseId: isUuid,
    productId: isUuid,
    fromDate: isIsoDate,
    toDate: isIsoDate,
    referenceType: isString,
    referenceId: isUuid,
  },
  'purchase-orders': {
    status: isString,
    paymentStatus: isString,
    poType: isString,
    vendorId: isUuid,
    warehouseId: isUuid,
    projectId: isUuid,
    fromDate: isIsoDate,
    toDate: isIsoDate,
    search: isString,
  },
  'material-dispatches': {
    status: isString,
    projectId: isUuid,
    warehouseId: isUuid,
    fromDate: isIsoDate,
    toDate: isIsoDate,
    search: isString,
  },
  'stock-allocations': {
    status: isString,
    projectId: isUuid,
    warehouseId: isUuid,
    productId: isUuid,
  },
  vendors: {
    status: isString,
    vendorType: isString,
    search: isString,
  },
  warehouses: {
    status: isString,
    warehouseType: isString,
    warehouseManagerId: isUuid,
    search: isString,
  },
};

export function validateSavedViewFilters(
  resource: SavedViewResource,
  filters: unknown,
): Record<string, unknown> {
  if (filters === null || typeof filters !== 'object' || Array.isArray(filters)) {
    throw new BadRequestException('filters must be an object');
  }

  const schema = FILTER_SCHEMAS[resource];
  const provided = filters as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};
  const unknownKeys: string[] = [];
  const invalidKeys: string[] = [];

  for (const [key, value] of Object.entries(provided)) {
    const guard = schema[key];
    if (!guard) {
      unknownKeys.push(key);
      continue;
    }
    if (value === null || value === undefined || value === '') continue;
    if (!guard(value)) {
      invalidKeys.push(key);
      continue;
    }
    cleaned[key] = value;
  }

  if (unknownKeys.length > 0) {
    throw new BadRequestException(
      `Unknown filter key(s) for resource "${resource}": ${unknownKeys.join(', ')}`,
    );
  }
  if (invalidKeys.length > 0) {
    throw new BadRequestException(
      `Invalid filter value(s) for resource "${resource}": ${invalidKeys.join(', ')}`,
    );
  }

  return cleaned;
}
