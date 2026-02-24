'use client';

import { useCallback, useState } from 'react';

import type {
  NavigationCounts,
  NavigationCountsState,
} from '@/lib/types/navigation-counts';

/**
 * Mock navigation counts for development
 * These values simulate what the API would return
 */
const MOCK_NAVIGATION_COUNTS: NavigationCounts = {
  crm: {
    totalCustomers: 156,
    totalProperties: 89,
    properties: {
      hot: 5,
      warm: 18,
      cold: 24,
    },
    followups: {
      today: 8,
      overdue: 3,
      upcoming: 12,
    },
    siteVisits: {
      scheduled: 4,
      pending: 2,
    },
  },
  quotes: {
    total: 42,
    drafts: 7,
    sent: 12,
    approved: 5,
    expiringSoon: 3,
  },
  projects: {
    total: 28,
    active: 15,
    pending: 4,
    completedThisMonth: 3,
  },
  inventory: {
    total: 234,
    lowStock: 8,
    outOfStock: 2,
    pendingPOs: 5,
  },
  service: {
    openTickets: 14,
    urgentTickets: 3,
    amcRenewalsDue: 6,
  },
  finance: {
    pendingInvoices: 18,
    overduePayments: 4,
  },
  tasks: {
    dueToday: 5,
    overdue: 2,
    pending: 12,
  },
  lastUpdated: new Date(),
};

/**
 * Hook for fetching and managing navigation badge counts
 * 
 * @returns {NavigationCountsState} State object with counts, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { counts, isLoading, refetch } = useNavigationCounts();
 * 
 * // Access specific counts
 * const overdueFollowups = counts.crm.followups.overdue;
 * const hotProperties = counts.crm.properties.hot;
 * ```
 */
export function useNavigationCounts(): NavigationCountsState {
  // TODO: Replace with actual API call using TanStack Query
  // const { data, isLoading, error, refetch } = useQuery({
  //   queryKey: ['navigation-counts'],
  //   queryFn: () => api.get('/navigation/counts'),
  //   staleTime: 30 * 1000, // 30 seconds
  //   refetchInterval: 60 * 1000, // 1 minute
  //   refetchOnWindowFocus: true,
  // });

  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  // TODO: Implement actual refetch logic with API call
  const refetch = useCallback(() => {
    // no-op until API is implemented
  }, []);

  // TODO: Transform API response to NavigationCounts type
  // For now, return mock data
  return {
    counts: MOCK_NAVIGATION_COUNTS,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Helper to get a specific count value by path
 * 
 * @param counts - Navigation counts object
 * @param path - Dot-notation path (e.g., 'crm.followups.overdue')
 * @returns The count value or undefined
 * 
 * @example
 * ```tsx
 * const overdueCount = getCountByPath(counts, 'crm.followups.overdue');
 * ```
 */
export function getCountByPath(
  counts: NavigationCounts,
  path: string
): number | undefined {
  const keys = path.split('.');
   
  let value: unknown = counts;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return typeof value === 'number' ? value : undefined;
}

/**
 * Get total CRM badge count (for rail item)
 * Shows sum of overdue followups + pending site visits
 */
export function getCrmBadgeCount(counts: NavigationCounts): number {
  return counts.crm.followups.overdue + counts.crm.siteVisits.pending;
}

/**
 * Get total inventory badge count (for rail item)
 * Shows low stock + out of stock items
 */
export function getInventoryBadgeCount(counts: NavigationCounts): number {
  return counts.inventory.lowStock + counts.inventory.outOfStock;
}

/**
 * Get total service badge count (for rail item)
 * Shows urgent tickets count
 */
export function getServiceBadgeCount(counts: NavigationCounts): number {
  return counts.service.urgentTickets;
}
