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

describe('customer and lead-unit counts are related, not equal', () => {
  it('documents that CUSTOMER_NEEDS_FOLLOWUP reuses the property fragment verbatim', () => {
    // If someone rewrites the site branch by hand, this fails — which is the
    // whole point of the extraction. One customer with three unattended sites
    // is one row here and three in findGaps(), and that difference is by
    // design; what must NOT differ is the definition of "unattended".
    const property = PROPERTY_NEEDS_FOLLOWUP('p').replace(/\s+/g, ' ').trim();
    const customer = CUSTOMER_NEEDS_FOLLOWUP('c').replace(/\s+/g, ' ').trim();
    expect(customer).toContain(property);
  });

  it('reuses the lead fragment verbatim too', () => {
    const lead = CUSTOMER_LEAD_NEEDS_FOLLOWUP('c').replace(/\s+/g, ' ').trim();
    const customer = CUSTOMER_NEEDS_FOLLOWUP('c').replace(/\s+/g, ' ').trim();
    expect(customer).toContain(lead);
  });

  /**
   * The two tests above only assert substring containment: they catch a
   * hand-rewritten copy of either fragment, but NOT a broken join between
   * them. `alias.deleted_at IS NULL AND EXISTS (...) OR (lead)` still
   * contains both fragments verbatim, yet without a paren wrapping the OR,
   * SQL precedence reads it as `(deleted_at IS NULL AND EXISTS (...)) OR
   * (lead)` — a customer could match on the lead branch even when
   * `deleted_at IS NOT NULL`, i.e. a soft-deleted customer would leak into
   * the "needs follow-up" count. That is exactly the class of drift the
   * brief calls out ("wrong parenthesisation would still pass them"), so
   * this test walks the parens directly instead of trusting substrings.
   */
  it('wraps the entire site-OR-lead condition in one paren group under AND, so AND cannot bind tighter than OR', () => {
    const customer = CUSTOMER_NEEDS_FOLLOWUP('c').replace(/\s+/g, ' ').trim();

    const prefix = 'c.deleted_at IS NULL AND (';
    expect(customer.startsWith(prefix)).toBe(true);
    expect(customer.endsWith(')')).toBe(true);

    // Walk the parenthesis immediately after "AND" and confirm it does not
    // close until the very last character of the whole expression.
    const body = customer.slice(prefix.length - 1); // start at the opening '('
    let depth = 0;
    let closeIndex = -1;
    for (let i = 0; i < body.length; i++) {
      if (body[i] === '(') depth++;
      else if (body[i] === ')') {
        depth--;
        if (depth === 0) {
          closeIndex = i;
          break;
        }
      }
    }
    expect(closeIndex).toBe(body.length - 1);

    // And that lone top-level group must contain a top-level OR (one not
    // itself nested inside the EXISTS/NOT EXISTS subqueries) — otherwise
    // this isn't the site-OR-lead condition at all.
    const inner = body.slice(1, -1);
    let innerDepth = 0;
    let hasTopLevelOr = false;
    for (let i = 0; i < inner.length; i++) {
      if (inner[i] === '(') innerDepth++;
      else if (inner[i] === ')') innerDepth--;
      else if (innerDepth === 0 && inner.startsWith('OR ', i)) {
        hasTopLevelOr = true;
      }
    }
    expect(hasTopLevelOr).toBe(true);
  });
});
