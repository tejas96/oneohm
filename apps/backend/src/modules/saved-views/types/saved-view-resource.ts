/**
 * Resources that can have saved views in v1. Adding a new resource is a
 * three-step change:
 *   1. Add the value here
 *   2. Add the matching CHECK constraint in the saved-views migration
 *   3. Add a per-resource filter allow-list in saved-view-filter-schemas.ts
 *
 * Inventory ships first; non-inventory resources can be added in later
 * parts without touching the saved-views module itself.
 */
export const SAVED_VIEW_RESOURCES = [
  'inventory-stock',
  'inventory-transactions',
  'purchase-orders',
  'material-dispatches',
  'stock-allocations',
  'vendors',
  'warehouses',
] as const;

export type SavedViewResource = (typeof SAVED_VIEW_RESOURCES)[number];

export function isSavedViewResource(value: unknown): value is SavedViewResource {
  return typeof value === 'string' && (SAVED_VIEW_RESOURCES as readonly string[]).includes(value);
}
