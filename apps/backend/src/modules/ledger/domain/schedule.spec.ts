import { reconcileToContract } from './schedule';

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
