/**
 * Centralized Route Configuration
 * Single source of truth for all application routes and their parameters
 * 
 * To add a new route:
 * 1. Add the route path and params to ROUTE_PARAMS
 * 2. Add to ROUTES object for easy access
 * 
 * This file is imported by:
 * - useRoutes hook (for type-safe navigation)
 * - middleware.ts (for route protection)
 * - navigation.ts (references these paths)
 */

// ============================================
// Route Parameter Types
// ============================================

/**
 * Maps route paths to their expected parameters
 * - undefined = no params required
 * - object = typed params
 */
export interface RouteParams {
  // Auth routes
  '/': undefined;
  '/login': { redirect?: string };
  '/otp-verify': { phone?: string };
  '/forgot-password': undefined;
  '/reset-password': { token?: string };

  // Dashboard
  '/dashboard': undefined;
  '/dashboard/tasks': undefined;
  '/dashboard/calendar': undefined;
  '/dashboard/activity': undefined;

  // CRM / Leads
  '/crm': undefined;
  '/crm/leads': undefined;
  '/crm/leads/[id]': { id: string };
  '/crm/leads/new': undefined;
  '/crm/follow-ups': undefined;

  // Customers
  '/customers': undefined;
  '/customers/[id]': { id: string };
  '/customers/new': undefined;

  // Quotes
  '/quotes': { status?: 'draft' | 'sent' | 'accepted' | 'rejected' };
  '/quotes/[id]': { id: string };
  '/quotes/new': undefined;

  // Projects
  '/projects': { status?: 'active' | 'completed' | 'on-hold' };
  '/projects/[id]': { id: string };
  '/projects/new': undefined;
  '/projects/board': undefined;

  // Pipeline
  '/pipeline': undefined;

  // Site Visits
  '/site-visits': undefined;
  '/site-visits/[id]': { id: string };

  // Inventory
  '/inventory': { filter?: 'low-stock' };
  '/inventory/purchase-orders': undefined;

  // Vendors
  '/vendors': undefined;
  '/vendors/[id]': { id: string };

  // Finance
  '/finance': undefined;
  '/finance/invoices': undefined;
  '/finance/payments': undefined;
  '/finance/reports': undefined;

  // Service & AMC
  '/service': { status?: 'open' | 'closed' };
  '/service/amc': undefined;
  '/service/[id]': { id: string };

  // Analytics
  '/analytics': undefined;
  '/analytics/sales': undefined;
  '/analytics/projects': undefined;

  // Admin / Settings
  '/admin': undefined;
  '/settings': undefined;
  '/users': undefined;
  '/users/[id]': { id: string };
  '/workflows': undefined;
  '/integrations': undefined;
  '/audit': undefined;

  // Organization
  '/employees': undefined;
  '/employees/[id]': { id: string };
  '/organizations': undefined;
  '/resellers': undefined;
  '/documents': undefined;

  // Help
  '/help': undefined;
  '/help/docs': undefined;
  '/help/support': undefined;

  // More (overflow menu)
  '/more': undefined;
}

export type RoutePath = keyof RouteParams;

// ============================================
// Route Constants (for easy imports)
// ============================================

/**
 * Route path constants - use these instead of string literals
 * @example
 * import { ROUTES } from '@/lib/config/routes';
 * navigate(ROUTES.CUSTOMERS.LIST);
 */
export const ROUTES = {
  // Root
  HOME: '/' as const,

  // Auth
  AUTH: {
    LOGIN: '/login' as const,
    OTP_VERIFY: '/otp-verify' as const,
    FORGOT_PASSWORD: '/forgot-password' as const,
    RESET_PASSWORD: '/reset-password' as const,
  },

  // Dashboard
  DASHBOARD: {
    HOME: '/dashboard' as const,
    TASKS: '/dashboard/tasks' as const,
    CALENDAR: '/dashboard/calendar' as const,
    ACTIVITY: '/dashboard/activity' as const,
  },

  // CRM
  CRM: {
    HOME: '/crm' as const,
    LEADS: '/crm/leads' as const,
    LEAD_DETAIL: '/crm/leads/[id]' as const,
    LEAD_NEW: '/crm/leads/new' as const,
    FOLLOW_UPS: '/crm/follow-ups' as const,
  },

  // Customers
  CUSTOMERS: {
    LIST: '/customers' as const,
    DETAIL: '/customers/[id]' as const,
    NEW: '/customers/new' as const,
  },

  // Quotes
  QUOTES: {
    LIST: '/quotes' as const,
    DETAIL: '/quotes/[id]' as const,
    NEW: '/quotes/new' as const,
  },

  // Projects
  PROJECTS: {
    LIST: '/projects' as const,
    DETAIL: '/projects/[id]' as const,
    NEW: '/projects/new' as const,
    BOARD: '/projects/board' as const,
  },

  // Pipeline
  PIPELINE: {
    HOME: '/pipeline' as const,
  },

  // Site Visits
  SITE_VISITS: {
    LIST: '/site-visits' as const,
    DETAIL: '/site-visits/[id]' as const,
  },

  // Inventory
  INVENTORY: {
    LIST: '/inventory' as const,
    PURCHASE_ORDERS: '/inventory/purchase-orders' as const,
  },

  // Vendors
  VENDORS: {
    LIST: '/vendors' as const,
    DETAIL: '/vendors/[id]' as const,
  },

  // Finance
  FINANCE: {
    HOME: '/finance' as const,
    INVOICES: '/finance/invoices' as const,
    PAYMENTS: '/finance/payments' as const,
    REPORTS: '/finance/reports' as const,
  },

  // Service
  SERVICE: {
    HOME: '/service' as const,
    AMC: '/service/amc' as const,
    DETAIL: '/service/[id]' as const,
  },

  // Analytics
  ANALYTICS: {
    HOME: '/analytics' as const,
    SALES: '/analytics/sales' as const,
    PROJECTS: '/analytics/projects' as const,
  },

  // Admin
  ADMIN: {
    HOME: '/admin' as const,
    SETTINGS: '/settings' as const,
    USERS: '/users' as const,
    USER_DETAIL: '/users/[id]' as const,
    WORKFLOWS: '/workflows' as const,
    INTEGRATIONS: '/integrations' as const,
    AUDIT: '/audit' as const,
  },

  // Organization
  ORG: {
    EMPLOYEES: '/employees' as const,
    EMPLOYEE_DETAIL: '/employees/[id]' as const,
    ORGANIZATIONS: '/organizations' as const,
    RESELLERS: '/resellers' as const,
    DOCUMENTS: '/documents' as const,
  },

  // Help
  HELP: {
    HOME: '/help' as const,
    DOCS: '/help/docs' as const,
    SUPPORT: '/help/support' as const,
  },

  // More (overflow menu)
  MORE: {
    HOME: '/more' as const,
  },
} as const;

// ============================================
// Route Groups (for middleware/guards)
// ============================================

/** Routes that don't require authentication (fully public) */
export const PUBLIC_ROUTES: string[] = [
  '/not-found',
  '/favicon.ico',
];

/** Routes that are only for unauthenticated users (redirect if logged in) */
export const AUTH_ROUTES: RoutePath[] = [
  '/login',
  '/otp-verify',
  '/forgot-password',
  '/reset-password',
];

/** Routes that require admin role */
export const ADMIN_ROUTES: RoutePath[] = [
  '/users',
  '/settings',
  '/workflows',
  '/integrations',
  '/audit',
];

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
  params?: RouteParams[T] extends undefined ? undefined : Partial<RouteParams[T]>,
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
