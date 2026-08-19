import { reconcileToContract, resolveSnapshotAmounts } from './schedule';
import { splitByPercentage } from './paise';

describe('reconcileToContract', () => {
  it('returns amounts unchanged when they already sum to the contract', () => {
    expect(reconcileToContract([2744073, 19208512, 5488146], 27440731)).toEqual([
      2744073, 19208512, 5488146,
    ]);
  });

  it('puts a one-paise shortfall on the final milestone', () => {
    // The real PRJ-ONEOHM_EPC-2026-0225 case: 90/5/5 of 16271566.
    expect(reconcileToContract([14644409, 813578, 813578], 16271566)).toEqual([
      14644409, 813578, 813579,
    ]);
  });

  it('puts a two-paise shortfall on the final milestone', () => {
    expect(reconcileToContract([100, 100, 100], 302)).toEqual([100, 100, 102]);
  });

  it('absorbs a one-paise overage by reducing the final milestone', () => {
    expect(reconcileToContract([100, 100, 100], 299)).toEqual([100, 100, 99]);
  });

  it('throws when the shortfall exceeds one paise per milestone', () => {
    // 3 milestones tolerate 3 paise; 4 is not rounding.
    expect(() => reconcileToContract([100, 100, 100], 304)).toThrow(
      /differs from the contract .* by 4 paise/,
    );
  });

  it('throws on the real large-drift shape rather than absorbing it', () => {
    // 273,999 paise = Rs 2,739.99 - the smallest of the 12 large drifts.
    expect(() => reconcileToContract([100, 100, 100], 274299)).toThrow(/273999 paise/);
  });

  it('throws when reconciliation would make the final milestone non-positive', () => {
    // diff is -1, inside the 3-paise tolerance, but it would zero the last milestone.
    expect(() => reconcileToContract([100, 100, 1], 200)).toThrow(/non-positive/);
  });

  it('throws on an empty schedule', () => {
    expect(() => reconcileToContract([], 100)).toThrow(/must not be empty/);
  });

  it('rejects non-integer paise', () => {
    expect(() => reconcileToContract([100.5, 100], 201)).toThrow(/integer paise/);
  });
});

describe('resolveSnapshotAmounts', () => {
  it('recomputes from percentages when a revised quote kept the old rupee amounts', () => {
    // QT-ONEOHM_EPC-2026-0177 v2: 10/85/5 of ₹2,02,531.14 stored against a
    // ₹2,55,063.40 contract after the system grew from 3 kW to 4 kW.
    const stale = [2_025_311, 17_215_147, 1_012_656];
    const contractPaise = 25_506_340;
    const result = resolveSnapshotAmounts(stale, contractPaise, [10, 85, 5]);
    expect(result.usedPercentages).toBe(true);
    expect(result.amounts).toEqual(splitByPercentage(contractPaise, [10, 85, 5]));
    expect(result.amounts.reduce((a, b) => a + b, 0)).toBe(contractPaise);
  });

  it('still absorbs rounding-sized drift without using percentages', () => {
    const result = resolveSnapshotAmounts([100, 100, 100], 302, [10, 85, 5]);
    expect(result.usedPercentages).toBe(false);
    expect(result.amounts).toEqual([100, 100, 102]);
  });

  it('throws when the schedule disagrees and percentages are not usable', () => {
    expect(() => resolveSnapshotAmounts([100, 100, 100], 274299, [10, 85])).toThrow(
      /differs from the contract/,
    );
  });
});
