import {
  AlertCircle,
  BadgePercent,
  Banknote,
  BarChart3,
  Box,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle,
  CheckSquare,
  Clock,
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
  MapPin,
  MoreHorizontal,
  Package,
  Plus,
  Receipt,
  Send,
  Settings,
  Shield,
  Tag,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Wrench,
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
      href: ROUTES.QUOTES.LIST,
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
      label: 'Service & AMC',
      href: ROUTES.SERVICE.HOME,
      panelKey: 'service',
    },
    {
      id: 'analytics',
      icon: BarChart3,
      label: 'Analytics',
      href: ROUTES.ANALYTICS.HOME,
      panelKey: 'analytics',
    },
    {
      id: 'more',
      icon: MoreHorizontal,
      label: 'More',
      href: ROUTES.MORE.HOME,
      panelKey: 'more',
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
            {
              id: 'new-customer',
              icon: Plus,
              label: 'Add Customer',
              href: ROUTES.CUSTOMERS.NEW,
              exactMatch: true, // Action route - don't match as child of /customers
            },
          ],
        },
        {
          title: 'Properties',
          items: [
            {
              id: 'properties',
              icon: Building2,
              label: 'All Properties',
              href: ROUTES.PROPERTIES.LIST,
              // badge: dynamically set via useNavigationCounts (crm.totalProperties)
              // Sub-items for lead temperature filtering
              children: [
                {
                  id: 'properties-hot',
                  label: 'Hot',
                  href: `${ROUTES.PROPERTIES.LIST}?leadTemperature=hot`,
                  statusDot: 'hot' as const,
                  // badge: dynamically set via useNavigationCounts (crm.properties.hot)
                  badgeVariant: 'error' as const,
                },
                {
                  id: 'properties-warm',
                  label: 'Warm',
                  href: `${ROUTES.PROPERTIES.LIST}?leadTemperature=warm`,
                  statusDot: 'warm' as const,
                  // badge: dynamically set via useNavigationCounts (crm.properties.warm)
                  badgeVariant: 'warning' as const,
                },
                {
                  id: 'properties-cold',
                  label: 'Cold',
                  href: `${ROUTES.PROPERTIES.LIST}?leadTemperature=cold`,
                  statusDot: 'cold' as const,
                  // badge: dynamically set via useNavigationCounts (crm.properties.cold)
                  badgeVariant: 'default' as const,
                },
              ],
            },
            {
              id: 'site-visits',
              icon: MapPin,
              label: 'Site Visits',
              href: ROUTES.SITE_VISITS.LIST,
            },
          ],
        },
        {
          title: 'Pipeline',
          items: [
            {
              id: 'pipeline',
              icon: TrendingUp,
              label: 'Sales Funnel',
              href: ROUTES.PIPELINE.HOME,
            },
          ],
        },
        {
          title: 'Follow-ups',
          items: [
            {
              id: 'followups-today',
              icon: Clock,
              label: 'Today',
              href: ROUTES.FOLLOWUPS.LIST,
              // badge: dynamically set via useNavigationCounts (crm.followups.today)
              badgeVariant: 'warning' as const,
            },
            {
              id: 'followups-overdue',
              icon: Clock,
              label: 'Overdue',
              href: `${ROUTES.FOLLOWUPS.LIST}?filter=overdue`,
              // badge: dynamically set via useNavigationCounts (crm.followups.overdue)
              badgeVariant: 'error' as const,
            },
            {
              id: 'followups-upcoming',
              icon: Calendar,
              label: 'Upcoming',
              href: `${ROUTES.FOLLOWUPS.LIST}?filter=upcoming`,
            },
          ],
        },
      ],
    },

    quotes: {
      title: 'Quotations',
      sections: [
        {
          title: 'Quotes',
          items: [
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
              label: 'All Projects',
              href: ROUTES.PROJECTS.LIST,
              // badge: dynamically set via useNavigationCounts (projects.totalProjects)
              children: [
                {
                  id: 'projects-active',
                  label: 'Active',
                  href: `${ROUTES.PROJECTS.LIST}?status=in_progress`,
                  statusDot: 'active' as const,
                },
                {
                  id: 'projects-planning',
                  label: 'Planning',
                  href: `${ROUTES.PROJECTS.LIST}?status=planning`,
                  statusDot: 'planning' as const,
                },
                {
                  id: 'projects-on-hold',
                  label: 'On Hold',
                  href: `${ROUTES.PROJECTS.LIST}?status=on_hold`,
                  statusDot: 'on_hold' as const,
                },
                {
                  id: 'projects-completed',
                  label: 'Completed',
                  href: `${ROUTES.PROJECTS.LIST}?status=completed`,
                  statusDot: 'completed_project' as const,
                },
              ],
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
      // Sections per finance_module_v1 plan: OVERVIEW / LEDGERS / INSIGHTS.
      // Calendar item is labelled "Dues Calendar" to disambiguate from the
      // dashboard panel's existing /dashboard/calendar item.
      sections: [
        {
          title: 'OVERVIEW',
          items: [
            {
              id: 'finance-dashboard',
              icon: LayoutGrid,
              label: 'Dashboard',
              href: ROUTES.FINANCE.HOME,
            },
          ],
        },
        {
          title: 'LEDGERS',
          items: [
            {
              id: 'finance-receipts',
              icon: Receipt,
              label: 'Receipts',
              href: ROUTES.FINANCE.RECEIPTS,
            },
            {
              id: 'finance-expenses',
              icon: Banknote,
              label: 'Expenses',
              href: ROUTES.FINANCE.EXPENSES,
            },
            {
              id: 'finance-outstanding',
              icon: AlertCircle,
              label: 'Outstanding',
              href: ROUTES.FINANCE.OUTSTANDING,
            },
            {
              id: 'finance-calendar',
              icon: CalendarClock,
              label: 'Dues Calendar',
              href: ROUTES.FINANCE.CALENDAR,
            },
          ],
        },
        {
          title: 'INSIGHTS',
          items: [
            {
              id: 'finance-customers',
              icon: Users,
              label: 'Customers AR',
              href: ROUTES.FINANCE.CUSTOMERS,
            },
            {
              id: 'finance-vendors',
              icon: Truck,
              label: 'Vendors & Spend',
              href: ROUTES.FINANCE.VENDORS,
            },
            {
              id: 'finance-profitability',
              icon: TrendingUp,
              label: 'Profitability',
              href: ROUTES.FINANCE.PROFITABILITY,
            },
            {
              id: 'finance-reports',
              icon: FileBarChart,
              label: 'Reports',
              href: ROUTES.FINANCE.REPORTS,
            },
          ],
        },
      ],
    },

    service: {
      title: 'Service & AMC',
      sections: [
        {
          title: 'Tickets',
          items: [
            { id: 'all-service', icon: Wrench, label: 'All Tickets', href: ROUTES.SERVICE.HOME },
            {
              id: 'open-tickets',
              icon: Wrench,
              label: 'Open',
              href: `${ROUTES.SERVICE.HOME}?status=open`,
            },
          ],
        },
        {
          title: 'Contracts',
          items: [{ id: 'amc', icon: FileText, label: 'AMC Contracts', href: ROUTES.SERVICE.AMC }],
        },
      ],
    },

    analytics: {
      title: 'Analytics',
      sections: [
        {
          title: 'Reports',
          items: [
            {
              id: 'analytics-dashboard',
              icon: BarChart3,
              label: 'Dashboard',
              href: ROUTES.ANALYTICS.HOME,
            },
            {
              id: 'sales-report',
              icon: TrendingUp,
              label: 'Sales Report',
              href: ROUTES.ANALYTICS.SALES,
            },
            {
              id: 'projects-report',
              icon: FileText,
              label: 'Project Report',
              href: ROUTES.ANALYTICS.PROJECTS,
            },
          ],
        },
      ],
    },

    more: {
      title: 'More',
      sections: [
        {
          title: 'Organization',
          items: [
            { id: 'employees', icon: Users, label: 'Employees', href: ROUTES.ORG.EMPLOYEES },
            {
              id: 'organizations',
              icon: LayoutGrid,
              label: 'Organizations',
              href: ROUTES.ORG.ORGANIZATIONS,
            },
            { id: 'resellers', icon: Users, label: 'Resellers', href: ROUTES.ORG.RESELLERS },
          ],
        },
        {
          title: 'Documents',
          items: [
            { id: 'documents', icon: FileText, label: 'Documents', href: ROUTES.ORG.DOCUMENTS },
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
              id: 'general-settings',
              icon: Settings,
              label: 'General Settings',
              href: ROUTES.ADMIN.SETTINGS,
            },
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

/**
 * Check if a nav item is active based on current pathname
 */
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
