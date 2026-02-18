/**
 * Centralized Route Configuration
 * TRUE Single source of truth - paths defined ONCE in ROUTES, types derived automatically
 * 
 * To add a new route:
 * 1. Add path to ROUTES object
 * 2. If it has params, add to ROUTE_PARAM_TYPES
 * 
 * This file is imported by:
 * - useRoutes hook (for type-safe navigation)
 * - middleware.ts (for route protection)
 * - navigation.ts (references these paths)
 */

// ============================================
// Route Constants (SINGLE SOURCE OF TRUTH)
// ============================================

/**
 * All route paths defined ONCE here
 * @example
 * import { ROUTES } from '@/lib/config/routes';
 * navigate(ROUTES.CUSTOMERS.LIST);
 */
export const ROUTES = {
  // Root
  HOME: '/',

  // Auth
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    OTP_VERIFY: '/otp-verify',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
  },

  // Dashboard
  DASHBOARD: {
    HOME: '/dashboard',
    TASKS: '/dashboard/tasks',
    CALENDAR: '/dashboard/calendar',
    ACTIVITY: '/dashboard/activity',
  },

  // CRM
  CRM: {
    HOME: '/crm',
    LEADS: '/crm/leads',
    LEAD_DETAIL: '/crm/leads/[id]',
    LEAD_NEW: '/crm/leads/new',
    FOLLOW_UPS: '/crm/follow-ups',
  },

  // Customers
  CUSTOMERS: {
    LIST: '/customers',
    DETAIL: '/customers/[id]',
    NEW: '/customers/new',
    EDIT: '/customers/[id]/edit',
    ADD_PROPERTY: '/customers/[id]/properties/new',
  },

  // Quotes
  QUOTES: {
    LIST: '/quotes',
    DETAIL: '/quotes/[id]',
    NEW: '/quotes/new',
  },

  // Projects
  PROJECTS: {
    DASHBOARD: '/projects',
    LIST: '/projects/list',
    DETAIL: '/projects/[id]',
    NEW: '/projects/new',
    BOARD: '/projects/board',
    MY_TASKS: '/projects/my-tasks',
    TIMELINE: '/projects/timeline',
    TASK_TEMPLATES: '/projects/task-templates',
  },

  // Pipeline
  PIPELINE: {
    HOME: '/pipeline',
  },

  // Properties
  PROPERTIES: {
    LIST: '/properties',
    DETAIL: '/properties/[id]',
    NEW: '/properties/new',
    EDIT: '/properties/[id]/edit',
  },

  // Followups
  FOLLOWUPS: {
    LIST: '/followups',
    NEW: '/followups/new',
    EDIT: '/followups/[id]/edit',
  },

  // Site Visits
  SITE_VISITS: {
    LIST: '/site-visits',
    DETAIL: '/site-visits/[id]',
    NEW: '/site-visits/new',
  },

  // Inventory
  INVENTORY: {
    LIST: '/inventory',
    PURCHASE_ORDERS: '/inventory/purchase-orders',
  },

  // Vendors
  VENDORS: {
    LIST: '/vendors',
    DETAIL: '/vendors/[id]',
  },

  // Finance
  FINANCE: {
    HOME: '/finance',
    INVOICES: '/finance/invoices',
    PAYMENTS: '/finance/payments',
    REPORTS: '/finance/reports',
  },

  // Service
  SERVICE: {
    HOME: '/service',
    AMC: '/service/amc',
    DETAIL: '/service/[id]',
  },

  // Analytics
  ANALYTICS: {
    HOME: '/analytics',
    SALES: '/analytics/sales',
    PROJECTS: '/analytics/projects',
  },

  // User Account
  ACCOUNT: {
    PROFILE: '/profile',
    SETTINGS: '/settings',
  },

  // Admin
  ADMIN: {
    HOME: '/admin',
    SETTINGS: '/admin/settings',
    USERS: '/users',
    USER_DETAIL: '/users/[id]',
    WORKFLOWS: '/workflows',
    INTEGRATIONS: '/integrations',
    AUDIT: '/audit',
  },

  // Organization
  ORG: {
    EMPLOYEES: '/employees',
    EMPLOYEE_DETAIL: '/employees/[id]',
    ORGANIZATIONS: '/organizations',
    RESELLERS: '/resellers',
    DOCUMENTS: '/documents',
  },

  // Help
  HELP: {
    HOME: '/help',
    DOCS: '/help/docs',
    SUPPORT: '/help/support',
  },

  // More (overflow menu)
  MORE: {
    HOME: '/more',
  },
} as const;

