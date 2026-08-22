import type { DashboardItem } from '@tejas96/shared/types';

import { buildRoute, ROUTES } from '@/lib/config/routes';

export type ActionTarget =
  | { mode: 'navigate'; href: string; label: string }
  | { mode: 'dialog'; dialog: 'followup'; label: string };

const LABELS: Record<DashboardItem['action'], string> = {
  add_property: 'Add property',
  open_property: 'Open property',
  complete_survey: 'Complete survey',
  create_quote: 'Create quote',
  open_quote: 'Open quote',
  convert_to_project: 'Convert to project',
  complete_followup: 'Complete',
  open_service: 'Open request',
  open_project: 'Open project',
  open_payments: 'Open payments',
};

/**
 * Where an item's single action goes.
 *
 * `complete_followup` is the one action that does not navigate: completing a
 * follow-up needs an outcome and usually a next follow-up, so it opens the
 * dialog the followups feature already owns.
 */
export function resolveAction(item: DashboardItem): ActionTarget {
  const label = LABELS[item.action];
  const { params } = item;

  switch (item.action) {
    case 'add_property':
      // The onboarding wizard switches to "create-site" mode when it is given a
      // customerId, which is exactly the missing-property case.
      return {
        mode: 'navigate',
        href: buildRoute(ROUTES.ONBOARDING.NEW, undefined, { customerId: params.customerId }),
        label,
      };

    case 'open_property':
    case 'complete_survey':
      return {
        mode: 'navigate',
        href: buildRoute(ROUTES.PROPERTIES.DETAIL, { id: params.propertyId ?? params.id ?? '' }),
        label,
      };

    case 'create_quote':
      return {
        mode: 'navigate',
        href: buildRoute(ROUTES.QUOTES.NEW, undefined, {
          customerId: params.customerId,
          propertyId: params.propertyId,
        }),
        label,
      };

    case 'open_quote':
      return {
        mode: 'navigate',
        href: buildRoute(ROUTES.QUOTES.DETAIL, { id: params.id ?? '' }),
        label,
      };

    case 'convert_to_project':
      // There is no dedicated convert screen. The quote page owns the action, so
      // this opens the quote rather than inventing a route.
      return {
        mode: 'navigate',
        href: buildRoute(ROUTES.QUOTES.DETAIL, { id: params.id ?? '' }),
        label,
      };

    case 'open_service':
      return {
        mode: 'navigate',
        href: buildRoute(ROUTES.SERVICE.DETAIL, { id: params.id ?? '' }),
        label,
      };

    case 'open_project':
      return {
        mode: 'navigate',
        href: buildRoute(ROUTES.PROJECTS.DETAIL, { id: params.id ?? '' }),
        label,
      };

    case 'open_payments':
      return {
        mode: 'navigate',
        href: buildRoute(
          ROUTES.PROJECTS.DETAIL,
          { id: params.projectId ?? params.id ?? '' },
          { tab: 'finance' },
        ),
        label,
      };

    case 'complete_followup':
      return { mode: 'dialog', dialog: 'followup', label };
  }
}

/** Where a section's overflow link goes. The two mixed sections open a drawer instead. */
export const SECTION_OVERFLOW: Record<
  string,
  { kind: 'route'; href: string; label: string } | { kind: 'drawer'; label: string }
> = {
  workflow: { kind: 'drawer', label: 'View all' },
  needsAttention: { kind: 'drawer', label: 'View all' },
  followups: { kind: 'route', href: ROUTES.FOLLOWUPS.LIST, label: 'Open follow-ups' },
  service: { kind: 'route', href: ROUTES.SERVICE.HOME, label: 'Open service' },
  projects: { kind: 'route', href: ROUTES.PROJECTS.LIST, label: 'Open projects' },
  finance: { kind: 'route', href: ROUTES.FINANCE.HOME, label: 'Open finance' },
};
