'use client';

import { useQuery } from '@tanstack/react-query';
import { LookupDataType, LookupScopeType, LookupTypeCode } from '@tejas96/shared/types';
import { useMemo } from 'react';

import {
  defineResource,
  getResourceConfig,
  getResourcePermissions,
  STALE_TIMES,
  useResourceList,
  useResourceDetail,
  useResourceMutations,
  useResourcePermissions,
  type BaseFilters,
  type ResourceConfig,
} from '../core';
import { useOrgContext } from '../core/use-org-context';

import { apiClient } from '@/lib/api/client';
import { PERMISSIONS } from '@/lib/constants/permissions';

// ── Types ──────────────────────────────────────────────────────

export interface Lookup {
  id: string;
  typeCode: string;
  code: string;
  label: string;
  value?: string;
  dataType?: LookupDataType;
  scopeType: LookupScopeType;
  scopeId?: string;
  parentId?: string;
  dependsOnId?: string;
  orderIndex: number;
  color?: string;
  icon?: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface LookupByTypeCode {
  id: string;
  code: string;
  label: string;
  value?: string;
  color?: string;
  icon?: string;
  orderIndex: number;
  metadata?: Record<string, unknown>;
}

export interface LookupOption {
  value: string;
  label: string;
  color?: string;
  orderIndex: number;
}

export interface LookupFilters extends BaseFilters {
  typeCode?: string;
  scopeType?: string;
  isActive?: string;
  parentId?: string;
}

// ── Resource Registration ──────────────────────────────────────

defineResource<Lookup>(
  'lookups',
  {
    endpoint: '/lookups',
    defaultPageSize: 20,
    searchDebounceMs: 500,
    syncToUrl: true,
    staleTime: STALE_TIMES.slow,
    defaultSort: { field: 'label', order: 'ASC' },
  },
  {
    view: PERMISSIONS.LOOKUPS.VIEW,
    create: PERMISSIONS.LOOKUPS.CREATE,
    update: PERMISSIONS.LOOKUPS.UPDATE,
    delete: PERMISSIONS.LOOKUPS.DELETE,
  },
);

// ── Admin List Hook ────────────────────────────────────────────

export function useLookups(
  overrides?: Partial<ResourceConfig<Lookup, LookupFilters>>,
): ReturnType<typeof useResourceList<Lookup, LookupFilters>> {
  const config = getResourceConfig('lookups') as ResourceConfig<Lookup, LookupFilters>;
  return useResourceList<Lookup, LookupFilters>({
    ...config,
    ...overrides,
    defaultFilters: {
      ...config.defaultFilters,
      ...overrides?.defaultFilters,
    } as Partial<LookupFilters>,
  });
}

// ── Type Code suggestions Hook ─────────────────────────────────
// Returns deduplicated list of existing typeCode values for autocomplete suggestions.
// Used by the admin form modal to power the "create or select" typeCode field.

export function useLookupTypeCodes(): { typeCodes: string[]; isLoading: boolean } {
  const { items, isLoading } = useLookups({
    defaultPageSize: 200,
    syncToUrl: false,
    defaultSort: { field: 'typeCode', order: 'ASC' },
  });

  const typeCodes = useMemo(() => [...new Set(items.map((l) => l.typeCode))].sort(), [items]);

  return { typeCodes, isLoading };
}

// ── Detail Hook ────────────────────────────────────────────────

export function useLookup(id: string): ReturnType<typeof useResourceDetail<Lookup>> {
  return useResourceDetail<Lookup>({
    resource: 'lookups',
    endpoint: '/lookups',
    id,
  });
}

// ── Mutations Hook ─────────────────────────────────────────────

export function useLookupMutations(): ReturnType<typeof useResourceMutations<Lookup>> {
  return useResourceMutations<Lookup>({
    resource: 'lookups',
    endpoint: '/lookups',
    customActions: {
      'toggle-active': {
        method: 'POST',
        path: (id) => `/lookups/${id}/toggle-active`,
      },
    },
    toast: {
      create: { success: 'Lookup created', error: 'Failed to create lookup' },
      update: { success: 'Lookup updated', error: 'Failed to update lookup' },
      delete: { success: 'Lookup deleted', error: 'Failed to delete lookup' },
      'toggle-active': { success: 'Lookup status updated', error: 'Failed to update status' },
    },
  });
}

// ── Permissions Hook ───────────────────────────────────────────

export function useLookupPermissions(): ReturnType<typeof useResourcePermissions> {
  return useResourcePermissions(getResourcePermissions('lookups'));
}

// ── By Type Code Hook (dropdown consumer API) ──────────────────
// Used by any feature needing to populate dropdowns from the lookups table.
// Import from @/lib/hooks/resources, NOT from @/lib/hooks/core.

export function useLookupsByTypeCode(
  typeCode: string,
  scopeType?: LookupScopeType,
  scopeId?: string,
  enabled = true,
): {
  items: LookupByTypeCode[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
} {
  const { orgHeaders } = useOrgContext();

  const buildUrl = (): string => {
    const params = new URLSearchParams();
    if (scopeType) params.set('scopeType', scopeType);
    if (scopeId) params.set('scopeId', scopeId);
    const qs = params.toString();
    return qs ? `/lookups/by-type/${typeCode}?${qs}` : `/lookups/by-type/${typeCode}`;
  };

  const query = useQuery<LookupByTypeCode[]>({
    queryKey: ['lookups', 'by-type', typeCode, scopeType ?? '', scopeId ?? ''],
    queryFn: async ({ signal }) => {
      const headers = scopeType === LookupScopeType.ORGANIZATION ? orgHeaders : {};
      const { data } = await apiClient.get<LookupByTypeCode[]>(buildUrl(), { headers, signal });
      return data as LookupByTypeCode[];
    },
    enabled: !!typeCode && enabled,
    staleTime: STALE_TIMES.slow,
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

function toLookupOptions(items: LookupByTypeCode[]): LookupOption[] {
  return items
    .map((item) => ({
      value: item.code,
      label: item.label,
      color: item.color,
      orderIndex: item.orderIndex,
    }))
    .sort((a, b) => a.orderIndex - b.orderIndex || a.label.localeCompare(b.label));
}

export function useLookupOptions(
  typeCode: LookupTypeCode,
  enabled = true,
): {
  items: LookupOption[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
} {
  const query = useLookupsByTypeCode(typeCode, LookupScopeType.GLOBAL, undefined, enabled);

  return {
    items: toLookupOptions(query.items),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
