import { buildRoute, ROUTES } from '@/lib/config/routes';

/**
 * Where a site lives: on its customer's page, as the chosen site.
 *
 * There is no separate site page any more. Every link to a site goes through
 * here, so the address has one shape (`/customers/<id>?site=<siteId>`), and a
 * card of the page can be named to land on it (`card: 'followups'`).
 */
export function siteHref(
  customerId: string,
  siteId: string,
  options: { card?: string; followupId?: string } = {},
): string {
  const params = new URLSearchParams({ site: siteId });
  if (options.card) params.set('tab', options.card);
  if (options.followupId) params.set('followupId', options.followupId);
  return `${buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: customerId })}?${params.toString()}`;
}
