'use client';

import type { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';

import { ROUTES } from '@/lib/config/routes';
import { useFilteredNavigation } from '@/lib/hooks/use-filtered-navigation';

export interface CommandItem {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  group: 'navigation' | 'action';
}

/**
 * Routes that have actual page.tsx files in the app directory.
 * Items referencing routes outside this set are excluded from the palette
 * to avoid surfacing links to unimplemented pages.
 */
const IMPLEMENTED_ROUTES = new Set<string>([
  ROUTES.HOME,
  ROUTES.DASHBOARD.HOME,
  ROUTES.CUSTOMERS.LIST,
  ROUTES.ONBOARDING.NEW,
  ROUTES.QUOTES.DASHBOARD,
  ROUTES.QUOTES.LIST,
  ROUTES.QUOTES.NEW,
  ROUTES.PROJECTS.DASHBOARD,
  ROUTES.PROJECTS.LIST,
  ROUTES.PROJECTS.NEW,
  ROUTES.PROJECTS.MY_TASKS,
  ROUTES.ADMIN.WORKFLOW_STEPS,
  ROUTES.PIPELINE.HOME,
]);

function isImplementedRoute(href: string): boolean {
  const basePath = href.split('?')[0]!;
  return IMPLEMENTED_ROUTES.has(basePath);
}

const CONTEXTLESS_LABELS = new Set([
  'Today',
  'Overdue',
  'Upcoming',
  'Open',
  'Low Stock',
  'Drafts',
  'Sent',
  'Accepted',
]);

/**
 * Builds a user-friendly label for the command palette.
 * Adds section/panel context for labels that are ambiguous in isolation.
 */
function buildLabel(itemLabel: string, sectionTitle: string, _panelTitle: string): string {
  if (CONTEXTLESS_LABELS.has(itemLabel)) {
    return `${sectionTitle}: ${itemLabel}`;
  }
  return itemLabel;
}

/**
 * Post-processes items to disambiguate duplicate labels
 * (e.g. "Dashboard" appearing for both Home and Projects panels).
 */
function disambiguateLabels(items: (CommandItem & { _panelTitle: string })[]): CommandItem[] {
  const labelCounts = new Map<string, number>();
  for (const item of items) {
    labelCounts.set(item.label, (labelCounts.get(item.label) ?? 0) + 1);
  }

  return items.map(({ _panelTitle, ...item }) => {
    if ((labelCounts.get(item.label) ?? 0) > 1 && _panelTitle !== 'Home') {
      return { ...item, label: `${_panelTitle}: ${item.label}` };
    }
    return item;
  });
}

/**
 * Extracts palette-level navigation and action commands from the
 * permission-filtered navigation config.
 *
 * - Filters out ghost routes (no page.tsx)
 * - Deduplicates by href
 * - Detects actions by route pattern (/new suffix), not exactMatch flag
 * - Disambiguates generic labels with section/panel context
 * - Excludes children (filter shortcuts like Hot/Warm/Cold)
 */
export function useCommandPaletteCommands() {
  const { navigation } = useFilteredNavigation();

  return useMemo(() => {
    const rawNavItems: (CommandItem & { _panelTitle: string })[] = [];
    const rawActionItems: (CommandItem & { _panelTitle: string })[] = [];
    const seenHrefs = new Set<string>();

    for (const panel of Object.values(navigation.panels)) {
      for (const section of panel.sections) {
        for (const item of section.items) {
          if (!isImplementedRoute(item.href)) continue;

          // Blocked destinations are omitted here rather than greyed. The rail
          // and panel show them so the user can discover what exists; a search
          // box offering results that refuse to open is just noise.
          if (!item.allowed) continue;

          if (seenHrefs.has(item.href)) continue;
          seenHrefs.add(item.href);

          const basePath = item.href.split('?')[0]!;
          const isAction = basePath.endsWith('/new');
          const label = buildLabel(item.label, section.title, panel.title);

          const command = {
            id: item.id,
            label,
            href: item.href,
            icon: item.icon,
            group: isAction ? ('action' as const) : ('navigation' as const),
            _panelTitle: panel.title,
          };

          if (isAction) {
            rawActionItems.push(command);
          } else {
            rawNavItems.push(command);
          }
        }
      }
    }

    const navItems = disambiguateLabels(rawNavItems);
    const actionItems = disambiguateLabels(rawActionItems);

    return { navItems, actionItems };
  }, [navigation]);
}
