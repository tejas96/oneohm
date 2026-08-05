import type { FeatureAccessKey } from './feature-policy';
import { isFeatureAccessKey } from './feature-policy';

export interface RoutePolicyEntry {
  /** Route prefix or exact path. Dynamic segments use bracket notation. */
  pattern: string;
  feature: FeatureAccessKey;
  exact?: boolean;
}

/**
 * Implemented dashboard routes mapped to feature keys.
 * Cross-checked against all dashboard page.tsx files.
 */
export const IMPLEMENTED_ROUTE_POLICIES: readonly RoutePolicyEntry[] = [
  { pattern: '/', feature: 'dashboard.view', exact: true },
  { pattern: '/dashboard', feature: 'dashboard.view' },
  { pattern: '/profile', feature: 'profile.view' },

  { pattern: '/customers', feature: 'customers.view' },
  { pattern: '/customers/new', feature: 'customers.manage' },
  { pattern: '/customers/[id]/edit', feature: 'customers.manage' },
  { pattern: '/customers/[id]/properties/new', feature: 'properties.manage' },

  { pattern: '/properties', feature: 'properties.view' },
  { pattern: '/properties/new', feature: 'properties.manage' },
  { pattern: '/properties/[id]/edit', feature: 'properties.manage' },
  { pattern: '/properties/[id]', feature: 'properties.view' },

  { pattern: '/onboarding/new', feature: 'onboarding.manage' },
  { pattern: '/pipeline', feature: 'pipeline.view' },

  { pattern: '/quotes/new', feature: 'quotes.create' },
  { pattern: '/quotes/list', feature: 'quotes.view' },
  { pattern: '/quotes/[id]', feature: 'quotes.view' },
  { pattern: '/quotes', feature: 'quotes.view' },

  { pattern: '/projects/new', feature: 'projects.create' },
  { pattern: '/projects/my-tasks', feature: 'projects.tasks.manage' },
  { pattern: '/projects/list', feature: 'projects.view' },
  { pattern: '/projects/[id]', feature: 'projects.view' },
  { pattern: '/projects', feature: 'projects.view' },

  { pattern: '/finance/receivables', feature: 'finance.view' },
  { pattern: '/finance', feature: 'finance.view' },

  { pattern: '/inventory/dispatches/new', feature: 'inventory.dispatch.manage' },
  { pattern: '/inventory/dispatches/[id]', feature: 'inventory.dispatch.view' },
  { pattern: '/inventory/dispatches', feature: 'inventory.dispatch.view' },
  { pattern: '/inventory/purchase-orders/new', feature: 'inventory.procurement.manage' },
  { pattern: '/inventory/purchase-orders/[id]', feature: 'inventory.procurement.view' },
  { pattern: '/inventory/purchase-orders', feature: 'inventory.procurement.view' },
  { pattern: '/inventory/allocations/[id]', feature: 'inventory.allocations.view' },
  { pattern: '/inventory/allocations', feature: 'inventory.allocations.view' },
  { pattern: '/inventory/stock/[id]', feature: 'inventory.stock.view' },
  { pattern: '/inventory/stock', feature: 'inventory.stock.view' },
  { pattern: '/inventory/transactions', feature: 'inventory.transactions.view' },
  { pattern: '/inventory/warehouses/[id]', feature: 'inventory.stock.view' },
  { pattern: '/inventory/warehouses', feature: 'inventory.stock.view' },
  { pattern: '/inventory/vendors/[id]', feature: 'inventory.stock.view' },
  { pattern: '/inventory/vendors', feature: 'inventory.stock.view' },
  { pattern: '/inventory/alerts', feature: 'inventory.stock.view' },
  { pattern: '/inventory', feature: 'inventory.stock.view' },

  { pattern: '/admin/users/[id]', feature: 'admin.users.view' },
  { pattern: '/admin/users', feature: 'admin.users.view' },
  { pattern: '/admin/discom', feature: 'admin.discom.manage' },
  { pattern: '/admin/workflow-steps', feature: 'admin.settings.manage' },
  { pattern: '/admin/quote-config', feature: 'admin.catalog.manage' },
  { pattern: '/admin/subsidy-config', feature: 'admin.catalog.manage' },
  { pattern: '/admin/products', feature: 'admin.catalog.manage' },
  { pattern: '/admin/product-types', feature: 'admin.catalog.manage' },
  { pattern: '/admin/pricing', feature: 'admin.catalog.manage' },
  { pattern: '/admin/lookups', feature: 'admin.catalog.manage' },
  { pattern: '/admin/brands', feature: 'admin.catalog.manage' },
  { pattern: '/admin', feature: 'admin.catalog.manage' },
] as const;

/** Routes configured in nav but not implemented — deny direct access in fixed mode. */
export const UNIMPLEMENTED_ROUTE_PREFIXES = [
  '/dashboard/tasks',
  '/dashboard/calendar',
  '/dashboard/activity',
  '/service',
  '/help',
  '/notifications',
  '/admin/settings',
  '/admin/roles',
  '/admin/permissions',
  '/dev/table',
] as const;

export interface RouteAccessResult {
  feature: FeatureAccessKey | null;
  isRegistered: boolean;
  isImplemented: boolean;
}

function normalizePath(pathname: string): string {
  const clean = pathname.split('?')[0]?.split('#')[0] ?? pathname;
  if (clean === '/') return '/';
  return clean.endsWith('/') && clean.length > 1 ? clean.slice(0, -1) : clean;
}

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/\[id\]/g, '[^/]+')
    .replace(/\[.*?\]/g, '[^/]+')
    .replace(/\//g, '\\/');
  return new RegExp(`^${escaped}$`);
}

function matchesPattern(pathname: string, entry: RoutePolicyEntry): boolean {
  const normalized = normalizePath(pathname);
  const regex = patternToRegex(entry.pattern);
  if (entry.exact) {
    return normalized === entry.pattern;
  }
  return regex.test(normalized) || normalized.startsWith(entry.pattern.replace(/\[.*?\]/g, ''));
}

export function isUnimplementedRoute(pathname: string): boolean {
  const normalized = normalizePath(pathname);
  return UNIMPLEMENTED_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function getRouteAccess(pathname: string): RouteAccessResult {
  const normalized = normalizePath(pathname);

  if (isUnimplementedRoute(normalized)) {
    return { feature: null, isRegistered: true, isImplemented: false };
  }

  for (const entry of IMPLEMENTED_ROUTE_POLICIES) {
    if (matchesPattern(normalized, entry)) {
      return { feature: entry.feature, isRegistered: true, isImplemented: true };
    }
  }

  if (normalized.startsWith('/admin/roles') || normalized.startsWith('/admin/permissions')) {
    return { feature: null, isRegistered: true, isImplemented: false };
  }

  return { feature: null, isRegistered: false, isImplemented: false };
}

export function getRouteFeature(pathname: string): FeatureAccessKey | null {
  return getRouteAccess(pathname).feature;
}

export function getImplementedRoutePaths(): string[] {
  return IMPLEMENTED_ROUTE_POLICIES.map((entry) => entry.pattern);
}

export function assertRoutePolicyIntegrity(): void {
  for (const entry of IMPLEMENTED_ROUTE_POLICIES) {
    if (!isFeatureAccessKey(entry.feature)) {
      throw new Error(`Invalid feature key on route ${entry.pattern}`);
    }
  }
}
