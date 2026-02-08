import {
  BarChart3,
  Box,
  Calendar,
  CheckSquare,
  FileText,
  Folder,
  HelpCircle,
  Home,
  LayoutGrid,
  List,
  ListTodo,
  MoreHorizontal,
  Plus,
  Settings,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
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
      href: '/dashboard',
      panelKey: 'dashboard',
    },
    {
      id: 'crm',
      icon: Users,
      label: 'Sales & CRM',
      href: '/crm',
      panelKey: 'crm',
      badge: 12,
    },
    {
      id: 'quotes',
      icon: FileText,
      label: 'Quotations',
      href: '/quotes',
      panelKey: 'quotes',
    },
    {
      id: 'projects',
      icon: Folder,
      label: 'Projects',
      href: '/projects',
      panelKey: 'projects',
    },
    {
      id: 'inventory',
      icon: Box,
      label: 'Inventory',
      href: '/inventory',
      panelKey: 'inventory',
    },
    {
      id: 'finance',
      icon: Wallet,
      label: 'Finance',
      href: '/finance',
      panelKey: 'finance',
    },
    {
      id: 'service',
      icon: Wrench,
      label: 'Service & AMC',
      href: '/service',
      panelKey: 'service',
    },
    {
      id: 'analytics',
      icon: BarChart3,
      label: 'Analytics',
      href: '/analytics',
      panelKey: 'analytics',
    },
    {
      id: 'more',
      icon: MoreHorizontal,
      label: 'More',
      href: '/more',
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
      href: '/help',
      panelKey: 'help',
    },
    {
      id: 'admin',
      icon: Settings,
      label: 'Admin',
      href: '/admin',
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
            { id: 'dashboard', icon: Home, label: 'Dashboard', href: '/dashboard' },
            { id: 'tasks', icon: CheckSquare, label: 'My Tasks', href: '/dashboard/tasks' },
            { id: 'calendar', icon: Calendar, label: 'Calendar', href: '/dashboard/calendar' },
          ],
        },
        {
          title: 'Views',
          items: [
            { id: 'overview', icon: LayoutGrid, label: 'Overview', href: '/dashboard' },
            { id: 'activity', icon: TrendingUp, label: 'Activity Feed', href: '/dashboard/activity' },
          ],
        },
      ],
    },

    crm: {
      title: 'Sales & CRM',
      sections: [
        {
          title: 'Pipeline',
          items: [
            { id: 'leads', icon: Users, label: 'Leads', href: '/crm/leads', badge: 12 },
            { id: 'customers', icon: Users, label: 'Customers', href: '/customers' },
            { id: 'pipeline', icon: TrendingUp, label: 'Pipeline View', href: '/pipeline' },
          ],
        },
        {
          title: 'Activities',
          items: [
            { id: 'follow-ups', icon: ListTodo, label: 'Follow-ups', href: '/crm/follow-ups' },
            { id: 'site-visits', icon: Calendar, label: 'Site Visits', href: '/site-visits' },
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
            { id: 'all-quotes', icon: FileText, label: 'All Quotes', href: '/quotes' },
            { id: 'drafts', icon: FileText, label: 'Drafts', href: '/quotes?status=draft' },
            { id: 'sent', icon: FileText, label: 'Sent', href: '/quotes?status=sent' },
          ],
        },
        {
          title: 'Actions',
          items: [
            { id: 'new-quote', icon: Plus, label: 'New Quote', href: '/quotes/new' },
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
            { id: 'all-projects', icon: List, label: 'All Projects', href: '/projects' },
            { id: 'active', icon: TrendingUp, label: 'Active', href: '/projects?status=active' },
            { id: 'board', icon: LayoutGrid, label: 'Board View', href: '/projects/board' },
          ],
        },
        {
          title: 'Actions',
          items: [
            { id: 'new-project', icon: Plus, label: 'New Project', href: '/projects/new' },
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
            { id: 'all-inventory', icon: Box, label: 'All Items', href: '/inventory' },
            { id: 'low-stock', icon: Box, label: 'Low Stock', href: '/inventory?filter=low-stock' },
          ],
        },
        {
          title: 'Management',
          items: [
            { id: 'vendors', icon: Users, label: 'Vendors', href: '/vendors' },
            { id: 'purchase-orders', icon: FileText, label: 'Purchase Orders', href: '/inventory/purchase-orders' },
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
            { id: 'all-finance', icon: Wallet, label: 'Overview', href: '/finance' },
            { id: 'invoices', icon: FileText, label: 'Invoices', href: '/finance/invoices' },
            { id: 'payments', icon: Wallet, label: 'Payments', href: '/finance/payments' },
          ],
        },
        {
          title: 'Reports',
          items: [
            { id: 'finance-reports', icon: BarChart3, label: 'Reports', href: '/finance/reports' },
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
            { id: 'all-service', icon: Wrench, label: 'All Tickets', href: '/service' },
            { id: 'open-tickets', icon: Wrench, label: 'Open', href: '/service?status=open' },
          ],
        },
        {
          title: 'Contracts',
          items: [
            { id: 'amc', icon: FileText, label: 'AMC Contracts', href: '/service/amc' },
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
            { id: 'analytics-dashboard', icon: BarChart3, label: 'Dashboard', href: '/analytics' },
            { id: 'sales-report', icon: TrendingUp, label: 'Sales Report', href: '/analytics/sales' },
            { id: 'projects-report', icon: FileText, label: 'Project Report', href: '/analytics/projects' },
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
            { id: 'employees', icon: Users, label: 'Employees', href: '/employees' },
            { id: 'organizations', icon: LayoutGrid, label: 'Organizations', href: '/organizations' },
            { id: 'resellers', icon: Users, label: 'Resellers', href: '/resellers' },
          ],
        },
        {
          title: 'Documents',
          items: [
            { id: 'documents', icon: FileText, label: 'Documents', href: '/documents' },
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
            { id: 'documentation', icon: FileText, label: 'Documentation', href: '/help/docs' },
            { id: 'support', icon: HelpCircle, label: 'Contact Support', href: '/help/support' },
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
            { id: 'general-settings', icon: Settings, label: 'General Settings', href: '/settings' },
            { id: 'user-management', icon: Users, label: 'User Management', href: '/users' },
          ],
        },
        {
          title: 'System',
          items: [
            { id: 'workflows', icon: LayoutGrid, label: 'Workflows', href: '/workflows' },
            { id: 'integrations', icon: Settings, label: 'Integrations', href: '/integrations' },
            { id: 'audit', icon: FileText, label: 'Audit Log', href: '/audit' },
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
    (item) => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
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
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/';
  }
  return pathname.startsWith(href);
}
