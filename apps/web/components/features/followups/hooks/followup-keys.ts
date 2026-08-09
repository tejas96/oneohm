/**
 * One key factory for every followup surface.
 *
 * Everything hangs off a single root so completing a followup invalidates the
 * property tab, the customer tab, the /followups page and the nav badge in one
 * call — a stale count on any of them would undermine the whole point of the
 * feature, which is that the list can be trusted.
 */
export const followupKeys = {
  all: ['followups'] as const,
  lists: () => [...followupKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...followupKeys.lists(), filters] as const,
  byProperty: (propertyId: string) => [...followupKeys.all, 'property', propertyId] as const,
  byCustomer: (customerId: string) => [...followupKeys.all, 'customer', customerId] as const,
  gaps: () => [...followupKeys.all, 'gaps'] as const,
  summary: (mine: boolean) => [...followupKeys.all, 'summary', mine] as const,
};
