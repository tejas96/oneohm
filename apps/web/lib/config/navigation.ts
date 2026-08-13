import {
  BadgePercent,
  Box,
  Calendar,
  CheckCircle,
  CheckSquare,
  Edit,
  FileBarChart,
  FileText,
  Folder,
  HelpCircle,
  Home,
  Key,
  LayoutGrid,
  Layers,
  List,
  Package,
  Plus,
  Send,
  Settings,
  Shield,
  Tag,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react';

import { ROUTES, getPanelKeyForPath } from './routes';

import type { NavigationConfig, PanelConfig } from '@/lib/types';

/**
 * Centralized Navigation Configuration
 * Single source of truth for Rail and Panel navigation
 *
 * To add a new navigation item:
 * 1. Add to railTop/railBottom with a unique panelKey
 * 2. Add corresponding panel config in panels object
 */
export const navigationConfig: NavigationConfig = {
  // ============================================
  // Rail Top Items (Main Navigation)
  // ============================================
  railTop: [
    {
      id: 'home',
      icon: Home,
      label: 'Dashboard',
      href: ROUTES.DASHBOARD.HOME,
      panelKey: 'dashboard',
    },
    {
      id: 'crm',
      icon: Users,
      label: 'Sales & CRM',
      href: ROUTES.CUSTOMERS.LIST,
      panelKey: 'crm',
      // badge: dynamically set via useNavigationCounts hook
    },
    {
      id: 'quotes',
      icon: FileText,
      label: 'Quotations',
      href: ROUTES.QUOTES.DASHBOARD,
      panelKey: 'quotes',
    },
    {
      id: 'projects',
      icon: Folder,
      label: 'Projects',
      href: ROUTES.PROJECTS.DASHBOARD,
      panelKey: 'projects',
    },
    {
      id: 'inventory',
      icon: Box,
      label: 'Inventory',
      href: ROUTES.INVENTORY.STOCK,
      panelKey: 'inventory',
      roles: [
        'admin',
        'super_admin',
        'platform_admin',
        'inventory_manager',
        'store',
        'project_manager',
        'accounts_manager',
      ],
      permissions: ['inventory:read'],
    },
    {
      id: 'finance',
      icon: Wallet,
      label: 'Finance',
      href: ROUTES.FINANCE.HOME,
      panelKey: 'finance',
    },
    {
      id: 'service',
      icon: Wrench,
      label: 'Service',
      href: ROUTES.SERVICE.HOME,
      panelKey: 'service',
    },
  ],

  // ============================================
  // Rail Bottom Items (Settings, Help, Admin)
  // ============================================
  railBottom: [
    {
      id: 'help',
      icon: HelpCircle,
      label: 'Help',
      href: ROUTES.HELP.HOME,
      panelKey: 'help',
    },
    {
      id: 'admin',
      icon: Users,
      label: 'Admin',
      href: ROUTES.ADMIN.HOME,
      panelKey: 'admin',
      roles: ['admin', 'super_admin', 'platform_admin'],
    },
  ],

  // ============================================
  // Panel Configurations
  // ============================================
  panels: {
    dashboard: {
      title: 'Home',
      sections: [
        {
          title: 'Quick Access',
          items: [
            { id: 'dashboard', icon: Home, label: 'Dashboard', href: ROUTES.DASHBOARD.HOME },
            { id: 'tasks', icon: CheckSquare, label: 'My Tasks', href: ROUTES.DASHBOARD.TASKS },
            { id: 'calendar', icon: Calendar, label: 'Calendar', href: ROUTES.DASHBOARD.CALENDAR },
          ],
        },
        {
          title: 'Views',
          items: [
            { id: 'overview', icon: LayoutGrid, label: 'Overview', href: ROUTES.DASHBOARD.HOME },
            {
              id: 'activity',
              icon: TrendingUp,
              label: 'Activity Feed',
              href: ROUTES.DASHBOARD.ACTIVITY,
            },
          ],
        },
      ],
    },

    crm: {
      title: 'Sales & CRM',
      sections: [
        {
          title: 'Customers',
          items: [
            {
              id: 'customers',
              icon: Users,
              label: 'All Customers',
              href: ROUTES.CUSTOMERS.LIST,
              // badge: dynamically set via useNavigationCounts (crm.totalCustomers)
            },
          ],
        },
        {
          title: 'Pipeline',
          items: [
            {
              id: 'followups',
              icon: Calendar,
              label: 'Follow-ups',
              href: ROUTES.FOLLOWUPS.LIST,
              // badge: overdue + today, via useFollowupSummary in the nav component.
              // Deliberately NOT useNavigationCounts — that hook is mock data.
            },
            {
              id: 'pipeline',
              icon: TrendingUp,
              label: 'Sales Funnel',
              href: ROUTES.PIPELINE.HOME,
            },
          ],
        },
      ],
    },

    quotes: {
      title: 'Quotations',
      sections: [
        {
          title: 'Overview',
          items: [
            {
              id: 'quotes-dashboard',
              icon: LayoutGrid,
              label: 'Dashboard',
              href: ROUTES.QUOTES.DASHBOARD,
              exactMatch: true,
            },
            {
              id: 'all-quotes',
              icon: FileText,
              label: 'All Quotes',
              href: ROUTES.QUOTES.LIST,
              children: [
                {
                  id: 'drafts',
                  icon: Edit,
                  label: 'Drafts',
                  href: `${ROUTES.QUOTES.LIST}?status=draft`,
                },
                {
                  id: 'sent',
                  icon: Send,
                  label: 'Sent',
                  href: `${ROUTES.QUOTES.LIST}?status=sent`,
                },
                {
                  id: 'accepted',
                  icon: CheckCircle,
                  label: 'Accepted',
                  href: `${ROUTES.QUOTES.LIST}?status=accepted`,
                },
              ],
            },
          ],
        },
        {
          title: 'Tools',
          items: [
            {
              id: 'quote-builder',
              icon: Plus,
              label: 'Quote Builder',
              href: ROUTES.QUOTES.NEW,
              exactMatch: true,
            },
          ],
        },
      ],
    },

    projects: {
      title: 'Projects',
      sections: [
        {
          title: 'Overview',
          items: [
            {
              id: 'projects-dashboard',
              icon: Home,
              label: 'Dashboard',
              href: ROUTES.PROJECTS.DASHBOARD,
              exactMatch: true,
            },
            {
              id: 'all-projects',
              icon: List,
              label: 'Projects',
              href: ROUTES.PROJECTS.LIST,
              // badge: dynamically set via useNavigationCounts (projects.totalProjects)
              //
              // The per-status children (Active / Overdue / At risk / Planning /
              // On hold / Completed / Cancelled) were removed: the list page now
              // carries the same seven views as quick-filter chips above the
              // grid, where the current selection is visible rather than implied
              // by which sidebar link you last clicked.
            },
          ],
        },
        {
          title: 'My Work',
          items: [
            {
              id: 'projects-my-tasks',
              icon: CheckSquare,
              label: 'My Tasks',
              href: ROUTES.PROJECTS.MY_TASKS,
              // badge: dynamically set via useNavigationCounts (projects.myTasks)
            },
          ],
        },
      ],
    },

    inventory: {
      title: 'Inventory',
      sections: [
        {
          title: 'Stock',
          items: [
            {
              id: 'inventory-dashboard',
              icon: LayoutGrid,
              label: 'Dashboard',
              href: ROUTES.INVENTORY.LIST,
              exactMatch: true,
            },
            {
              id: 'all-inventory',
              icon: Package,
              label: 'All Stock',
              href: ROUTES.INVENTORY.STOCK,
            },
            {
              id: 'low-stock',
              icon: Package,
              label: 'Low Stock Alerts',
              href: ROUTES.INVENTORY.ALERTS,
            },
            {
              id: 'warehouses',
              icon: Box,
              label: 'Warehouses',
              href: ROUTES.INVENTORY.WAREHOUSES,
            },
          ],
        },
        {
          title: 'Procurement',
          items: [
            {
              id: 'purchase-orders',
              icon: FileText,
              label: 'Purchase Orders',
              href: ROUTES.INVENTORY.PURCHASE_ORDERS,
            },
            {
              id: 'vendors',
              icon: Users,
              label: 'Vendors',
              href: ROUTES.INVENTORY.VENDORS,
            },
          ],
        },
        {
          title: 'Operations',
          items: [
            {
              id: 'allocations',
              icon: Layers,
              label: 'Allocations',
              href: ROUTES.INVENTORY.ALLOCATIONS,
            },
            {
              id: 'dispatches',
              icon: Send,
              label: 'Dispatches',
              href: ROUTES.INVENTORY.DISPATCHES,
            },
            {
              id: 'transactions',
              icon: List,
              label: 'Transactions',
              href: ROUTES.INVENTORY.TRANSACTIONS,
            },
          ],
        },
      ],
    },

    finance: {
      title: 'Finance',
      // Two items, down from nine. Receipts, expenses, calendar, reports,
      // vendors, profitability and customers-AR were separate screens over the
      // same data; the ledger view replaces all of them with one filterable
      // table, and receivables replaces outstanding + customers-AR.
      sections: [
        {
          title: 'MONEY',
          items: [
            {
              id: 'finance-cash',
              icon: LayoutGrid,
              label: 'Cash',
              href: ROUTES.FINANCE.HOME,
            },
            {
              id: 'finance-receivables',
              icon: FileBarChart,
              label: 'Receivables',
              href: ROUTES.FINANCE.RECEIVABLES,
            },
            {
              id: 'finance-approvals',
              icon: CheckCircle,
              label: 'Payment Approvals',
              href: ROUTES.FINANCE.APPROVALS,
            },
          ],
        },
      ],
    },

    service: {
      title: 'Service',
      sections: [
        {
          title: 'Tickets',
          items: [
            { id: 'all-service', icon: Wrench, label: 'All Tickets', href: ROUTES.SERVICE.HOME },
          ],
        },
      ],
    },

    help: {
      title: 'Help',
      sections: [
        {
          title: 'Resources',
          items: [
            { id: 'documentation', icon: FileText, label: 'Documentation', href: ROUTES.HELP.DOCS },
            {
              id: 'support',
              icon: HelpCircle,
              label: 'Contact Support',
              href: ROUTES.HELP.SUPPORT,
            },
          ],
        },
      ],
    },

    admin: {
      title: 'Admin',
      sections: [
        {
          title: 'Identity & Access',
          roles: ['admin', 'super_admin', 'platform_admin'],
          items: [
            {
              id: 'admin-users',
              icon: Users,
              label: 'Users',
              href: ROUTES.ADMIN.USERS,
            },
            {
              id: 'admin-roles',
              icon: Shield,
              label: 'Roles',
              href: ROUTES.ADMIN.ROLES,
            },
            {
              id: 'admin-permissions',
              icon: Key,
              label: 'Permissions',
              href: ROUTES.ADMIN.PERMISSIONS,
            },
          ],
        },
        {
          title: 'Utility network',
          roles: ['super_admin'],
          items: [
            {
              id: 'admin-discom',
              icon: Zap,
              label: 'DISCOMs',
              href: ROUTES.ADMIN.DISCOM,
            },
          ],
        },
        {
          title: 'Catalog & Products',
          roles: ['admin', 'super_admin', 'platform_admin'],
          items: [
            {
              id: 'admin-product-types',
              icon: Layers,
              label: 'Product Types',
              href: ROUTES.ADMIN.PRODUCT_TYPES,
            },
            {
              id: 'admin-brands',
              icon: Tag,
              label: 'Brands',
              href: ROUTES.ADMIN.BRANDS,
            },
            {
              id: 'admin-products',
              icon: Package,
              label: 'Products',
              href: ROUTES.ADMIN.PRODUCTS,
            },
          ],
        },
        {
          title: 'Pricing & Config',
          roles: ['admin', 'super_admin', 'platform_admin'],
          items: [
            {
              id: 'admin-installation-pricing',
              icon: Wrench,
              label: 'Installation Pricing',
              href: ROUTES.ADMIN.INSTALLATION_PRICING,
            },
            {
              id: 'admin-quote-config',
              icon: FileText,
              label: 'Quote Config',
              href: ROUTES.ADMIN.QUOTE_CONFIG,
            },
            {
              id: 'admin-subsidy-config',
              icon: BadgePercent,
              label: 'Subsidy Rules',
              href: ROUTES.ADMIN.SUBSIDY_CONFIG,
            },
          ],
        },
        {
          title: 'Settings',
          roles: ['admin', 'super_admin', 'platform_admin'],
          items: [
            {
              id: 'admin-lookups',
              icon: List,
              label: 'Lookups',
              href: ROUTES.ADMIN.LOOKUPS,
            },
          ],
        },
        {
          title: 'Project',
          roles: ['admin', 'super_admin', 'platform_admin'],
          items: [
            {
              id: 'admin-workflow-steps',
              icon: Settings,
              label: 'Workflow Steps',
              href: ROUTES.ADMIN.WORKFLOW_STEPS,
            },
          ],
        },
      ],
    },
  },
};

/**
 * Get panel config by route pathname
 */
export function getPanelConfigByPath(pathname: string): { key: string; config: PanelConfig } {
  // Find matching rail item
  const allRailItems = [...navigationConfig.railTop, ...navigationConfig.railBottom];

  // Check for exact match first, then prefix match
  const matchedItem = allRailItems.find(
    (item) =>
      pathname === item.href ||
      (item.href !== ROUTES.DASHBOARD.HOME && pathname.startsWith(item.href)),
  );

  const panelConfig = matchedItem ? navigationConfig.panels[matchedItem.panelKey] : undefined;

  if (panelConfig) {
    return {
      key: matchedItem!.panelKey,
      config: panelConfig,
    };
  }

  // Default to dashboard (guaranteed to exist)
  return {
    key: 'dashboard',
    config: navigationConfig.panels.dashboard!,
  };
}

/** Read project list status/health filters from URL or table filter params. */
export function getProjectListFilterFromSearchParams(searchParams: {
  get(name: string): string | null;
}): { status: string | null; healthStatus: string | null } {
  let status = searchParams.get('status');
  let healthStatus = searchParams.get('healthStatus');

  if (!status) {
    const prefFilters = searchParams.get('projects_filters');
    if (prefFilters) {
      try {
        const parsed = JSON.parse(prefFilters) as { status?: string; healthStatus?: string };
        status = parsed.status ?? null;
        healthStatus = parsed.healthStatus ?? null;
        if (status?.startsWith('health:')) {
          healthStatus = status.slice('health:'.length);
          status = 'active';
        }
      } catch {
        // ignore malformed filters
      }
    }
  }

  return { status, healthStatus };
}

/** Whether a project status sub-menu item matches the current list filter. */
export function isProjectStatusSubItemActive(
  pathname: string,
  itemHref: string,
  searchParams: { get(name: string): string | null },
): boolean {
  if (pathname !== ROUTES.PROJECTS.LIST) return false;

  const urlObj = new URL(itemHref, 'http://localhost');
  const targetStatus = urlObj.searchParams.get('status');
  const targetHealth = urlObj.searchParams.get('healthStatus');
  const { status: currentStatus, healthStatus: currentHealth } =
    getProjectListFilterFromSearchParams(searchParams);

  if (!currentStatus && !currentHealth) return false;

  return currentStatus === targetStatus && (targetHealth ?? null) === (currentHealth ?? null);
}

/**
 * Whether the "Projects" nav item should be highlighted.
 *
 * This used to require *no* status filter, because a status filter meant one of
 * the per-status children owned the highlight instead. Those children are gone,
 * and the list page now always carries a status filter (it defaults to Active),
 * so that test would leave the item permanently unhighlighted. Being on the page
 * is the whole condition now.
 *
 * `searchParams` is kept in the signature so the two call sites — `panel.tsx`
 * and `mobile-nav.tsx` — need no edit.
 */
export function isAllProjectsNavActive(
  pathname: string,
  itemHref: string,
  _searchParams: { get(name: string): string | null },
): boolean {
  return pathname === itemHref;
}

/**
 * Check if a navigation rail item should be active based on current pathname.
 * Uses ROUTE_TO_PANEL_MAP to handle cases where multiple routes belong to the same section.
 * For example: /properties should keep the CRM rail item active, not just /customers.
 */
export function isNavItemActive(pathname: string, href: string, panelKey?: string): boolean {
  // Dashboard special case
  if (href === ROUTES.DASHBOARD.HOME) {
    return pathname === ROUTES.DASHBOARD.HOME || pathname === ROUTES.HOME;
  }

  // If panelKey is provided, check if current path belongs to the same panel
  if (panelKey) {
    const currentPanelKey = getPanelKeyForPath(pathname);
    return currentPanelKey === panelKey;
  }

  // Fallback to prefix matching
  return pathname.startsWith(href);
}
