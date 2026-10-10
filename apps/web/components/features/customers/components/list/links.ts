import { quoteLinks } from '@/components/features/quotes/components/dashboard/links';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import type { DashboardFilters } from '@/lib/hooks/resources';

/**
 * The quotes dashboard request behind the header's "in open quotes" figure.
 * The link below is built from the same filters, so the list it opens holds
 * exactly the deals the figure counts.
 */
export const OPEN_QUOTES_FILTERS: DashboardFilters = { period: 'this_month', financing: 'all' };

/** Every URL the customers list and its focus panel can send someone to. */
export const customerLinks = {
  customer: (id: string): string => buildRoute(ROUTES.CUSTOMERS.DETAIL, { id }),
  edit: (id: string): string => buildRoute(ROUTES.CUSTOMERS.EDIT, { id }),
  service: (id: string): string => buildRoute(ROUTES.CUSTOMERS.DETAIL, { id }, { tab: 'service' }),
  quotes: (id: string): string => buildRoute(ROUTES.CUSTOMERS.DETAIL, { id }, { tab: 'quotes' }),
  /** The follow-ups tab; with an id it also opens that follow-up. */
  followups: (id: string, followupId?: string): string =>
    buildRoute(ROUTES.CUSTOMERS.DETAIL, { id }, { tab: 'followups', followupId }),
  addCustomer: (): string => ROUTES.ONBOARDING.NEW,
  addSite: (customerId: string): string =>
    buildRoute(ROUTES.ONBOARDING.NEW, undefined, { customerId }),
  site: (propertyId: string): string => buildRoute(ROUTES.PROPERTIES.DETAIL, { id: propertyId }),
  quote: (quoteId: string): string => quoteLinks.quote(quoteId),
  project: (projectId: string): string => buildRoute(ROUTES.PROJECTS.DETAIL, { id: projectId }),
  /** The quote list on its pipeline stage — the deals behind the header figure. */
  openQuotes: (): string => quoteLinks.stage('pipeline', OPEN_QUOTES_FILTERS),
  /** `/followups` on its Overdue tab for everyone — what the header counts. */
  overdueFollowups: (): string =>
    buildRoute(ROUTES.FOLLOWUPS.LIST, undefined, { scope: 'overdue', owner: 'all' }),
  call: (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`,
};
