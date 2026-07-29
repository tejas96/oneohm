import { describe, expect, it } from '@jest/globals';

import {
  type MilestoneRowStatus,
  derivedMilestoneStatus,
  milestoneBalancePaise,
  milestoneOverAllocatedPaise,
} from './derived-status';

/**
 * This table is the contract between this function and the `CASE` expression in
 * `v_milestone_balance`. If you change one, this spec must change too — which is
 * the point: the SQL and the TS cannot drift silently.
 */
describe('derivedMilestoneStatus', () => {
  it.each<[number, number, MilestoneRowStatus, string]>([
    // expected, allocated, rowStatus, => derived
    [10_000, 0, 'active', 'pending'],
    [10_000, 1, 'active', 'partial'],
    [10_000, 9_999, 'active', 'partial'],
    [10_000, 10_000, 'active', 'paid'],
    [10_000, 15_000, 'active', 'paid'], // over-allocated is still paid
    [10_000, 0, 'waived', 'waived'],
    [10_000, 5_000, 'waived', 'waived'], // waived wins even with money against it
    [10_000, 10_000, 'waived', 'waived'],
    [10_000, -500, 'active', 'pending'], // fully reversed
  ])('expected=%i allocated=%i row=%s => %s', (expected, allocated, row, want) => {
    expect(derivedMilestoneStatus(expected, allocated, row)).toBe(want);
  });

  it('only ever emits values the consumer mobile app understands', () => {
    // map-consumer-payments.ts switches on these and falls through to 'LOCKED',
    // which would render a paid milestone as a greyed-out locked card.
    const allowed = new Set(['pending', 'partial', 'paid', 'waived']);
    for (const expected of [0, 1, 10_000]) {
      for (const allocated of [-1, 0, 1, 9_999, 10_000, 99_999]) {
        for (const row of ['active', 'waived'] as MilestoneRowStatus[]) {
          expect(allowed.has(derivedMilestoneStatus(expected, allocated, row))).toBe(true);
        }
      }
    }
  });

  it("never emits 'cancelled' — that state does not exist in the new model", () => {
    const results = new Set<string>();
    for (const allocated of [-100, 0, 50, 100, 200]) {
      results.add(derivedMilestoneStatus(100, allocated, 'active'));
      results.add(derivedMilestoneStatus(100, allocated, 'waived'));
    }
    expect(results.has('cancelled')).toBe(false);
  });
});

describe('milestoneBalancePaise', () => {
  it.each([
    [10_000, 0, 10_000],
    [10_000, 2_000, 8_000], // the client's "short by ₹8,000" case
    [10_000, 10_000, 0],
    [10_000, 15_000, 0], // clamped: over-allocation is not negative outstanding
  ])('expected=%i allocated=%i => %i', (expected, allocated, want) => {
    expect(milestoneBalancePaise(expected, allocated)).toBe(want);
  });
});

describe('milestoneOverAllocatedPaise', () => {
  it.each([
    [10_000, 5_000, 0],
    [10_000, 10_000, 0],
    [10_000, 15_000, 5_000],
  ])('expected=%i allocated=%i => %i', (expected, allocated, want) => {
    expect(milestoneOverAllocatedPaise(expected, allocated)).toBe(want);
  });

  it('reports the production over-allocation rather than hiding it', () => {
    // A migrated project where the whole receipt landed on milestone 1.
    const expected = 1_444_442; // ₹14,444.42
    const allocated = 13_000_000; // ₹1,30,000
    expect(milestoneOverAllocatedPaise(expected, allocated)).toBe(11_555_558);
    expect(milestoneBalancePaise(expected, allocated)).toBe(0);
  });
});
