'use client';

import { useMemo } from 'react';

import { navigationConfig } from '@/lib/config/navigation';
import { getPanelKeyForPath } from '@/lib/config/routes';
import { useCan, type Gate } from '@/lib/rbac';
import type { Gated, NavItem, NavSection, PanelConfig, RailNavItem } from '@/lib/types';

/**
 * Navigation annotated with what the current user may actually use.
 *
 * This used to *remove* inaccessible items. It now marks them instead, and the
 * rail and panel render them greyed. Hiding a feature means a user cannot
 * discover it exists, so they never know what to ask a superadmin for — the
 * greyed item plus the access dialog is what makes the permission legible.
 *
 * Sections are kept even when every item inside is blocked, for the same
 * reason: the shape of the app should be the same for everyone.
 */
export type GatedNavItem = Gated<Omit<NavItem, 'children'>> & { children?: GatedNavItem[] };
export type GatedRailItem = Gated<RailNavItem>;
export interface GatedSection extends Omit<NavSection, 'items'> {
  allowed: boolean;
  items: GatedNavItem[];
}
export interface GatedPanel extends Omit<PanelConfig, 'sections'> {
  sections: GatedSection[];
}
export interface GatedNavigation {
  railTop: GatedRailItem[];
  railBottom: GatedRailItem[];
  panels: Record<string, GatedPanel>;
}

function gateItems(items: NavItem[], can: (gate: Gate) => boolean): GatedNavItem[] {
  return items.map((item) => ({
    ...item,
    allowed: can(item.permission),
    children: item.children ? gateItems(item.children, can) : undefined,
  }));
}

export interface UseFilteredNavigationReturn {
  navigation: GatedNavigation;
  /** Check any gate directly, for UI that is not a nav item. */
  canAccess: (gate: Gate) => boolean;
}

export function useFilteredNavigation(): UseFilteredNavigationReturn {
  const { can } = useCan();

  const navigation = useMemo<GatedNavigation>(() => {
    const panels: Record<string, GatedPanel> = {};

    for (const [key, config] of Object.entries(navigationConfig.panels)) {
      panels[key] = {
        ...config,
        sections: config.sections.map((section) => ({
          ...section,
          allowed: can(section.permission),
          items: gateItems(section.items, can),
        })),
      };
    }

    return {
      railTop: navigationConfig.railTop.map((i) => ({ ...i, allowed: can(i.permission) })),
      railBottom: navigationConfig.railBottom.map((i) => ({ ...i, allowed: can(i.permission) })),
      panels,
    };
  }, [can]);

  return { navigation, canAccess: can };
}

/**
 * Panel for the current path.
 *
 * No longer falls back to the dashboard panel when the matched panel is
 * "restricted" — nothing is restricted away any more, every panel is present
 * and its items carry `allowed`. A silent fallback would have hidden the very
 * thing the user was trying to reach.
 */
export function getFilteredPanelByPath(
  navigation: GatedNavigation,
  pathname: string,
): { key: string; config: GatedPanel } | null {
  const panelKey = getPanelKeyForPath(pathname);

  if (navigation.panels[panelKey]) {
    return { key: panelKey, config: navigation.panels[panelKey] };
  }

  if (navigation.panels.dashboard) {
    return { key: 'dashboard', config: navigation.panels.dashboard };
  }

  return null;
}
