import { buildRoute, ROUTES } from '@/lib/config/routes';

/**
 * Property/customer detail URL that opens on the Follow-ups tab.
 *
 * Follow-up rows used to deep-link to the record with no tab, so the destination
 * landed on Overview and the follow-up that brought you there was hidden.
 */
export function followupRecordHref(record: {
  propertyId?: string | null;
  customerId?: string | null;
}): string | null {
  if (record.propertyId) {
    return buildRoute(ROUTES.PROPERTIES.DETAIL, { id: record.propertyId }, { tab: 'followups' });
  }
  if (record.customerId) {
    return buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: record.customerId }, { tab: 'followups' });
  }
  return null;
}
