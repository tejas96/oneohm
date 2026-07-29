import { describe, expect, it } from '@jest/globals';

import { paiseToRupees, paiseTransformer, rupeesToPaise, splitByPercentage } from './paise';

describe('paiseTransformer', () => {
  /**
   * The whole point: `pg` returns BIGINT as a string. Without this transformer
   * `a + b` silently concatenates and `a > b` compares lexicographically — the
   * exact bug in payment.service.ts:99-102 that this rebuild removes.
   */
  it('converts the string pg actually returns into a number', () => {
    expect(paiseTransformer.from('184112800')).toBe(184_112_800);
    expect(typeof paiseTransformer.from('5000')).toBe('number');
  });

  it('preserves null', () => {
    expect(paiseTransformer.from(null)).toBeNull();
    expect(paiseTransformer.from(undefined)).toBeNull();
    expect(paiseTransformer.to(null)).toBeNull();
    expect(paiseTransformer.to(undefined)).toBeNull();
  });

  it('handles negative amounts (reversals are negative entries)', () => {
    expect(paiseTransformer.from('-5000000')).toBe(-5_000_000);
  });

  it('round-trips the full production total without precision loss', () => {
    const total = 1_841_128_000; // ₹1,84,11,280
    expect(paiseTransformer.from(String(total))).toBe(total);
    expect(total).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });
});

describe('rupeesToPaise / paiseToRupees', () => {
  it.each([
    [0, 0],
    [1, 100],
    [14_444.42, 1_444_442],
    [1_29_999.78, 12_999_978],
    [1_84_11_280, 1_841_128_000],
  ])('converts ₹%p to %i paise', (rupees, paise) => {
    expect(rupeesToPaise(rupees)).toBe(paise);
  });

  it('handles the float representations that break naive rounding', () => {
    // 0.1 + 0.2 === 0.30000000000000004
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
    expect(rupeesToPaise(1.005)).toBe(101);
    expect(rupeesToPaise(2.675)).toBe(268);
  });

  it('rounds negatives away from zero, symmetrically', () => {
    expect(rupeesToPaise(-1.005)).toBe(-101);
    expect(rupeesToPaise(-14_444.42)).toBe(-1_444_442);
  });

  it('round-trips', () => {
    for (const r of [0.01, 1, 999.99, 14_444.42, 1_84_11_280]) {
      expect(paiseToRupees(rupeesToPaise(r))).toBeCloseTo(r, 2);
    }
  });

  it('rejects non-finite input', () => {
    expect(() => rupeesToPaise(NaN)).toThrow(/finite/);
    expect(() => rupeesToPaise(Infinity)).toThrow(/finite/);
  });

  it('rejects fractional paise', () => {
    expect(() => paiseToRupees(100.5)).toThrow(/integer paise/);
  });
});

describe('splitByPercentage', () => {
  it('splits 10/70/20 exactly', () => {
    const parts = splitByPercentage(20_000_000, [10, 70, 20]); // ₹2,00,000
    expect(parts).toEqual([2_000_000, 14_000_000, 4_000_000]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(20_000_000);
  });

  /**
   * ₹1,00,000 split three ways is 33,333.33 × 3 = 99,999.99 if you round each
   * part independently. That missing paisa is why customers show "₹0.01
   * pending" forever. The final milestone absorbs it instead.
   */
  it('gives the remainder to the FINAL part so the total is exact', () => {
    const parts = splitByPercentage(10_000_000, [33.33, 33.33, 33.34]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10_000_000);
    expect(parts[parts.length - 1]).toBeGreaterThanOrEqual(parts[0]);
  });

  it('handles an indivisible total', () => {
    const parts = splitByPercentage(10_000, [33.333, 33.333, 33.334]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10_000);
  });

  it('handles a single 100% part', () => {
    expect(splitByPercentage(12_345, [100])).toEqual([12_345]);
  });

  it('rejects percentages that do not sum to 100', () => {
    expect(() => splitByPercentage(10_000, [10, 20])).toThrow(/sum to 100/);
    expect(() => splitByPercentage(10_000, [50, 60])).toThrow(/sum to 100/);
  });

  it('rejects empty, zero or negative weights', () => {
    expect(() => splitByPercentage(10_000, [])).toThrow(/must not be empty/);
    expect(() => splitByPercentage(10_000, [100, 0])).toThrow(/must be > 0/);
    expect(() => splitByPercentage(10_000, [110, -10])).toThrow(/must be > 0/);
  });

  it('rejects a non-positive or fractional total', () => {
    expect(() => splitByPercentage(0, [100])).toThrow(/must be > 0/);
    expect(() => splitByPercentage(100.5, [100])).toThrow(/integer paise/);
  });

  /**
   * The highest-value assertion in this file: across thousands of random
   * contracts and weightings, the split must sum EXACTLY. Any leak here becomes
   * a permanent phantom balance on a customer account.
   */
  it('sums exactly across 10,000 randomised splits', () => {
    let seed = 987_654_321;
    const rand = (n: number): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };

    for (let iter = 0; iter < 10_000; iter++) {
      const total = 1 + rand(50_000_000);
      const count = 1 + rand(5);

      // random weights normalised to exactly 100
      const raw = Array.from({ length: count }, () => 1 + rand(1000));
      const rawSum = raw.reduce((a, b) => a + b, 0);
      const pct = raw.map((w) => (w / rawSum) * 100);
      // correct any float drift onto the last weight
      pct[pct.length - 1] = 100 - pct.slice(0, -1).reduce((a, b) => a + b, 0);

      const parts = splitByPercentage(total, pct);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(parts.every((p) => Number.isInteger(p))).toBe(true);
    }
  });
});
