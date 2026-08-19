import { splitByPercentage } from './paise';

/**
 * Reconcile a milestone schedule to the contract total.
 *
 * `splitByPercentage` already puts its remainder on the final milestone, but
 * that path only runs when the quote supplies percentages alone. In practice
 * the quote always supplies explicit rupee amounts, already rounded to two
 * decimals by the payment-terms dialog, so the schedule can miss the contract
 * by a few paise and the project can never be exactly settled.
 *
 * Only a ROUNDING-SIZED difference is absorbed. Each amount is a 2-decimal
 * value, so each can be off by under one paise; N milestones can therefore be
 * off by under N. Anything larger is not rounding — it means the schedule and
 * the signed quote genuinely disagree, and silently moving that money onto the
 * final milestone would hide it. Observed production data separates the two
 * cases by five orders of magnitude: 44 projects drift exactly 1 paise, 12
 * drift 273,999 paise or more, and nothing sits in between.
 */
export function reconcileToContract(amounts: number[], contractPaise: number): number[] {
  if (amounts.length === 0) {
    throw new Error('reconcileToContract: amounts must not be empty');
  }
  for (const a of amounts) {
    if (!Number.isInteger(a)) {
      throw new Error(`reconcileToContract: expected integer paise, got ${a}`);
    }
  }
  if (!Number.isInteger(contractPaise)) {
    throw new Error(`reconcileToContract: contractPaise must be an integer, got ${contractPaise}`);
  }

  const sum = amounts.reduce((a, b) => a + b, 0);
  const diff = contractPaise - sum;
  if (diff === 0) {
    return amounts;
  }

  const tolerance = amounts.length;
  if (Math.abs(diff) > tolerance) {
    throw new Error(
      `reconcileToContract: schedule sums to ${sum} but differs from the contract ` +
        `(${contractPaise}) by ${Math.abs(diff)} paise, which exceeds the ${tolerance}-paise ` +
        `rounding tolerance for ${amounts.length} milestones. This is not a rounding remainder — ` +
        `the schedule and the signed quote disagree.`,
    );
  }

  const reconciled = [...amounts];
  const lastIndex = reconciled.length - 1;
  const adjusted = (reconciled[lastIndex] as number) + diff;
  if (adjusted <= 0) {
    throw new Error(
      `reconcileToContract: adjusting the final milestone by ${diff} would make it ` +
        `non-positive (${adjusted})`,
    );
  }
  reconciled[lastIndex] = adjusted;
  return reconciled;
}

/**
 * Snapshot amounts for a signed quote.
 *
 * Quote revisions historically copied the previous version's rupee amounts
 * while updating `finalPrice` (QT-ONEOHM_EPC-2026-0177: 3 kW → 4 kW raised the
 * contract by ₹52,532.26 but left the 10/85/5 instalments on the old total).
 * When that happens the percentages are still the agreed split, so derive
 * from them rather than aborting conversion with a 500.
 *
 * Rounding-sized drift still goes through `reconcileToContract`. A disagreement
 * with no usable percentages still throws — that is a real data error.
 */
export function resolveSnapshotAmounts(
  amounts: number[],
  contractPaise: number,
  percentages: number[],
): { amounts: number[]; usedPercentages: boolean } {
  const sum = amounts.reduce((a, b) => a + b, 0);
  if (Math.abs(contractPaise - sum) <= amounts.length) {
    return { amounts: reconcileToContract(amounts, contractPaise), usedPercentages: false };
  }

  const percentagesUsable =
    percentages.length === amounts.length &&
    percentages.every((p) => Number.isFinite(p) && p > 0) &&
    Math.abs(percentages.reduce((a, b) => a + b, 0) - 100) <= 0.01;

  if (percentagesUsable) {
    return { amounts: splitByPercentage(contractPaise, percentages), usedPercentages: true };
  }

  return { amounts: reconcileToContract(amounts, contractPaise), usedPercentages: false };
}