// ============================================
// Type Derivation (Auto-generated from ROUTES)
// ============================================

/** Extract all route paths from ROUTES object */
type ExtractPaths<T> = T extends string
  ? T
  : T extends object
    ? { [K in keyof T]: ExtractPaths<T[K]> }[keyof T]
    : never;

/** All valid route paths (derived from ROUTES) */
export type RoutePath = ExtractPaths<typeof ROUTES>;

/** 
 * Route parameter types - only define for routes WITH params
 * Routes not listed here have no required params
 */
export interface RouteParamTypes {
  // Auth
  '/login': { redirect?: string };
  '/otp-verify': { phone?: string };
  '/reset-password': { token?: string };
  
  // Dynamic routes with [id]
  '/crm/leads/[id]': { id: string };
  '/customers/[id]': { id: string };
  '/customers/[id]/edit': { id: string };
  '/customers/[id]/properties/new': { id: string };
  '/quotes/[id]': { id: string };
  '/projects/[id]': { id: string };
  '/properties/[id]': { id: string };
  '/properties/[id]/edit': { id: string };
  '/followups/[id]/edit': { id: string };
  '/site-visits/[id]': { id: string };
  '/vendors/[id]': { id: string };
  '/service/[id]': { id: string };
  '/users/[id]': { id: string };
  '/employees/[id]': { id: string };
  
  // Routes with query filters
  '/quotes': { status?: 'draft' | 'sent' | 'accepted' | 'rejected' };
  '/projects/list': { status?: 'active' | 'planning' | 'on_hold' | 'completed'; filter?: string };
  '/inventory': { filter?: 'low-stock' };
  '/service': { status?: 'open' | 'closed' };
}

/** Get params for a route path (undefined if no params) */
export type RouteParams<T extends RoutePath> = T extends keyof RouteParamTypes
  ? RouteParamTypes[T]
  : undefined;

// ============================================
// Route Groups (for middleware/guards)
// ============================================

/** Routes that don't require authentication (fully public) */
export const PUBLIC_ROUTES: string[] = [
  '/not-found',
  '/favicon.ico',
];

/** Routes that are only for unauthenticated users (redirect if logged in) */
export const AUTH_ROUTES = [
  ROUTES.AUTH.LOGIN,
  ROUTES.AUTH.OTP_VERIFY,
  ROUTES.AUTH.FORGOT_PASSWORD,
  ROUTES.AUTH.RESET_PASSWORD,
] as const;

/** Routes that require admin role */
export const ADMIN_ROUTES = [
  ROUTES.ADMIN.USERS,
  ROUTES.ADMIN.SETTINGS,
  ROUTES.ADMIN.WORKFLOWS,
  ROUTES.ADMIN.INTEGRATIONS,
  ROUTES.ADMIN.AUDIT,
] as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Build a URL from a route path and params
 * @example
 * buildRoute('/customers/[id]', { id: '123' }) // '/customers/123'
 * buildRoute('/quotes', undefined, { status: 'draft' }) // '/quotes?status=draft'
 */
