import type { FeatureAccessKey } from '@/lib/access-control/feature-policy';
import { ROUTES } from '@/lib/config/routes';

/**
 * Maps navigation hrefs to fixed-role feature keys.
 * Unlisted implemented hrefs deny in fixed mode.
 */
export const NAVIGATION_FEATURE_MAP: Record<string, FeatureAccessKey> = {
  [ROUTES.DASHBOARD.HOME]: 'dashboard.view',
  [ROUTES.HOME]: 'dashboard.view',

  [ROUTES.CUSTOMERS.LIST]: 'customers.view',
  [ROUTES.PIPELINE.HOME]: 'pipeline.view',

  [ROUTES.QUOTES.DASHBOARD]: 'quotes.view',
  [ROUTES.QUOTES.LIST]: 'quotes.view',
  [ROUTES.QUOTES.NEW]: 'quotes.create',

  [ROUTES.PROJECTS.DASHBOARD]: 'projects.view',
  [ROUTES.PROJECTS.LIST]: 'projects.view',
  [ROUTES.PROJECTS.NEW]: 'projects.create',
  [ROUTES.PROJECTS.MY_TASKS]: 'projects.tasks.manage',

  [ROUTES.INVENTORY.LIST]: 'inventory.stock.view',
  [ROUTES.INVENTORY.STOCK]: 'inventory.stock.view',
  [ROUTES.INVENTORY.ALERTS]: 'inventory.stock.view',
  [ROUTES.INVENTORY.WAREHOUSES]: 'inventory.stock.view',
  [ROUTES.INVENTORY.PURCHASE_ORDERS]: 'inventory.procurement.view',
  [ROUTES.INVENTORY.VENDORS]: 'inventory.stock.view',
  [ROUTES.INVENTORY.ALLOCATIONS]: 'inventory.allocations.view',
  [ROUTES.INVENTORY.DISPATCHES]: 'inventory.dispatch.view',
  [ROUTES.INVENTORY.TRANSACTIONS]: 'inventory.transactions.view',

  [ROUTES.FINANCE.HOME]: 'finance.view',
  [ROUTES.FINANCE.RECEIVABLES]: 'finance.view',

  [ROUTES.ADMIN.HOME]: 'admin.catalog.manage',
  [ROUTES.ADMIN.USERS]: 'admin.users.view',
  [ROUTES.ADMIN.DISCOM]: 'admin.discom.manage',
  [ROUTES.ADMIN.PRODUCT_TYPES]: 'admin.catalog.manage',
  [ROUTES.ADMIN.BRANDS]: 'admin.catalog.manage',
  [ROUTES.ADMIN.PRODUCTS]: 'admin.catalog.manage',
  [ROUTES.ADMIN.INSTALLATION_PRICING]: 'admin.catalog.manage',
  [ROUTES.ADMIN.QUOTE_CONFIG]: 'admin.catalog.manage',
  [ROUTES.ADMIN.SUBSIDY_CONFIG]: 'admin.catalog.manage',
  [ROUTES.ADMIN.LOOKUPS]: 'admin.catalog.manage',
  [ROUTES.ADMIN.WORKFLOW_STEPS]: 'admin.settings.manage',
};

/** Hrefs that should not appear in fixed-mode navigation. */
export const NAVIGATION_EXCLUDED_HREFS = new Set<string>([
  ROUTES.DASHBOARD.TASKS,
  ROUTES.DASHBOARD.CALENDAR,
  ROUTES.DASHBOARD.ACTIVITY,
  ROUTES.SERVICE.HOME,
  ROUTES.SERVICE.AMC,
  ROUTES.HELP.HOME,
  ROUTES.HELP.DOCS,
  ROUTES.HELP.SUPPORT,
  ROUTES.ADMIN.SETTINGS,
]);

export function getNavigationFeature(href: string): FeatureAccessKey | undefined {
  const cleanHref = href.split('?')[0] ?? href;
  return NAVIGATION_FEATURE_MAP[cleanHref];
}

export function isNavigationHrefExcluded(href: string): boolean {
  const cleanHref = href.split('?')[0] ?? href;
  if (NAVIGATION_EXCLUDED_HREFS.has(cleanHref)) {
    return true;
  }
  return cleanHref.startsWith('/service') || cleanHref.startsWith('/help');
}
