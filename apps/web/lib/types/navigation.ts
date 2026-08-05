import type { LucideIcon } from 'lucide-react';

import { ROUTES } from '@/lib/config/routes';

import type { FeatureAccessKey } from '@/lib/access-control/feature-policy';

/**
 * Navigation Types for OneOhm EPC Web
 */

export type NavBadgeVariant = 'default' | 'primary' | 'warning' | 'error' | 'success' | 'info';

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

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: number | string;
  badgeVariant?: NavBadgeVariant;
  statusDot?: StatusDotColor;
  disabled?: boolean;
  external?: boolean;
  description?: string;
  shortcut?: string;
  order?: number;
  feature?: FeatureAccessKey;
  isAllowed?: boolean;
  children?: NavItem[];
  exactMatch?: boolean;
  isSubItem?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export interface RailNavItem extends NavItem {
  panelKey: string;
}

export interface PanelConfig {
  title: string;
  sections: NavSection[];
}

export interface NavigationConfig {
  railTop: RailNavItem[];
  railBottom: RailNavItem[];
  panels: Record<string, PanelConfig>;
}

export type PathMatcher = (pathname: string, href: string, exactMatch?: boolean) => boolean;

export const defaultPathMatcher: PathMatcher = (pathname, href, exactMatch = false) => {
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

export const exactPathMatcher: PathMatcher = (pathname, href) => {
  const cleanPathname = pathname.split('?')[0] ?? pathname;
  const cleanHref = href.split('?')[0] ?? href;
  return cleanPathname === cleanHref;
};
