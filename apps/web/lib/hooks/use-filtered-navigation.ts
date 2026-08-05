'use client';

import { useMemo } from 'react';

import { canAccessFeature } from '@/lib/access-control/access';
import { navigationConfig } from '@/lib/config/navigation';
import {
  getNavigationFeature,
  isNavigationHrefExcluded,
} from '@/lib/config/navigation-features';
import { getPanelKeyForPath } from '@/lib/config/routes';
import type { NavItem, NavSection, NavigationConfig, PanelConfig, RailNavItem } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

function annotateNavItems(items: NavItem[], roles: readonly string[]): NavItem[] {
  return items
    .filter((item) => !isNavigationHrefExcluded(item.href))
    .map((item) => {
      const feature = item.feature ?? getNavigationFeature(item.href);
      const isAllowed = feature ? canAccessFeature(roles, feature) : false;
      return {
        ...item,
        feature,
        isAllowed,
        children: item.children ? annotateNavItems(item.children, roles) : undefined,
      };
    });
}

function annotateNavSections(sections: NavSection[], roles: readonly string[]): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: annotateNavItems(section.items, roles),
    }))
    .filter((section) => section.items.length > 0);
}

function annotateRailItems(items: RailNavItem[], roles: readonly string[]): RailNavItem[] {
  return items
    .filter((item) => !isNavigationHrefExcluded(item.href))
    .map((item) => {
      const feature = item.feature ?? getNavigationFeature(item.href);
      const isAllowed = feature ? canAccessFeature(roles, feature) : false;
      return { ...item, feature, isAllowed };
    });
}

function annotatePanelConfigs(
  panels: Record<string, PanelConfig>,
  roles: readonly string[],
): Record<string, PanelConfig> {
  const annotated: Record<string, PanelConfig> = {};
  for (const [key, config] of Object.entries(panels)) {
    const sections = annotateNavSections(config.sections, roles);
    if (sections.length > 0) {
      annotated[key] = { ...config, sections };
    }
  }
  return annotated;
}

export interface UseFilteredNavigationReturn {
  navigation: NavigationConfig;
}

export function useFilteredNavigation(): UseFilteredNavigationReturn {
  const { user } = useAuth();

  const navigation: NavigationConfig = useMemo(() => {
    if (!user) {
      return {
        railTop: [],
        railBottom: [],
        panels: {},
      };
    }

    const roles = user.roles ?? [];
    return {
      railTop: annotateRailItems(navigationConfig.railTop, roles),
      railBottom: annotateRailItems(navigationConfig.railBottom, roles),
      panels: annotatePanelConfigs(navigationConfig.panels, roles),
    };
  }, [user]);

  return { navigation };
}

export function getFilteredPanelByPath(
  navigation: NavigationConfig,
  pathname: string,
): { key: string; config: PanelConfig } | null {
  const panelKey = getPanelKeyForPath(pathname);

  if (navigation.panels[panelKey]) {
    return {
      key: panelKey,
      config: navigation.panels[panelKey]!,
    };
  }

  if (navigation.panels.dashboard) {
    return {
      key: 'dashboard',
      config: navigation.panels.dashboard,
    };
  }

  return null;
}