export function buildRoute<T extends RoutePath>(
  path: T,
  params?: RouteParams<T> extends undefined ? undefined : Partial<RouteParams<T>>,
  query?: Record<string, string | number | boolean | undefined>
): string {
  let url = path as string;

  // Replace path params like [id] with actual values
  if (params) {
    Object.entries(params as Record<string, string | number>).forEach(([key, value]) => {
      url = url.replace(`[${key}]`, String(value));
    });
  }

  // Add query params
  if (query) {
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  return url;
}

/**
 * Check if a path matches a route pattern
 * @example
 * matchRoute('/customers/123', '/customers/[id]') // true
 */
export function matchRoute(pathname: string, pattern: RoutePath): boolean {
  const patternParts = pattern.split('/');
  const pathParts = pathname.split('/');

  if (patternParts.length !== pathParts.length) {
    return false;
  }

  return patternParts.every((part, i) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return true; // Dynamic segment matches anything
    }
    return part === pathParts[i];
  });
}

/**
 * Extract params from a path based on a route pattern
 * @example
 * extractParams('/customers/123', '/customers/[id]') // { id: '123' }
 */
export function extractParams(
  pathname: string,
  pattern: RoutePath
): Record<string, string> | null {
  const patternParts = pattern.split('/');
  const pathParts = pathname.split('/');

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart === undefined || pathPart === undefined) {
      return null;
    }

    if (patternPart.startsWith('[') && patternPart.endsWith(']')) {
      const paramName = patternPart.slice(1, -1);
      params[paramName] = pathPart;
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}

// ============================================
// Route to Panel Mapping
// ============================================
/**
 * Maps route prefixes to their corresponding panel keys.
 * Used by the sidebar to determine which panel to show based on current route.
 * Uses ROUTES constants to avoid hardcoded paths (DRY principle).
 * Order matters - more specific routes should come first.
 */
export const ROUTE_TO_PANEL_MAP: Record<string, string> = {
  // CRM routes (all should show CRM panel)
  [ROUTES.CUSTOMERS.LIST]: 'crm',
  [ROUTES.PROPERTIES.LIST]: 'crm',
  [ROUTES.SITE_VISITS.LIST]: 'crm',
  [ROUTES.FOLLOWUPS.LIST]: 'crm',
  [ROUTES.PIPELINE.HOME]: 'crm',
  [ROUTES.CRM.HOME]: 'crm',
  
  // Quotes routes
  [ROUTES.QUOTES.LIST]: 'quotes',
  
  // Projects routes
  [ROUTES.PROJECTS.DASHBOARD]: 'projects',
  
  // Inventory routes
  [ROUTES.INVENTORY.LIST]: 'inventory',
  [ROUTES.INVENTORY.PURCHASE_ORDERS]: 'inventory',
  
  // Finance routes
  [ROUTES.FINANCE.HOME]: 'finance',
  [ROUTES.FINANCE.INVOICES]: 'finance',
  [ROUTES.FINANCE.PAYMENTS]: 'finance',
  
  // Service routes
  [ROUTES.SERVICE.HOME]: 'service',
  [ROUTES.SERVICE.AMC]: 'service',
  
  // Analytics routes
  [ROUTES.ANALYTICS.HOME]: 'analytics',
  
  // More/Settings routes
  [ROUTES.ACCOUNT.SETTINGS]: 'more',
  [ROUTES.MORE.HOME]: 'more',
  
  // Help routes
  [ROUTES.HELP.HOME]: 'help',
  
  // Admin routes
  [ROUTES.ADMIN.HOME]: 'admin',
  
  // Dashboard (default)
  [ROUTES.DASHBOARD.HOME]: 'dashboard',
};

/**
 * Get the panel key for a given pathname.
 * Returns 'dashboard' as fallback if no match found.
 */
export function getPanelKeyForPath(pathname: string): string {
  // Sort keys by length (descending) to match most specific route first
  const sortedKeys = Object.keys(ROUTE_TO_PANEL_MAP).sort((a, b) => b.length - a.length);
  
  for (const prefix of sortedKeys) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`)) {
      return ROUTE_TO_PANEL_MAP[prefix] ?? 'dashboard';
    }
  }
  
  return 'dashboard';
}
