/**
 * React Query keys for property resources — single source of truth.
 */
export const propertyKeys = {
  all: (orgId?: string) => ['properties', orgId] as const,
  lists: (orgId?: string) => [...propertyKeys.all(orgId), 'list'] as const,
  list: (orgId: string | undefined, filters: Record<string, unknown>) =>
    [...propertyKeys.lists(orgId), filters] as const,
  byCustomer: (orgId: string | undefined, customerId: string) =>
    [...propertyKeys.all(orgId), 'customer', customerId] as const,
  details: (orgId?: string) => [...propertyKeys.all(orgId), 'detail'] as const,
  detail: (orgId: string | undefined, id: string) => [...propertyKeys.details(orgId), id] as const,
};
