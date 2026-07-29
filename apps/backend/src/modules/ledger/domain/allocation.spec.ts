import { describe, expect, it } from '@jest/globals';

import {
  type MilestoneCapacity,
  allocateWaterfall,
  assertValidManualAllocation,
} from './allocation';

const cap = (milestoneId: string, capacityPaise: number): MilestoneCapacity => ({
  milestoneId,
  capacityPaise,
});

describe('allocateWaterfall', () => {
  describe('the production defect this exists to fix', () => {
    /**
     * Real row from production: contract ₹1,44,444.20 split across two
     * milestones, one ₹1,30,000 receipt. The old system put the entire receipt
     * on milestone 1 and reported ₹1,29,999.78 still outstanding — chasing the
     * customer for ₹1.15L they had already paid. The truth is ₹14,444.20.
     */
    it('spills a large receipt across milestones instead of dumping it on the first', () => {
      const m1 = 1_444_442; // ₹14,444.42
      const m2 = 12_999_978; // ₹1,29,999.78
      const receipt = 13_000_000; // ₹1,30,000

      const { allocations, unallocatedPaise } = allocateWaterfall(
        [cap('m1', m1), cap('m2', m2)],
        receipt,
      );

      expect(allocations).toEqual([
        { milestoneId: 'm1', amountPaise: 1_444_442 },
        { milestoneId: 'm2', amountPaise: 11_555_558 },
      ]);
      expect(unallocatedPaise).toBe(0);

      // What the customer actually still owes: ₹14,444.20.
      expect(m2 - 11_555_558).toBe(1_444_420);
    });
  });

  describe('basic distribution', () => {
    it('fills a single milestone exactly', () => {
      const r = allocateWaterfall([cap('m1', 5000)], 5000);
      expect(r.allocations).toEqual([{ milestoneId: 'm1', amountPaise: 5000 }]);
      expect(r.unallocatedPaise).toBe(0);
    });

    it('partially fills when the receipt is smaller than the first milestone', () => {
      const r = allocateWaterfall([cap('m1', 5000), cap('m2', 5000)], 2000);
      expect(r.allocations).toEqual([{ milestoneId: 'm1', amountPaise: 2000 }]);
      expect(r.unallocatedPaise).toBe(0);
    });

    it('spills across three milestones', () => {
      const r = allocateWaterfall([cap('m1', 1000), cap('m2', 2000), cap('m3', 3000)], 4500);
      expect(r.allocations).toEqual([
        { milestoneId: 'm1', amountPaise: 1000 },
        { milestoneId: 'm2', amountPaise: 2000 },
        { milestoneId: 'm3', amountPaise: 1500 },
      ]);
      expect(r.unallocatedPaise).toBe(0);
    });

    it('handles a single paisa', () => {
      const r = allocateWaterfall([cap('m1', 100), cap('m2', 100)], 1);
      expect(r.allocations).toEqual([{ milestoneId: 'm1', amountPaise: 1 }]);
    });
  });

  describe('overflow becomes credit, never a forced allocation', () => {
    it('leaves the excess unallocated when the receipt exceeds the whole contract', () => {
      const r = allocateWaterfall([cap('m1', 1000), cap('m2', 2000)], 5000);
      expect(r.allocations).toEqual([
        { milestoneId: 'm1', amountPaise: 1000 },
        { milestoneId: 'm2', amountPaise: 2000 },
      ]);
      expect(r.unallocatedPaise).toBe(2000);
    });

    it('allocates nothing when there are no milestones', () => {
      const r = allocateWaterfall([], 5000);
      expect(r.allocations).toEqual([]);
      expect(r.unallocatedPaise).toBe(5000);
    });

    it('allocates nothing when every milestone is already full', () => {
      const r = allocateWaterfall([cap('m1', 0), cap('m2', 0)], 5000);
      expect(r.allocations).toEqual([]);
      expect(r.unallocatedPaise).toBe(5000);
    });
  });

  describe('skipping', () => {
    it('skips full milestones and continues to the next with capacity', () => {
      const r = allocateWaterfall([cap('m1', 0), cap('m2', 3000), cap('m3', 1000)], 3500);
      expect(r.allocations).toEqual([
        { milestoneId: 'm2', amountPaise: 3000 },
        { milestoneId: 'm3', amountPaise: 500 },
      ]);
    });

    it('skips over-allocated milestones (negative capacity) — migrated data carries these', () => {
      const r = allocateWaterfall([cap('m1', -5000), cap('m2', 2000)], 1000);
      expect(r.allocations).toEqual([{ milestoneId: 'm2', amountPaise: 1000 }]);
    });

    it('never emits a zero-amount allocation', () => {
      const r = allocateWaterfall([cap('m1', 1000), cap('m2', 2000)], 1000);
      expect(r.allocations).toHaveLength(1);
      expect(r.allocations.every((a) => a.amountPaise > 0)).toBe(true);
    });
  });

  describe('rejects bad input rather than guessing', () => {
    it.each([0, -1, -5000])('rejects a non-positive amount (%i)', (amount) => {
      expect(() => allocateWaterfall([cap('m1', 1000)], amount)).toThrow(/must be > 0/);
    });

    it('rejects a non-integer amount', () => {
      expect(() => allocateWaterfall([cap('m1', 1000)], 100.5)).toThrow(/integer paise/);
    });

    it('rejects a non-integer capacity', () => {
      expect(() => allocateWaterfall([cap('m1', 1000.5)], 100)).toThrow(/not an integer/);
    });
  });

  describe('invariants hold over randomised input', () => {
    it('conserves the total and never exceeds any capacity', () => {
      let seed = 12345;
      const rand = (n: number): number => {
        // deterministic LCG — no Math.random, so failures are reproducible
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed % n;
      };

      for (let iter = 0; iter < 5000; iter++) {
        const count = 1 + rand(6);
        const capacities = Array.from({ length: count }, (_, i) => cap(`m${i}`, rand(100_000)));
        const amount = 1 + rand(400_000);

        const { allocations, unallocatedPaise } = allocateWaterfall(capacities, amount);

        const allocated = allocations.reduce((s, a) => s + a.amountPaise, 0);
        expect(allocated + unallocatedPaise).toBe(amount);
        expect(unallocatedPaise).toBeGreaterThanOrEqual(0);

        const byId = new Map(capacities.map((c) => [c.milestoneId, c.capacityPaise]));
        for (const a of allocations) {
          expect(a.amountPaise).toBeGreaterThan(0);
          expect(a.amountPaise).toBeLessThanOrEqual(byId.get(a.milestoneId) as number);
        }
      }
    });
  });
});

