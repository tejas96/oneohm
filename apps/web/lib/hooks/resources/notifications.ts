'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { defineResource } from '../core';

import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

/** One row of `GET /notifications`. Unread is `readAt === null`; there is no `isRead`. */
export interface Notification {
  id: string;
  userId?: string;
  type: string;
  severity: string;
  title: string;
  body?: string | null;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

// ============================================================================
// Registry
// ============================================================================

defineResource<Notification>(
  'notifications',
  {
    endpoint: '/notifications',
    defaultPageSize: 20,
    syncToUrl: false,
    defaultSort: { field: 'createdAt', order: 'DESC' },
  },
  // No permission codes — notifications are addressed to the individual user.
);

// ============================================================================
// Query keys
// ============================================================================

// ============================================================================
// Hooks
// ============================================================================

export function useNotificationUnreadCount() {
  const canReadNotifications = true;

  return useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count');
      return data;
    },
    enabled: canReadNotifications,
    placeholderData: keepPreviousData,
    refetchInterval: canReadNotifications ? 30_000 : false,
    staleTime: 15_000,
  });
}

/** How many the bell's list shows. Older ones are still counted in the badge. */
const RECENT_LIMIT = 10;

/** The newest notifications, fetched only while the bell's list is open. */
export function useRecentNotifications(enabled: boolean) {
  return useQuery<Notification[]>({
    queryKey: ['notifications', 'recent'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Notification[] }>('/notifications', {
        params: { limit: RECENT_LIMIT },
      });
      return data.data;
    },
    enabled,
    // Always refetch on open: the badge polls, so a stale list would disagree with it.
    staleTime: 0,
  });
}

/** Mark one or all as read, then refresh both the list and the badge. */
export function useNotificationActions() {
  const queryClient = useQueryClient();
  const refresh = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: refresh,
  });
  const markAllRead = useMutation({
    mutationFn: () => apiClient.post('/notifications/mark-all-read'),
    onSuccess: refresh,
  });

  return { markRead, markAllRead };
}
