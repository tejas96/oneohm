'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';

import { normalizeApiError } from './error-adapter';
import { RESOURCE_MUTATION_DEFAULTS } from './query-defaults';
import { createResourceKeys } from './query-keys';
import { resourceEvents } from './resource-events';
import type { MutationConfig, ResourceListResponse, NormalizedError } from './types';
import { useOrgContext } from './use-org-context';

import { showToast } from '@/components/ui/sonner';
import { apiClient } from '@/lib/api/client';

export function useResourceMutations<T extends { id: string }>(config: MutationConfig<T>) {
  const queryClient = useQueryClient();
  const { organizationId, orgHeaders } = useOrgContext();
  const keys = useMemo(() => createResourceKeys(config.resource), [config.resource]);
  const headers = useMemo(
    () => (config.requiresOrg !== false ? orgHeaders : {}),
    [config.requiresOrg, orgHeaders],
  );

  const configRef = useRef(config);
  configRef.current = config;

  const invalidateResource = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: keys.lists(organizationId) });
    void queryClient.invalidateQueries({ queryKey: keys.stats(organizationId) });
    configRef.current.invalidateRelated?.forEach((related) => {
      const relatedKeys = createResourceKeys(related);
      void queryClient.invalidateQueries({ queryKey: relatedKeys.all(organizationId) });
    });
  }, [queryClient, keys, organizationId]);

  // ── CREATE ────────────────────────────────────────────────
  const create = useMutation({
    retry: RESOURCE_MUTATION_DEFAULTS.retry,
    mutationFn: async (payload: Partial<T>) => {
      const ep = config.endpoints?.create ?? config.endpoint;
      const { data } = await apiClient.post<T>(ep, payload, { headers });
      return data;
    },
    onMutate: async (payload) => {
      if (!config.optimistic?.create) return {};
      await queryClient.cancelQueries({ queryKey: keys.lists(organizationId) });
      const listQueries = queryClient.getQueriesData<ResourceListResponse<T>>({
        queryKey: keys.lists(organizationId),
      });
      const snapshots = listQueries.map(([key, data]) => ({ key, data }));
      for (const [key, data] of listQueries) {
        if (data) {
          queryClient.setQueryData(key, {
            ...data,
            data: config.optimistic.create(payload, data.data),
            meta: { ...data.meta, total: data.meta.total + 1 },
          });
        }
      }
      return { snapshots };
    },
    onError: (err, _vars, context) => {
      const ctx = context as { snapshots?: Array<{ key: unknown; data: unknown }> };
      ctx?.snapshots?.forEach(({ key, data }) => {
        queryClient.setQueryData(key as readonly unknown[], data);
      });
      if (configRef.current.toast?.create) {
        showToast.error(normalizeApiError(err).message);
      }
    },
    onSuccess: (data) => {
      invalidateResource();
      resourceEvents.emit(config.resource, 'created', { data });
      if (config.toast?.create?.success) showToast.success(config.toast.create.success);
    },
  });

  // ── UPDATE ────────────────────────────────────────────────
  const update = useMutation({
    retry: RESOURCE_MUTATION_DEFAULTS.retry,
    mutationFn: async ({ id, data: payload }: { id: string; data: Partial<T> }) => {
      const ep = config.endpoints?.update ?? config.endpoint;
      const { data } = await apiClient.patch<T>(`${ep}/${id}`, payload, { headers });
      return data;
    },
    onMutate: async ({ id, data: payload }) => {
      if (!config.optimistic?.update) return {};
      await queryClient.cancelQueries({ queryKey: keys.lists(organizationId) });
      await queryClient.cancelQueries({ queryKey: keys.detail(organizationId, id) });

      const previousDetail = queryClient.getQueryData<T>(keys.detail(organizationId, id));
      const listQueries = queryClient.getQueriesData<ResourceListResponse<T>>({
        queryKey: keys.lists(organizationId),
      });
      const snapshots = listQueries.map(([key, data]) => ({ key, data }));

      if (previousDetail) {
        queryClient.setQueryData(keys.detail(organizationId, id), {
          ...previousDetail,
          ...payload,
        });
      }

      for (const [key, data] of listQueries) {
        if (data) {
          queryClient.setQueryData(key, {
            ...data,
            data: config.optimistic.update(id, payload, data.data),
          });
        }
      }

      return { previousDetail, snapshots };
    },
    onError: (err, { id }, context) => {
      const ctx = context as {
        previousDetail?: T;
        snapshots?: Array<{ key: unknown; data: unknown }>;
      };
      if (ctx?.previousDetail) {
        queryClient.setQueryData(keys.detail(organizationId, id), ctx.previousDetail);
      }
      ctx?.snapshots?.forEach(({ key, data }) => {
        queryClient.setQueryData(key as readonly unknown[], data);
      });
      if (configRef.current.toast?.update) {
        showToast.error(normalizeApiError(err).message);
      }
    },
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData<T>(keys.detail(organizationId, id), (prev) =>
        prev ? { ...prev, ...updated } : updated,
      );
      void queryClient.invalidateQueries({ queryKey: keys.detail(organizationId, id) });
      invalidateResource();
      resourceEvents.emit(config.resource, 'updated', { data: updated, id });
      if (config.toast?.update?.success) showToast.success(config.toast.update.success);
    },
  });

  // ── DELETE ────────────────────────────────────────────────
  const remove = useMutation({
    retry: RESOURCE_MUTATION_DEFAULTS.retry,
    mutationFn: async (id: string) => {
      const ep = config.endpoints?.delete ?? config.endpoint;
      await apiClient.delete(`${ep}/${id}`, { headers });
    },
    onMutate: async (id) => {
      if (!config.optimistic?.delete) return {};
      await queryClient.cancelQueries({ queryKey: keys.lists(organizationId) });

      const listQueries = queryClient.getQueriesData<ResourceListResponse<T>>({
        queryKey: keys.lists(organizationId),
      });
      const snapshots = listQueries.map(([key, data]) => ({ key, data }));

      for (const [key, data] of listQueries) {
        if (data) {
          queryClient.setQueryData(key, {
            ...data,
            data: config.optimistic.delete(id, data.data),
            meta: { ...data.meta, total: Math.max(0, data.meta.total - 1) },
          });
        }
      }

      return { snapshots };
    },
    onError: (err, _id, context) => {
      const ctx = context as { snapshots?: Array<{ key: unknown; data: unknown }> };
      ctx?.snapshots?.forEach(({ key, data }) => {
        queryClient.setQueryData(key as readonly unknown[], data);
      });
      if (configRef.current.toast?.delete) {
        showToast.error(normalizeApiError(err).message);
      }
    },
    onSuccess: (_, id) => {
      void queryClient.cancelQueries({ queryKey: keys.detail(organizationId, id) });
      invalidateResource();
      resourceEvents.emit(config.resource, 'deleted', { id });
      if (config.toast?.delete?.success) showToast.success(config.toast.delete.success);
    },
  });

  // ── ARCHIVE (soft delete) ─────────────────────────────────
  const archive = useMutation({
    retry: RESOURCE_MUTATION_DEFAULTS.retry,
    mutationFn: async (id: string) => {
      const ep = config.endpoints?.archive ?? `${config.endpoint}/${id}/archive`;
      const { data } = await apiClient.post<T>(ep, {}, { headers });
      return data;
    },
    onError: (err: unknown) => {
      if (configRef.current.toast?.archive) {
        showToast.error(normalizeApiError(err).message);
      }
    },
    onSuccess: (_, id) => {
      invalidateResource();
      resourceEvents.emit(config.resource, 'archived', { id });
      if (config.toast?.archive?.success) showToast.success(config.toast.archive.success);
    },
  });

  // ── BULK DELETE ───────────────────────────────────────────
  const bulkDelete = useMutation({
    retry: RESOURCE_MUTATION_DEFAULTS.retry,
    mutationFn: async (ids: string[]) => {
      const ep = config.endpoints?.bulkDelete ?? `${config.endpoint}/bulk-delete`;
      await apiClient.post(ep, { ids }, { headers });
    },
    onSuccess: (_, ids) => {
      ids.forEach((id) => {
        void queryClient.cancelQueries({ queryKey: keys.detail(organizationId, id) });
      });
      invalidateResource();
      resourceEvents.emit(config.resource, 'bulkDeleted', { ids });
    },
  });

  // ── STATUS CHANGE ──────────────────────────────────────────
  const statusChange = useMutation({
    retry: RESOURCE_MUTATION_DEFAULTS.retry,
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const ep = config.endpoints?.statusChange ?? `${config.endpoint}/${id}/status`;
      const { data } = await apiClient.post<T>(ep, { status }, { headers });
      return data;
    },
    onError: (err: unknown) => {
      if (configRef.current.toast?.statusChange) {
        showToast.error(normalizeApiError(err).message);
      }
    },
    onSuccess: (updated, { id }) => {
      if (updated) {
        queryClient.setQueryData<T>(keys.detail(organizationId, id), (prev) =>
          prev ? { ...prev, ...updated } : updated,
        );
      }
      void queryClient.invalidateQueries({ queryKey: keys.detail(organizationId, id) });
      invalidateResource();
      resourceEvents.emit(config.resource, 'updated', { data: updated, id });
      if (config.toast?.statusChange?.success) {
        showToast.success(config.toast.statusChange.success);
      }
    },
  });

  // ── CUSTOM ACTIONS ────────────────────────────────────────
  const action = useCallback(
    (actionName: string, id: string, payload?: unknown) => {
      const cfg = configRef.current;
      const actionConfig = cfg.customActions?.[actionName];
      if (!actionConfig) {
        throw new Error(`Unknown action "${actionName}" for resource "${cfg.resource}"`);
      }
      return apiClient
        .request<T>({
          method: actionConfig.method,
          url: actionConfig.path(id),
          data: payload,
          headers,
        })
        .then(({ data }) => {
          invalidateResource();
          void queryClient.invalidateQueries({ queryKey: keys.detail(organizationId, id) });
          resourceEvents.emit(cfg.resource, 'updated', { data, id });
          const toastMsg = cfg.toast?.[actionName]?.success;
          if (toastMsg) showToast.success(toastMsg);
          return data;
        })
        .catch((error: unknown) => {
          if (cfg.toast?.[actionName]) {
            showToast.error(normalizeApiError(error).message);
          }
          throw error;
        });
    },
    [headers, invalidateResource, queryClient, keys, organizationId],
  );

  return {
    create,
    update,
    remove,
    archive,
    bulkDelete,
    statusChange,
    action,
    getError: (mutation: typeof create | typeof update | typeof remove): NormalizedError | null =>
      mutation.error ? normalizeApiError(mutation.error) : null,
  };
}
