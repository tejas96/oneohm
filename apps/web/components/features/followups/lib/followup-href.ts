import { siteHref } from '@/components/features/customers/lib/site-href';
import { buildRoute, ROUTES } from '@/lib/config/routes';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidFollowupId(value: string): boolean {
  return UUID_REGEX.test(value);
}

export interface FollowupRecordHrefOptions {
  /** Opens the follow-ups tab with this follow-up's detail modal. */
  followupId?: string;
}

/**
 * The customer page, on its Follow-ups card — and on the follow-up's site when
 * it has one.
 *
 * A follow-up with a site and no customer id keeps the old site address, which
 * looks the customer up and goes on from there.
 */
export function followupRecordHref(
  record: {
    propertyId?: string | null;
    customerId?: string | null;
  },
  options?: FollowupRecordHrefOptions,
): string | null {
  const query: Record<string, string> = { tab: 'followups' };
  if (options?.followupId) {
    query.followupId = options.followupId;
  }

  const propertyId = record.propertyId?.trim() || null;
  const customerId = record.customerId?.trim() || null;

  if (propertyId && customerId) {
    return siteHref(customerId, propertyId, {
      card: query.tab,
      followupId: options?.followupId,
    });
  }
  if (propertyId) {
    return buildRoute(ROUTES.PROPERTIES.DETAIL, { id: propertyId }, query);
  }
  if (customerId) {
    return buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: customerId }, query);
  }
  return null;
}
