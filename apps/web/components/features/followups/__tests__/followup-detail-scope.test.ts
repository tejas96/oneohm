import { followupDetailScopeError } from '../lib/followup-detail-scope';
import { followupRecordHref, isValidFollowupId } from '../lib/followup-href';

const CUSTOMER_A = '550e8400-e29b-41d4-a716-446655440000';
const CUSTOMER_B = '550e8400-e29b-41d4-a716-446655440001';
const PROPERTY_A = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
const PROPERTY_B = '6ba7b811-9dad-11d1-80b4-00c04fd430c9';
const FOLLOWUP_ID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('followupDetailScopeError', () => {
  it('accepts a follow-up on the scoped customer', () => {
    expect(
      followupDetailScopeError(
        { customerId: CUSTOMER_A, propertyId: PROPERTY_A },
        { customerId: CUSTOMER_A },
      ),
    ).toBeNull();
  });

  it('rejects a follow-up from another customer', () => {
    expect(
      followupDetailScopeError(
        { customerId: CUSTOMER_B, propertyId: PROPERTY_A },
        {
          customerId: CUSTOMER_A,
        },
      ),
    ).toBe('not-found');
  });

  it('rejects a site follow-up opened on the wrong property page', () => {
    expect(
      followupDetailScopeError(
        { customerId: CUSTOMER_A, propertyId: PROPERTY_B },
        {
          propertyId: PROPERTY_A,
        },
      ),
    ).toBe('not-found');
  });

  it('rejects a customer-level follow-up on a property page', () => {
    expect(
      followupDetailScopeError(
        { customerId: CUSTOMER_A, propertyId: null },
        {
          propertyId: PROPERTY_A,
        },
      ),
    ).toBe('not-found');
  });

  it('accepts the matching site follow-up on a property page', () => {
    expect(
      followupDetailScopeError(
        { customerId: CUSTOMER_A, propertyId: PROPERTY_A },
        {
          propertyId: PROPERTY_A,
        },
      ),
    ).toBeNull();
  });
});

describe('followupRecordHref dashboard edge cases', () => {
  it('prefers customer lead when property id is an empty string', () => {
    const href = followupRecordHref(
      { customerId: CUSTOMER_A, propertyId: '' },
      { followupId: FOLLOWUP_ID },
    );
    expect(href).toContain('/customers/');
    expect(href).toContain(`followupId=${FOLLOWUP_ID}`);
  });

  it('ignores whitespace-only ids', () => {
    expect(followupRecordHref({ customerId: '   ', propertyId: '  ' })).toBeNull();
  });
});

describe('isValidFollowupId', () => {
  it('accepts uppercase UUIDs', () => {
    expect(isValidFollowupId('6BA7B810-9DAD-11D1-80B4-00C04FD430C8')).toBe(true);
  });
});
