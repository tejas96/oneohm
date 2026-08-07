'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  RESOURCE_MUTATION_DEFAULTS,
  STALE_TIMES,
  createResourceKeys,
  defineResource,
  normalizeApiError,
} from '../core';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';

/**
 * FDAL hooks for the saved-views API introduced in Part 7.
 *
 * Why hand-rolled instead of `useResourceList`/`useResourceMutations`:
 * the saved-views endpoint is scoped per-user (not per-list-filters),
 * has no pagination, and the create/update/delete responses return a
 * single entity (no list invalidation gymnastics needed). Wrapping the
 * generic FDAL helpers here would be 3x more code than just calling
 * `apiClient` directly, and we want the resource type list to stay
 * tightly typed via the `SavedViewResource` enum the backend defined.
 *
 * Cache layout: `['saved-views', 'list', resource]` — one entry
 * per (org, resource) pair. After any mutation we invalidate the
 * matching list key so the SavedViewsBar reflects the change without a
 * page reload.
 */

export type SavedViewResource =
  | 'inventory-stock'
  | 'inventory-transactions'
  | 'purchase-orders'
  | 'material-dispatches'
  | 'stock-allocations'
  | 'vendors'
  | 'warehouses';

export interface SavedView {
  id: string;
  organizationId: string;
  userId: string;
  resource: SavedViewResource;
  name: string;
  /** Validated server-side against the per-resource allow-list. */
  filters: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedViewPayload {
  resource: SavedViewResource;
  name: string;
  filters: Record<string, unknown>;
}

export interface UpdateSavedViewPayload {
  name?: string;
  filters?: Record<string, unknown>;
}

// ============================================================================
// Registry — registers permissions so `<Can>` and `useResourcePermissions`
// can gate UI off the same codes the backend enforces.
// ============================================================================

defineResource<SavedView>(
  'saved-views',
  {
    endpoint: '/saved-views',
    defaultPageSize: 100,
    syncToUrl: false,
  },
  {
    view: 'saved-view:read',
    create: 'saved-view:write',
    update: 'saved-view:write',
    delete: 'saved-view:write',
  },
);

export const savedViewKeys = createResourceKeys('saved-views');

// ============================================================================
// Read hooks
// ============================================================================

/**
 * List the current user's saved views for a single resource. Returns
 * an empty array (not undefined) when the user has none, so consumers
 * can render `views.length === 0` without an extra null guard.
 */
export function useSavedViews(resource: SavedViewResource): UseQueryResult<SavedView[], unknown> {

  return useQuery<SavedView[]>({
    queryKey: ['saved-views', 'list', resource] as const,
    staleTime: STALE_TIMES.standard,
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<SavedView[]>('/saved-views', {
        params: { resource },
        signal,
      });
      return data;
    },
  });
}

/** Fetch a single saved view by id. Cross-user/cross-org returns 404. */
export function useSavedView(id: string | undefined): UseQueryResult<SavedView, unknown> {

  return useQuery<SavedView>({
    queryKey: ['saved-views', 'detail', id ?? ''] as const,
    enabled: Boolean(id),
    staleTime: STALE_TIMES.standard,
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<SavedView>(`/saved-views/${id ?? ''}`, {
        signal,
      });
      return data;
    },
  });
}

// ============================================================================
// Mutations
// ============================================================================

export interface SavedViewMutations {
  create: UseMutationResult<SavedView, unknown, CreateSavedViewPayload>;
  update: UseMutationResult<SavedView, unknown, { id: string; data: UpdateSavedViewPayload }>;
  remove: UseMutationResult<void, unknown, string>;
}

export function useSavedViewMutations(): SavedViewMutations {
  const queryClient = useQueryClient();

  const invalidate = (resource?: SavedViewResource): void => {
    if (resource) {
      void queryClient.invalidateQueries({
        queryKey: ['saved-views', 'list', resource],
      });
    } else {
      void queryClient.invalidateQueries({ queryKey: ['saved-views'] });
    }
  };

  const create = useMutation<SavedView, unknown, CreateSavedViewPayload>({
    retry: RESOURCE_MUTATION_DEFAULTS.retry,
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<SavedView>('/saved-views', payload);
      return data;
    },
    onSuccess: (saved) => {
      invalidate(saved.resource);
      showToast.success('Saved view created');
    },
    onError: (err) => {
      showToast.error(normalizeApiError(err).message);
    },
  });

  const update = useMutation<SavedView, unknown, { id: string; data: UpdateSavedViewPayload }>({
    retry: RESOURCE_MUTATION_DEFAULTS.retry,
    mutationFn: async ({ id, data: payload }) => {
      const { data } = await apiClient.patch<SavedView>(`/saved-views/${id}`, payload);
      return data;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<SavedView>(
        ['saved-views', 'detail', saved.id],
        saved,
      );
      invalidate(saved.resource);
      showToast.success('Saved view updated');
    },
    onError: (err) => {
      showToast.error(normalizeApiError(err).message);
    },
  });

  const remove = useMutation<void, unknown, string>({
    retry: RESOURCE_MUTATION_DEFAULTS.retry,
    mutationFn: async (id) => {
      await apiClient.delete(`/saved-views/${id}`);
    },
    onSuccess: (_void, id) => {
      // We don't know the resource bucket the deleted view belonged to,
      // so invalidate every saved-views list for the org. Cheap because
      // there's at most one query per resource and they refetch only
      // when the user opens the matching SavedViewsBar.
      const cached = queryClient.getQueryData<SavedView>([
        'saved-views',
        'detail',
        id,
      ]);
      invalidate(cached?.resource);
      queryClient.removeQueries({
        queryKey: ['saved-views', 'detail', id],
      });
      showToast.success('Saved view deleted');
    },
    onError: (err) => {
      showToast.error(normalizeApiError(err).message);
    },
  });

  return useMemo(() => ({ create, update, remove }), [create, update, remove]);
}
