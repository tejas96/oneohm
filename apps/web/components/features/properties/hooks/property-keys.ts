/**
 * React Query keys for property resources — single source of truth.
 */
export const propertyKeys = {
  all: () => ['properties'] as const,
  lists: () => [...propertyKeys.all(), 'list'] as const,
  list: (filters: Record<string, unknown>) => [...propertyKeys.lists(), filters] as const,
  byCustomer: (customerId: string) => [...propertyKeys.all(), 'customer', customerId] as const,
  details: () => [...propertyKeys.all(), 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
};
