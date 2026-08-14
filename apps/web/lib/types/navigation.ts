import type { LucideIcon } from 'lucide-react';

import { ROUTES } from '@/lib/config/routes';
import type { Gate } from '@/lib/rbac/catalog';

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

/**
 * There is no `UserRole` union any more.
 *
 * Roles are created at runtime by the superadmin, so a fixed list of role
 * names in the type system was always going to be wrong — and it was: it
 * carried `manager`, `sales` and `viewer`, none of which existed in the
 * database. Navigation gates on a permission `Gate` instead.
 */

/** Badge variants for navigation items */
export type NavBadgeVariant = 'default' | 'primary' | 'warning' | 'error' | 'success' | 'info';

/** Status dot colors for lead temperature and project status indicators */
export type StatusDotColor =
  | 'hot'
  | 'warm'
  | 'cold'
  | 'active'
  | 'planning'
  | 'on_hold'
  | 'completed_project'
  | 'cancelled'
  | 'overdue'
  | 'at_risk';

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
  /**
   * What the user needs to use this item. **Required, deliberately.**
   *
   * Making it optional would let a new nav item ship ungated and nobody would
   * notice. Because it is required, adding one without a gate fails
   * `npm run typecheck` — the compiler is the checklist. Use `ALWAYS_OPEN`
   * when an item genuinely should be open to everyone.
   */
  permission: Gate;
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
  /** What the user needs to see this section. Required — see NavItem. */
  permission: Gate;
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

/**
 * A nav item annotated with whether the current user may use it.
 *
 * Blocked items are kept and marked, not dropped. Hiding them would mean a
 * user cannot discover what exists and therefore cannot know what to ask a
 * superadmin for — the whole reason the access dialog exists.
 */
export type Gated<T> = T & { allowed: boolean };

/** The `role` variants are gone. There is one question now: does this gate open? */
export function hasAccess(item: { permission: Gate }, can: (gate: Gate) => boolean): boolean {
  return can(item.permission);
}

/** Annotate items with `allowed` rather than filtering them out. */
export function annotateAccess<T extends { permission: Gate }>(
  items: T[],
  can: (gate: Gate) => boolean,
): Gated<T>[] {
  return items.map((item) => ({ ...item, allowed: can(item.permission) }));
}
