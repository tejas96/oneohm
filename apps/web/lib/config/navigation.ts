import {
  BarChart3,
  Box,
  Building2,
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  Folder,
  HelpCircle,
  Home,
  LayoutGrid,
  List,
  MapPin,
  MoreHorizontal,
  Plus,
  Settings,
  TrendingUp,
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
      href: ROUTES.PROJECTS.LIST,
      panelKey: 'projects',
    },
    {
      id: 'inventory',
      icon: Box,
      label: 'Inventory',
      href: ROUTES.INVENTORY.LIST,
      panelKey: 'inventory',
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
            { id: 'activity', icon: TrendingUp, label: 'Activity Feed', href: ROUTES.DASHBOARD.ACTIVITY },
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
                  href: `${ROUTES.PROPERTIES.LIST}?temp=hot`,
                  statusDot: 'hot' as const,
                  // badge: dynamically set via useNavigationCounts (crm.properties.hot)
                  badgeVariant: 'error' as const,
                },
                {
                  id: 'properties-warm',
                  label: 'Warm',
                  href: `${ROUTES.PROPERTIES.LIST}?temp=warm`,
                  statusDot: 'warm' as const,
                  // badge: dynamically set via useNavigationCounts (crm.properties.warm)
                  badgeVariant: 'warning' as const,
                },
                {
                  id: 'properties-cold',
                  label: 'Cold',
                  href: `${ROUTES.PROPERTIES.LIST}?temp=cold`,
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
            { id: 'all-quotes', icon: FileText, label: 'All Quotes', href: ROUTES.QUOTES.LIST },
            { id: 'drafts', icon: FileText, label: 'Drafts', href: `${ROUTES.QUOTES.LIST}?status=draft` },
            { id: 'sent', icon: FileText, label: 'Sent', href: `${ROUTES.QUOTES.LIST}?status=sent` },
          ],
        },
        {
          title: 'Actions',
          items: [
            { id: 'new-quote', icon: Plus, label: 'New Quote', href: ROUTES.QUOTES.NEW, exactMatch: true },
          ],
        },
      ],
    },

    projects: {
      title: 'Projects',
      sections: [
        {
          title: 'Views',
          items: [
            { id: 'all-projects', icon: List, label: 'All Projects', href: ROUTES.PROJECTS.LIST },
            { id: 'active', icon: TrendingUp, label: 'Active', href: `${ROUTES.PROJECTS.LIST}?status=active` },
            { id: 'board', icon: LayoutGrid, label: 'Board View', href: ROUTES.PROJECTS.BOARD },
          ],
        },
        {
          title: 'Actions',
          items: [
            { id: 'new-project', icon: Plus, label: 'New Project', href: ROUTES.PROJECTS.NEW, exactMatch: true },
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
            { id: 'all-inventory', icon: Box, label: 'All Items', href: ROUTES.INVENTORY.LIST },
            { id: 'low-stock', icon: Box, label: 'Low Stock', href: `${ROUTES.INVENTORY.LIST}?filter=low-stock` },
          ],
        },
        {
          title: 'Management',
          items: [
            { id: 'vendors', icon: Users, label: 'Vendors', href: ROUTES.VENDORS.LIST },
            { id: 'purchase-orders', icon: FileText, label: 'Purchase Orders', href: ROUTES.INVENTORY.PURCHASE_ORDERS },
          ],
        },
      ],
    },

    finance: {
      title: 'Finance',
      sections: [
        {
          title: 'Transactions',
          items: [
            { id: 'all-finance', icon: Wallet, label: 'Overview', href: ROUTES.FINANCE.HOME },
            { id: 'invoices', icon: FileText, label: 'Invoices', href: ROUTES.FINANCE.INVOICES },
            { id: 'payments', icon: Wallet, label: 'Payments', href: ROUTES.FINANCE.PAYMENTS },
          ],
        },
        {
          title: 'Reports',
          items: [
            { id: 'finance-reports', icon: BarChart3, label: 'Reports', href: ROUTES.FINANCE.REPORTS },
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
            { id: 'open-tickets', icon: Wrench, label: 'Open', href: `${ROUTES.SERVICE.HOME}?status=open` },
          ],
        },
        {
          title: 'Contracts',
          items: [
            { id: 'amc', icon: FileText, label: 'AMC Contracts', href: ROUTES.SERVICE.AMC },
          ],
        },
      ],
    },

    analytics: {
      title: 'Analytics',
      sections: [
        {
          title: 'Reports',
          items: [
            { id: 'analytics-dashboard', icon: BarChart3, label: 'Dashboard', href: ROUTES.ANALYTICS.HOME },
            { id: 'sales-report', icon: TrendingUp, label: 'Sales Report', href: ROUTES.ANALYTICS.SALES },
            { id: 'projects-report', icon: FileText, label: 'Project Report', href: ROUTES.ANALYTICS.PROJECTS },
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
            { id: 'organizations', icon: LayoutGrid, label: 'Organizations', href: ROUTES.ORG.ORGANIZATIONS },
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
            { id: 'support', icon: HelpCircle, label: 'Contact Support', href: ROUTES.HELP.SUPPORT },
          ],
        },
      ],
    },

    admin: {
      title: 'Admin',
      sections: [
        {
          title: 'Settings',
          items: [
            {
              id: 'general-settings',
              icon: Settings,
              label: 'General Settings',
              href: ROUTES.ADMIN.SETTINGS,
            },
            {
              id: 'user-management',
              icon: Users,
              label: 'User Management',
              href: ROUTES.ADMIN.USERS,
            },
          ],
        },
        {
          title: 'System',
          items: [
            {
              id: 'workflows',
              icon: LayoutGrid,
              label: 'Workflows',
              href: ROUTES.ADMIN.WORKFLOWS,
            },
            {
              id: 'integrations',
              icon: Settings,
              label: 'Integrations',
              href: ROUTES.ADMIN.INTEGRATIONS,
            },
            {
              id: 'audit',
              icon: FileText,
              label: 'Audit Log',
              href: ROUTES.ADMIN.AUDIT,
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
    (item) => pathname === item.href || (item.href !== ROUTES.DASHBOARD.HOME && pathname.startsWith(item.href))
  );

  const panelConfig = matchedItem
    ? navigationConfig.panels[matchedItem.panelKey]
    : undefined;

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
