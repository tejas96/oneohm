'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createResourceKeys,
  defineResource,
  useResourceList,
  type BaseFilters,
  type ResourceConfig,
} from '../core';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/error';

// ============================================================================
// Types
// ============================================================================

export interface Notification {
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

export interface NotificationFilters extends BaseFilters {
  type?: string;
  severity?: string;
  isRead?: boolean;
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

export const notificationKeys = createResourceKeys('notifications');

// ============================================================================
// Hooks
// ============================================================================

export function useNotifications(
  overrides?: Partial<ResourceConfig<Notification, NotificationFilters>>,
) {
  return useResourceList<Notification, NotificationFilters>({
    resource: 'notifications',
    endpoint: '/notifications',
    defaultPageSize: 20,
    syncToUrl: false,
    ...overrides,
  });
}

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

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const mutation = useMutation<void, unknown, string>({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/notifications/${id}/read`, {});
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => {
      showToast.error(getErrorMessage(err));
    },
  });
  return { ...mutation, execute: (id: string) => mutation.mutateAsync(id) };
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const mutation = useMutation<void, unknown>({
    mutationFn: async () => {
      await apiClient.post('/notifications/mark-all-read', {});
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showToast.success('All notifications marked as read');
    },
    onError: (err) => {
      showToast.error(getErrorMessage(err));
    },
  });
  return { ...mutation, execute: () => mutation.mutateAsync() };
}
