'use client';

import { useMemo } from 'react';

import { canAccessFeature } from '@/lib/access-control/access';
import { useAuthStore } from '@/lib/stores/auth-store';

import type { ResourceAccessConfig } from './types';
import type { ResourcePermissions } from './use-resource-permissions';

const DENY_ALL: ResourcePermissions = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canArchive: false,
  canBulkDelete: false,
};

export function useResourceAccess(access?: ResourceAccessConfig): ResourcePermissions {
  const roles = useAuthStore((state) => state.user?.roles ?? []);

  return useMemo(() => {
    if (!access) {
      return DENY_ALL;
    }

    return {
      canView: access.view ? canAccessFeature(roles, access.view) : false,
      canCreate: access.create ? canAccessFeature(roles, access.create) : false,
      canUpdate: access.update ? canAccessFeature(roles, access.update) : false,
      canDelete: access.delete ? canAccessFeature(roles, access.delete) : false,
      canArchive: access.archive ? canAccessFeature(roles, access.archive) : false,
      canBulkDelete: access.bulkDelete ? canAccessFeature(roles, access.bulkDelete) : false,
    };
  }, [access, roles]);
}
