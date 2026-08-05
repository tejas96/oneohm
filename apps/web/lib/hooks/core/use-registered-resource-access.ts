'use client';

import { getResourceAccess } from './resource-registry';
import { useResourceAccess } from './use-resource-access';
import type { ResourcePermissions } from './use-resource-permissions';

export function useRegisteredResourceAccess(resource: string): ResourcePermissions {
  return useResourceAccess(getResourceAccess(resource));
}
