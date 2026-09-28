/**
 * Reseller commission maths — the ONE place it lives.
 *
 * The server freezes a commission with these functions, and the reseller's
 * phone shows "Your commission at this price" with the same ones, so the two
 * can never disagree by a paisa.
 *
 * The base is the price BEFORE GST, AFTER discount. Subsidy is government
 * money paid to the customer and never enters this file.
 */

export type CommissionBaseSource = 'discounted_base' | 'derived' | 'manual' | 'missing';
export type CommissionRateSource = 'profile' | 'manual' | 'missing';

/** The slice of `quote_snapshot.pricing` this needs. Every field may be absent on old quotes. */
export interface CommissionPricingInput {
  basePrice?: number | string | null;
  discountAmount?: number | string | null;
  discountedBasePrice?: number | string | null;
}

function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function commissionBase(pricing: CommissionPricingInput | null | undefined): {
  base: number;
  source: CommissionBaseSource;
} {
  if (!pricing) return { base: 0, source: 'missing' };

  const discounted = num(pricing.discountedBasePrice);
  if (discounted !== null && discounted >= 0) {
    return { base: round2(discounted), source: 'discounted_base' };
  }

  const base = num(pricing.basePrice);
  if (base !== null) {
    const discount = Math.max(0, num(pricing.discountAmount) ?? 0);
    return { base: round2(Math.max(0, base - discount)), source: 'derived' };
  }

  return { base: 0, source: 'missing' };
}

/**
 * base × rate / 100, rounded half-up to the paisa.
 *
 * Done in integers: rupees → paise, rate → basis points. Floating point would
 * make ₹3,90,000 × 3% come out as 11699.999… on some inputs.
 */
export function commissionAmount(base: number, ratePercent: number): number {
  if (!Number.isFinite(base) || !Number.isFinite(ratePercent) || base <= 0 || ratePercent <= 0) {
    return 0;
  }
  const basePaise = Math.round(base * 100);
  const rateBp = Math.round(ratePercent * 100);
  return Math.round((basePaise * rateBp) / 10_000) / 100;
}

/** The state a screen shows. Derived server-side from status + project + queue; never stored. */
export type CommissionState =
  | 'pending'
  | 'needs_amount'
  | 'on_hold'
  | 'waiting_for_project'
  | 'approved'
  | 'payment_in_review'
  | 'paid'
  | 'to_recover'
  | 'recovered'
  | 'cancelled';

/** Office words (web). */
export const COMMISSION_STATE_LABEL: Record<CommissionState, string> = {
  pending: 'Pending',
  needs_amount: 'Needs amount',
  on_hold: 'On hold — site lost',
  waiting_for_project: 'Waiting for project',
  approved: 'Approved',
  payment_in_review: 'Payment in review',
  paid: 'Paid',
  to_recover: 'To recover',
  recovered: 'Recovered',
  cancelled: 'Cancelled',
};

/** Reseller words (phone). The office's internal steps collapse into what he cares about. */
export const RESELLER_STATE_LABEL: Record<CommissionState, string> = {
  pending: 'Pending',
  needs_amount: 'Pending',
  on_hold: 'On hold',
  waiting_for_project: 'Approved',
  approved: 'Approved',
  payment_in_review: 'Approved',
  paid: 'Paid',
  to_recover: 'Cancelled — owed back',
  recovered: 'Cancelled — settled',
  cancelled: 'Cancelled',
};
