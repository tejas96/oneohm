/**
 * Milestone status, derived — never stored.
 *
 * The old model kept `project_payment_terms.paid_amount` and a `status` column
 * that had to be recomputed by hand on every write. That let a milestone sit in
 * a stale `paid` state while still showing outstanding money, and it is the
 * cache the whole dashboard read from.
 *
 * Here `status` on the row is only `active | waived`; everything a user sees is
 * computed from the allocations.
 *
 * ⚠️ This function MUST stay in lockstep with the `CASE` expression in
 * `v_milestone_balance`. `derived-status.spec.ts` pins the table of outcomes so
 * the two definitions cannot drift silently.
 */

export type MilestoneRowStatus = 'active' | 'waived';

export type DerivedMilestoneStatus = 'pending' | 'partial' | 'paid' | 'waived';

/**
 * The five strings the consumer mobile app switches on are
 * `pending | partial | paid | waived | cancelled`, defaulting to `'LOCKED'` for
 * anything unrecognised — which would silently render a fully-paid milestone as
 * a greyed-out locked card. We emit four of the five and never `cancelled`;
 * `consumer-contract.spec.ts` freezes that.
 */
export function derivedMilestoneStatus(
  expectedPaise: number,
  allocatedPaise: number,
  rowStatus: MilestoneRowStatus,
): DerivedMilestoneStatus {
  if (rowStatus === 'waived') {
    return 'waived';
  }
  if (allocatedPaise <= 0) {
    return 'pending';
  }
  if (allocatedPaise >= expectedPaise) {
    return 'paid';
  }
  return 'partial';
}

/** Outstanding for a milestone. Clamped at zero — over-allocation is reported separately. */
export function milestoneBalancePaise(expectedPaise: number, allocatedPaise: number): number {
  return Math.max(0, expectedPaise - allocatedPaise);
}

/**
 * Over-allocation is legitimate (genuine overpayment, and 114 migrated projects
 * carry it), so it is surfaced as data rather than blocked by a constraint.
 */
export function milestoneOverAllocatedPaise(expectedPaise: number, allocatedPaise: number): number {
  return Math.max(0, allocatedPaise - expectedPaise);
}