describe('assertValidManualAllocation', () => {
  const valid = new Set(['m1', 'm2']);

  it('accepts an allocation that reconciles', () => {
    expect(() =>
      assertValidManualAllocation(
        [
          { milestoneId: 'm1', amountPaise: 600 },
          { milestoneId: 'm2', amountPaise: 400 },
        ],
        1000,
        valid,
      ),
    ).not.toThrow();
  });

  it('accepts a partial allocation, leaving the rest as credit', () => {
    expect(() =>
      assertValidManualAllocation([{ milestoneId: 'm1', amountPaise: 600 }], 1000, valid),
    ).not.toThrow();
  });

  it('rejects allocations exceeding the entry — that would create money', () => {
    expect(() =>
      assertValidManualAllocation([{ milestoneId: 'm1', amountPaise: 1500 }], 1000, valid),
    ).toThrow(/create money/);
  });

  it('rejects a milestone from another project', () => {
    expect(() =>
      assertValidManualAllocation([{ milestoneId: 'other', amountPaise: 500 }], 1000, valid),
    ).toThrow(/does not belong to this project/);
  });

  it('rejects duplicate milestones', () => {
    expect(() =>
      assertValidManualAllocation(
        [
          { milestoneId: 'm1', amountPaise: 300 },
          { milestoneId: 'm1', amountPaise: 300 },
        ],
        1000,
        valid,
      ),
    ).toThrow(/duplicate allocation/);
  });

  it('rejects an empty allocation list', () => {
    expect(() => assertValidManualAllocation([], 1000, valid)).toThrow(/must not be empty/);
  });

  it.each([0, -100, 10.5])('rejects a non-positive or fractional amount (%p)', (amt) => {
    expect(() =>
      assertValidManualAllocation([{ milestoneId: 'm1', amountPaise: amt }], 1000, valid),
    ).toThrow(/positive integer paise/);
  });
});
