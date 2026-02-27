import type { LucideIcon } from 'lucide-react';

import { ROUTES } from '@/lib/config/routes';

/**
 * Navigation Types for OneOhm EPC Web
 * Defines structure for Rail and Panel navigation
 * 
 * HIERARCHY:
 * - Rail (Level 1): Top-level icon navigation
 * - Panel Sections (Level 2): Grouped sections with headers
 * - Panel Items (Level 3): Navigation links within sections
 * - Sub-Items (Level 4): Nested items under panel items (expandable)
 */

/** User roles for access control */
export type UserRole = 'admin' | 'super_admin' | 'platform_admin' | 'manager' | 'sales' | 'field_worker' | 'viewer';

/** Badge variants for navigation items */
export type NavBadgeVariant = 'default' | 'primary' | 'warning' | 'error' | 'success' | 'info';

/** Status dot colors for lead temperature and project status indicators */
export type StatusDotColor = 'hot' | 'warm' | 'cold' | 'active' | 'planning' | 'on_hold' | 'completed_project';

/** Base navigation item */
export interface NavItem {
  /** Unique identifier for the nav item */
  id: string;
  /** Display label */
  label: string;
  /** Route path */
  href: string;
  /** Lucide icon component */
  icon?: LucideIcon;
  /** Optional badge count/text */
  badge?: number | string;
  /** Badge variant for color styling */
  badgeVariant?: NavBadgeVariant;
  /** Status dot color (for lead temperature indicators) */
  statusDot?: StatusDotColor;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** External link (opens in new tab) */
  external?: boolean;
  /** Tooltip/description text */
  description?: string;
  /** Keyboard shortcut display (e.g., "⌘K") */
  shortcut?: string;
  /** Explicit ordering (lower = first) */
  order?: number;
  /** Roles that can see this item (empty = all roles) */
  roles?: UserRole[];
  /** Permissions required to see this item (any of these) */
  permissions?: string[];
  /** Nested sub-items (Level 4 navigation) */
  children?: NavItem[];
  /** Use exact path matching instead of prefix */
  exactMatch?: boolean;
  /** Whether this is a sub-item (visually indented, smaller) */
  isSubItem?: boolean;
}

/** Navigation section with grouped items */
export interface NavSection {
  /** Section title (displayed as header) */
  title: string;
  /** Items within this section */
  items: NavItem[];
  /** Whether section is collapsible */
  collapsible?: boolean;
  /** Default collapsed state (if collapsible) */
  defaultCollapsed?: boolean;
  /** Roles that can see this section */
  roles?: UserRole[];
  /** Permissions required to see this section (any of these) */
  permissions?: string[];
}

/** Rail navigation item (top-level icons) */
export interface RailNavItem extends NavItem {
  /** Panel configuration key (maps to panel content) */
  panelKey: string;
}

/** Panel configuration for a rail item */
export interface PanelConfig {
  /** Panel header title */
  title: string;
  /** Sections within the panel */
  sections: NavSection[];
}

/** Complete navigation configuration */
export interface NavigationConfig {
  /** Rail items (top section) */
  railTop: RailNavItem[];
  /** Rail items (bottom section - settings, help, etc.) */
  railBottom: RailNavItem[];
  /** Panel content configurations keyed by panelKey */
  panels: Record<string, PanelConfig>;
}

/** Function to check if a path matches a nav item */
export type PathMatcher = (pathname: string, href: string, exactMatch?: boolean) => boolean;

/** Default path matcher - checks if pathname starts with href */
export const defaultPathMatcher: PathMatcher = (pathname, href, exactMatch = false) => {
  // Strip query params for comparison
  const cleanPathname = pathname.split('?')[0] ?? pathname;
  const cleanHref = href.split('?')[0] ?? href;
  
  if (exactMatch) {
    return cleanPathname === cleanHref;
  }
  
  if (cleanHref === ROUTES.DASHBOARD.HOME) {
    return cleanPathname === ROUTES.DASHBOARD.HOME || cleanPathname === ROUTES.HOME;
  }
  
  return cleanPathname.startsWith(cleanHref);
};

/** Exact path matcher - checks exact match (ignores query params) */
export const exactPathMatcher: PathMatcher = (pathname, href) => {
  const cleanPathname = pathname.split('?')[0] ?? pathname;
  const cleanHref = href.split('?')[0] ?? href;
  return cleanPathname === cleanHref;
};

/** User access context for filtering navigation */
export interface UserAccessContext {
  roles: string[];
  permissions: string[];
}

/**
 * Filter navigation items by user roles and permissions
 * Returns items the user has access to
 */
export function filterByAccess<T extends { roles?: UserRole[]; permissions?: string[] }>(
  items: T[],
  userAccess: UserAccessContext
): T[] {
  return items.filter((item) => hasAccess(item, userAccess));
}

/**
 * Check if user has access to a nav item based on roles and permissions
 * - If no roles/permissions specified = accessible to all
 * - If roles specified = user must have at least one role
 * - If permissions specified = user must have at least one permission
 * - If both specified = user must satisfy BOTH conditions
 */
export function hasAccess(
  item: { roles?: UserRole[]; permissions?: string[] },
  userAccess: UserAccessContext
): boolean {
  const hasRoleRequirement = item.roles && item.roles.length > 0;
  const hasPermissionRequirement = item.permissions && item.permissions.length > 0;

  // No requirements = accessible to all
  if (!hasRoleRequirement && !hasPermissionRequirement) {
    return true;
  }

  // Check role requirement
  let roleMatch = true;
  if (hasRoleRequirement) {
    roleMatch = item.roles!.some((role) => userAccess.roles.includes(role));
  }

  // Check permission requirement
  let permissionMatch = true;
  if (hasPermissionRequirement) {
    permissionMatch = item.permissions!.some((perm) => userAccess.permissions.includes(perm));
  }

  // Must satisfy both if both are specified
  return roleMatch && permissionMatch;
}

/**
 * @deprecated Use filterByAccess instead
 * Filter navigation items by user role only
 */
export function filterByRole<T extends { roles?: UserRole[] }>(
  items: T[],
  userRole: UserRole
): T[] {
  return items.filter((item) => {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    return item.roles.includes(userRole);
  });
}
