/**
 * The predicate is the single definition of "needs a follow-up".
 *
 * Three places consume it — the /followups gaps tab, the customer-list chip,
 * and the per-property dot. If any of them hand-rolls the condition instead,
 * their counts drift and the UI starts contradicting itself. These tests pin
 * the shape; the consistency test in Task 3 pins that they agree on real data.
 */
import { describe, it, expect } from '@jest/globals';

import {
  CUSTOMER_LEAD_NEEDS_FOLLOWUP,
  CUSTOMER_NEEDS_FOLLOWUP,
  PROPERTY_NEEDS_FOLLOWUP,
} from './followup-predicates';

describe('PROPERTY_NEEDS_FOLLOWUP', () => {
  const sql = PROPERTY_NEEDS_FOLLOWUP('p');

  it('uses the alias it is given', () => {
    expect(sql).toContain('p.deleted_at IS NULL');
    expect(PROPERTY_NEEDS_FOLLOWUP('prop')).toContain('prop.deleted_at IS NULL');
  });

  it('excludes every terminal state', () => {
    expect(sql).toContain("'converted'");
    expect(sql).toContain("'lost'");
    expect(sql).toContain('quotes');
    expect(sql).toContain("'accepted'");
  });

  it('excludes anything with a pending followup', () => {
    expect(sql).toContain('followups');
    expect(sql).toContain("'pending'");
    expect(sql).toContain('NOT EXISTS');
  });
});

describe('CUSTOMER_LEAD_NEEDS_FOLLOWUP', () => {
  const sql = CUSTOMER_LEAD_NEEDS_FOLLOWUP('c');

  it('covers only leads and prospects with no property at all', () => {
    expect(sql).toContain("'lead'");
    expect(sql).toContain("'prospect'");
    expect(sql).toContain('customer_properties');
  });
});

describe('CUSTOMER_NEEDS_FOLLOWUP', () => {
  it('is satisfied by an unattended site OR by a property-less lead', () => {
    const sql = CUSTOMER_NEEDS_FOLLOWUP('c');
    expect(sql).toContain('OR');
    // The site branch must correlate back to the customer being tested.
    expect(sql).toContain('p.customer_id = c.id');
  });
});
