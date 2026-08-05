'use client';

import { getResourceAccess } from './resource-registry';
import { useResourceAccess } from './use-resource-access';

export interface ResourcePermissions {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canArchive: boolean;
  canBulkDelete: boolean;
}

/** @deprecated Use `useRegisteredResourceAccess(resource)` instead. */
export function useResourcePermissions(
  _permissions?: unknown,
  access?: Parameters<typeof useResourceAccess>[0],
): ResourcePermissions {
  return useResourceAccess(access);
}

/** @deprecated Use `useRegisteredResourceAccess(resource)` instead. */
export function useRegisteredResourcePermissions(resource: string): ResourcePermissions {
  return useResourceAccess(getResourceAccess(resource));
}
