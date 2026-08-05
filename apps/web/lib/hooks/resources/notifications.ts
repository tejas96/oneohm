'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createResourceKeys,
  defineResource,
  useResourceList,
  useOrgContext,
  type BaseFilters,
  type ResourceConfig,
} from '../core';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';
import { useFeatureAccess } from '@/lib/hooks/use-feature-access';
import { getErrorMessage } from '@/lib/utils/error';

// ============================================================================
// Types
// ============================================================================

export interface Notification {
  id: string;
  organizationId: string;
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
  {
    view: 'notifications:read',
  },
  {
    view: 'notifications.view',
  },
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

export function useNotificationUnreadCount(options?: { enabled?: boolean }) {
  const { organizationId, orgHeaders } = useOrgContext();
  const canViewNotifications = useFeatureAccess('notifications.view');

  return useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count', organizationId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count', {
        headers: orgHeaders,
      });
      return data;
    },
    enabled: canViewNotifications && (options?.enabled ?? true),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { orgHeaders } = useOrgContext();
  const mutation = useMutation<void, unknown, string>({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/notifications/${id}/read`, {}, { headers: orgHeaders });
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
  const { orgHeaders } = useOrgContext();
  const mutation = useMutation<void, unknown>({
    mutationFn: async () => {
      await apiClient.post('/notifications/mark-all-read', {}, { headers: orgHeaders });
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
