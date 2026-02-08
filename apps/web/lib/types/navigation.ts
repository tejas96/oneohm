import type { LucideIcon } from 'lucide-react';

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
export type UserRole = 'admin' | 'manager' | 'sales' | 'field_worker' | 'viewer';

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
  /** Nested sub-items (Level 4 navigation) */
  children?: NavItem[];
  /** Use exact path matching instead of prefix */
  exactMatch?: boolean;
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
  
  if (cleanHref === '/dashboard') {
    return cleanPathname === '/dashboard' || cleanPathname === '/';
  }
  
  return cleanPathname.startsWith(cleanHref);
};

/** Exact path matcher - checks exact match (ignores query params) */
export const exactPathMatcher: PathMatcher = (pathname, href) => {
  const cleanPathname = pathname.split('?')[0] ?? pathname;
  const cleanHref = href.split('?')[0] ?? href;
  return cleanPathname === cleanHref;
};

/**
 * Filter navigation items by user role
 * Returns items the user has access to
 */
export function filterByRole<T extends { roles?: UserRole[] }>(
  items: T[],
  userRole: UserRole
): T[] {
  return items.filter((item) => {
    // No roles specified = accessible to all
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    return item.roles.includes(userRole);
  });
}

/**
 * Check if user has access to a nav item
 */
export function hasAccess(
  item: { roles?: UserRole[] },
  userRole: UserRole
): boolean {
  if (!item.roles || item.roles.length === 0) {
    return true;
  }
  return item.roles.includes(userRole);
}
