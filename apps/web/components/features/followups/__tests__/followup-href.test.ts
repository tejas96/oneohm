import * as fs from 'node:fs';
import * as path from 'node:path';

import { followupRecordHref, isValidFollowupId } from '../lib/followup-href';

import { resolveAction } from '@/components/features/dashboard/lib/action-routes';
import { ROUTES } from '@/lib/config/routes';

const CUSTOMER_ID = '550e8400-e29b-41d4-a716-446655440000';
const PROPERTY_ID = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
const FOLLOWUP_ID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('followupRecordHref', () => {
  it('returns null when neither customer nor property id is set', () => {
    expect(followupRecordHref({})).toBeNull();
    expect(followupRecordHref({ customerId: null, propertyId: null })).toBeNull();
  });

  it('always opens the follow-ups tab on customer leads', () => {
    const href = followupRecordHref({ customerId: CUSTOMER_ID });
    expect(href).toContain('/customers/');
    expect(href).toContain(CUSTOMER_ID);
    expect(href).toContain('tab=followups');
    expect(href).not.toContain('followupId=');
  });

  it('always opens the follow-ups tab on site leads', () => {
    const href = followupRecordHref({ propertyId: PROPERTY_ID, customerId: CUSTOMER_ID });
    expect(href).toContain('/properties/');
    expect(href).toContain(PROPERTY_ID);
    expect(href).toContain('tab=followups');
  });

  it('adds followupId when deep-linking into the detail modal', () => {
    const href = followupRecordHref({ customerId: CUSTOMER_ID }, { followupId: FOLLOWUP_ID });
    expect(href).toContain(`followupId=${FOLLOWUP_ID}`);
    expect(href).toContain('tab=followups');
  });
});

describe('isValidFollowupId', () => {
  it('accepts lowercase UUIDs', () => {
    expect(isValidFollowupId(FOLLOWUP_ID)).toBe(true);
  });

  it('rejects malformed ids', () => {
    expect(isValidFollowupId('not-a-uuid')).toBe(false);
    expect(isValidFollowupId('')).toBe(false);
  });
});

describe('FollowupRowActions', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../components/followup-row-actions.tsx'),
    'utf8',
  );

  it('offers View details as a plain menu item before gated write actions', () => {
    expect(source).toContain('View details');
    expect(source).toMatch(/<MenuItem[\s\S]*View details/);
    expect(source).toMatch(/View details[\s\S]*GatedMenuItem[\s\S]*Reschedule/);
  });

  it('keeps Complete hidden for non-pending follow-ups', () => {
    expect(source).toContain("visibility: isPending ? 'visible' : 'hidden'");
  });
});

describe('service ticket routes', () => {
  it('still deep-links service dashboard items to the ticket page', () => {
    const target = resolveAction({
      id: 'service_overdue:ticket-1',
      kind: 'service_overdue',
      severity: 'critical',
      title: 'Pump failure',
      reason: 'Overdue',
      action: 'open_service',
      params: { id: 'ticket-uuid' },
      gate: null,
    });

    expect(target.mode).toBe('navigate');
    if (target.mode === 'navigate') {
      expect(target.href).toContain(ROUTES.SERVICE.DETAIL.replace('[id]', 'ticket-uuid'));
    }
  });
});
