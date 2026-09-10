'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { defineResource } from '../core';

import { apiClient } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

interface Notification {
  id: string;
  userId?: string;
  type: string;
  severity: string;
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  readAt?: string;
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
