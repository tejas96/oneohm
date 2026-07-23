/**
 * Shared helpers for customer-list property-level filters.
 * Used by backend repository and frontend list query short-circuit.
 */

export interface CustomerPropertyFilterQuery {
  hasProperty?: boolean;
  propertyType?: unknown;
  propertyStatus?: unknown;
  connectionType?: unknown;
  leadTemperature?: unknown;
  quoteStatus?: unknown;
  propertySystemSizeMin?: unknown;
  propertySystemSizeMax?: unknown;
  propertyCity?: string;
  propertyState?: string;
}

export function hasAnyCustomerPropertyFilter(query: CustomerPropertyFilterQuery): boolean {
  return (
    query.propertyType !== undefined ||
    query.propertyStatus !== undefined ||
    query.connectionType !== undefined ||
    query.leadTemperature !== undefined ||
    query.quoteStatus !== undefined ||
    query.propertySystemSizeMin !== undefined ||
    query.propertySystemSizeMax !== undefined ||
    (query.propertyCity !== undefined && query.propertyCity.length > 0) ||
    (query.propertyState !== undefined && query.propertyState.length > 0)
  );
}

export function hasContradictoryCustomerPropertyFilters(
  query: CustomerPropertyFilterQuery,
): boolean {
  if (query.hasProperty !== false) return false;
  return hasAnyCustomerPropertyFilter(query);
}
