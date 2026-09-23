import type { FactEditAt, ReportWorkspace } from '@tejas96/shared/reports';

import { buildRoute, ROUTES } from '@/lib/config/routes';

/** Where a read-only fact lives, so it is changed at its one home. */
export function factEditHref(editAt: FactEditAt, workspace: ReportWorkspace): string {
  switch (editAt) {
    case 'customer':
      return buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: workspace.customerId });
    case 'property':
      return buildRoute(ROUTES.PROPERTIES.DETAIL, { id: workspace.propertyId });
    case 'quote':
      return buildRoute(ROUTES.QUOTES.DETAIL, { id: workspace.quoteId });
    case 'bom':
      return `${buildRoute(ROUTES.PROJECTS.DETAIL, { id: workspace.projectId })}?tab=bom`;
  }
}
