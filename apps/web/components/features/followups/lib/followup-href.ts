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
 * Property/customer detail URL that opens on the Follow-ups tab.
 *
 * Follow-up rows used to deep-link to the record with no tab, so the destination
 * landed on Overview and the follow-up that brought you there was hidden.
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

  if (propertyId) {
    return buildRoute(ROUTES.PROPERTIES.DETAIL, { id: propertyId }, query);
  }
  if (customerId) {
    return buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: customerId }, query);
  }
  return null;
}
