/**
 * Receipt → milestone allocation.
 *
 * This is the fix for the defect that put ₹1,04,24,814 on the wrong milestone
 * across 114 production projects. The old backfill
 * (`1830000000007-BackfillPaymentTermLinksOnPayments.ts:57-88`) computed
 * `already_linked` **once** in a CTE for every row, so every unlinked receipt
 * saw milestone 1 at full capacity and picked it — a set-based query pretending
 * to be an iterative loop. Milestone 1 ended up with 182 receipts; milestone 2
 * with 5.
 *
 * The rule here is a FIFO waterfall: a receipt fills milestones in order and
 * spills the remainder into the next one. A receipt bigger than the whole
 * remaining contract leaves its excess **unallocated** — surfaced as customer
 * credit, never forced onto the last milestone and never silently dropped.
 *
 * This function is the single runtime definition of allocation. The migration
 * implements the same rule set-based (as interval intersection), and the
 * dry-run asserts the two agree row-for-row over all real production data —
 * see the differential oracle in the rebuild plan.
 */

export interface MilestoneCapacity {
  milestoneId: string;
  /** `expected_paise - already_allocated_paise`. Non-positive means full. */
  capacityPaise: number;
}

export interface Allocation {
  milestoneId: string;
  amountPaise: number;
}

export interface AllocationResult {
  allocations: Allocation[];
  /** Money that had nowhere to go — customer credit. Never negative. */
  unallocatedPaise: number;
}

/**
 * Distribute `amountPaise` across `capacities` in order, filling each before
 * moving to the next.
 *
 * `capacities` must already be ordered `(display_order, id)` and must exclude
 * waived milestones — a waived milestone absorbs nothing.
 *
 * Invariants (asserted in the spec):
 *   - `Σ allocations + unallocatedPaise === amountPaise`
 *   - `∀ i: allocations[i].amountPaise <= capacities[i].capacityPaise`
 *   - every emitted allocation is strictly positive
 */
export function allocateWaterfall(
  capacities: MilestoneCapacity[],
  amountPaise: number,
): AllocationResult {
  if (!Number.isInteger(amountPaise)) {
    throw new Error(`allocateWaterfall: expected integer paise, got ${amountPaise}`);
  }
  if (amountPaise <= 0) {
    throw new Error(`allocateWaterfall: amountPaise must be > 0, got ${amountPaise}`);
  }

  const allocations: Allocation[] = [];
  let remaining = amountPaise;

  for (const capacity of capacities) {
    if (remaining === 0) {
      break;
    }
    if (!Number.isInteger(capacity.capacityPaise)) {
      throw new Error(
        `allocateWaterfall: capacity for ${capacity.milestoneId} is not an integer: ${capacity.capacityPaise}`,
      );
    }
    // Already full (or over-allocated, which is legitimate on migrated data).
    if (capacity.capacityPaise <= 0) {
      continue;
    }

    const take = Math.min(remaining, capacity.capacityPaise);
    allocations.push({ milestoneId: capacity.milestoneId, amountPaise: take });
    remaining -= take;
  }

  return { allocations, unallocatedPaise: remaining };
}

/**
 * Validate an operator-supplied allocation against the receipt and the project's
 * milestones. Finance sometimes knows better than the waterfall — but the total
 * must still reconcile and every milestone must belong to this project.
 */
export function assertValidManualAllocation(
  allocations: Allocation[],
  amountPaise: number,
  validMilestoneIds: ReadonlySet<string>,
  capacityByMilestone?: ReadonlyMap<string, number>,
): void {
  if (allocations.length === 0) {
    throw new Error('allocations must not be empty');
  }
  for (const a of allocations) {
    if (!Number.isInteger(a.amountPaise) || a.amountPaise <= 0) {
      throw new Error(`allocation for ${a.milestoneId} must be a positive integer paise amount`);
    }
    if (!validMilestoneIds.has(a.milestoneId)) {
      throw new Error(`milestone ${a.milestoneId} does not belong to this project`);
    }
  }

  const seen = new Set<string>();
  for (const a of allocations) {
    if (seen.has(a.milestoneId)) {
      throw new Error(`duplicate allocation for milestone ${a.milestoneId}`);
    }
    seen.add(a.milestoneId);
  }

  const total = allocations.reduce((sum, a) => sum + a.amountPaise, 0);
  if (total > amountPaise) {
    throw new Error(
      `allocations (${total}) exceed the entry amount (${amountPaise}) — that would create money`,
    );
  }

  // Per-milestone capacity. Without this, a manual allocation can put twice a
  // milestone's amount onto it — over-allocating it while the project total
  // still reconciles, which is exactly the project-vs-milestone divergence the
  // views were fixed to prevent.
  if (capacityByMilestone) {
    for (const a of allocations) {
      const capacity = capacityByMilestone.get(a.milestoneId) ?? 0;
      if (a.amountPaise > capacity) {
        throw new Error(
          `allocation of ${a.amountPaise} to milestone ${a.milestoneId} exceeds its remaining ${capacity}`,
        );
      }
    }
  }
}
