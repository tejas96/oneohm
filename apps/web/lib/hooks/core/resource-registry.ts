import type { ResourceConfig, ResourcePermissionConfig } from './types';

interface RegistryEntry<T = unknown> {
  config: ResourceConfig<T>;
  permissions?: ResourcePermissionConfig;
}

const registry = new Map<string, RegistryEntry>();

export function defineResource<T>(
  resource: string,
  config: Omit<ResourceConfig<T>, 'resource'>,
  permissions?: ResourcePermissionConfig,
): void {
  registry.set(resource, {
    config: { ...config, resource } as ResourceConfig<T>,
    permissions,
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
