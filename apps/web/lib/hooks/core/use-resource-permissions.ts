'use client';

import { useMemo } from 'react';

import type { ResourcePermissionConfig } from './types';

import { useAuth } from '@/providers/auth-provider';

export interface ResourcePermissions {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canArchive: boolean;
  canBulkDelete: boolean;
}

export function useResourcePermissions(config?: ResourcePermissionConfig): ResourcePermissions {
  const { hasPermission } = useAuth();

  return useMemo(() => {
    if (!config) {
      return {
        canView: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canArchive: true,
        canBulkDelete: true,
      };
    }
    return {
      canView: config.view ? hasPermission(config.view) : true,
      canCreate: config.create ? hasPermission(config.create) : true,
      canUpdate: config.update ? hasPermission(config.update) : true,
      canDelete: config.delete ? hasPermission(config.delete) : true,
      canArchive: config.archive ? hasPermission(config.archive) : true,
      canBulkDelete: config.bulkDelete ? hasPermission(config.bulkDelete) : true,
    };
  }, [config, hasPermission]);
}
