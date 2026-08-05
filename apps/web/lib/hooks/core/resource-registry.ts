import type { ResourceAccessConfig, ResourceConfig, ResourcePermissionConfig } from './types';

interface RegistryEntry<T = unknown> {
  config: ResourceConfig<T>;
  permissions?: ResourcePermissionConfig;
  access?: ResourceAccessConfig;
}

const registry = new Map<string, RegistryEntry>();

export function defineResource<T>(
  resource: string,
  config: Omit<ResourceConfig<T>, 'resource'>,
  permissions?: ResourcePermissionConfig,
  access?: ResourceAccessConfig,
): void {
  const resolvedPermissions = permissions ?? config.permissions;
  const resolvedAccess = access ?? config.access;

  registry.set(resource, {
    config: {
      ...config,
      resource,
      permissions: resolvedPermissions,
      access: resolvedAccess,
    } as ResourceConfig<T>,
    permissions: resolvedPermissions,
    access: resolvedAccess,
  });
}

export function getResourceConfig<T = unknown>(resource: string): ResourceConfig<T> {
  const entry = registry.get(resource);
  if (!entry) {
    throw new Error(`Resource "${resource}" not registered. Call defineResource() first.`);
  }
  return entry.config as ResourceConfig<T>;
}

export function getResourcePermissions(resource: string): ResourcePermissionConfig | undefined {
  return registry.get(resource)?.permissions;
}

export function getResourceAccess(resource: string): ResourceAccessConfig | undefined {
  return registry.get(resource)?.access;
}
