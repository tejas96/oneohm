'use client';

import { useMemo } from 'react';

import { navigationConfig } from '@/lib/config/navigation';
import { getPanelKeyForPath } from '@/lib/config/routes';
import {
  type NavItem,
  type NavSection,
  type NavigationConfig,
  type PanelConfig,
  type RailNavItem,
  type UserAccessContext,
  type UserRole,
 hasAccess } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

/**
 * Filter navigation items recursively
 */
function filterNavItems(items: NavItem[], userAccess: UserAccessContext): NavItem[] {
  return items
    .filter((item) => hasAccess(item, userAccess))
    .map((item) => ({
      ...item,
      children: item.children ? filterNavItems(item.children, userAccess) : undefined,
    }));
}

/**
 * Filter navigation sections
 */
function filterNavSections(sections: NavSection[], userAccess: UserAccessContext): NavSection[] {
  return sections
    .filter((section) => hasAccess(section, userAccess))
    .map((section) => ({
      ...section,
      items: filterNavItems(section.items, userAccess),
    }))
    .filter((section) => section.items.length > 0); // Remove empty sections
}

/**
 * Filter panel configs
 */
function filterPanelConfigs(
  panels: Record<string, PanelConfig>,
  userAccess: UserAccessContext
): Record<string, PanelConfig> {
  const filtered: Record<string, PanelConfig> = {};

  for (const [key, config] of Object.entries(panels)) {
    const filteredSections = filterNavSections(config.sections, userAccess);
    if (filteredSections.length > 0) {
      filtered[key] = {
        ...config,
        sections: filteredSections,
      };
    }
  }

  return filtered;
}

/**
 * Filter rail items
 */
function filterRailItems(items: RailNavItem[], userAccess: UserAccessContext): RailNavItem[] {
  return items.filter((item) => hasAccess(item, userAccess));
}

export interface UseFilteredNavigationReturn {
  /** Filtered navigation config based on user permissions */
  navigation: NavigationConfig;
  /** User access context (roles + permissions) */
  userAccess: UserAccessContext;
  /** Check if user can access a specific route */
  canAccess: (item: { roles?: UserRole[]; permissions?: string[] }) => boolean;
}

/**
 * useFilteredNavigation Hook
 * Returns navigation configuration filtered by user's roles and permissions.
 * Use this in Rail, Panel, and any navigation components.
 *
 * @example
 * ```tsx
 * const { navigation, canAccess } = useFilteredNavigation();
 *
 * // Use filtered rail items
 * navigation.railTop.map(item => ...)
 *
 * // Check custom access
 * if (canAccess({ permissions: ['users:manage'] })) { ... }
 * ```
 */
export function useFilteredNavigation(): UseFilteredNavigationReturn {
  const { user } = useAuth();

  // Build user access context
  const userAccess: UserAccessContext = useMemo(
    () => ({
      roles: user?.roles ?? [],
      permissions: user?.permissions ?? [],
    }),
    [user?.roles, user?.permissions]
  );

  // Filter navigation based on user access
  const navigation: NavigationConfig = useMemo(() => {
    // If no user, return empty navigation
    if (!user) {
      return {
        railTop: [],
        railBottom: [],
        panels: {},
      };
    }

    return {
      railTop: filterRailItems(navigationConfig.railTop, userAccess),
      railBottom: filterRailItems(navigationConfig.railBottom, userAccess),
      panels: filterPanelConfigs(navigationConfig.panels, userAccess),
    };
  }, [user, userAccess]);

  // Helper to check access for custom items
  const canAccess = useMemo(
    () => (item: { roles?: UserRole[]; permissions?: string[] }) => hasAccess(item, userAccess),
    [userAccess]
  );

  return {
    navigation,
    userAccess,
    canAccess,
  };
}

/**
 * Get filtered panel config by route path
 * Use within components that already have useFilteredNavigation
 * 
 * Uses ROUTE_TO_PANEL_MAP for accurate route-to-panel mapping.
 * This ensures routes like /properties, /site-visits, /followups
 * correctly show the CRM panel (not dashboard).
 */
export function getFilteredPanelByPath(
  navigation: NavigationConfig,
  pathname: string
): { key: string; config: PanelConfig } | null {
  // Use centralized route-to-panel mapping for accurate panel selection
  const panelKey = getPanelKeyForPath(pathname);
  
  // Return the matched panel if user has access
  if (navigation.panels[panelKey]) {
    return {
      key: panelKey,
      config: navigation.panels[panelKey]!,
    };
  }

  // Fallback to dashboard if the matched panel isn't available (permission restricted)
  if (navigation.panels.dashboard) {
    return {
      key: 'dashboard',
      config: navigation.panels.dashboard,
    };
  }

  return null;
}
