/**
 * M5 — derive `ledger_allocations` by FIFO waterfall.
 *
 * This is the fix for ₹1,04,24,814 sitting on the wrong milestone across 114
 * production projects.
 *
 * WHY THE OLD ONE BROKE. `1830000000007-BackfillPaymentTermLinksOnPayments.ts:57-88`
 * computed `already_linked` ONCE, in a CTE, for every row. So every unlinked
 * receipt saw milestone 1 at its original capacity and picked it — a set-based
 * query pretending to be an iterative loop. Milestone 1 ended up with 182
 * receipts; milestone 2 with 5.
 *
 * THE FIX, and why it structurally cannot repeat that mistake. Lay both
 * sequences on the same number line per project:
 *
 *     milestones:  |--- M1 ---|-------- M2 --------|--- M3 ---|
 *     receipts:    |------ R1 ------|--- R2 ---|
 *                  0        14,444.42      1,44,444.20
 *
 * Receipt k occupies `[Σ prior receipts, Σ through k)`. Milestone j occupies
 * `[Σ prior milestones, Σ through j)`. **The allocation from receipt k to
 * milestone j is the length of their intersection.** No running state, no
 * order-of-evaluation dependency, no CTE snapshot to go stale.
 *
 * Properties that follow from the geometry rather than from testing:
 *   - Σ allocations for a receipt ≤ the receipt (intersections ⊆ its interval)
 *   - Σ allocations for a milestone ≤ the milestone → **zero over-allocated
 *     milestones by construction**, which is precisely gate R7
 *   - a receipt beyond the contract total intersects nothing → stays unallocated
 *     and surfaces as customer credit
 *
 * Ordering is total, so the result is deterministic: milestones by
 * `(display_order, id)`, receipts by `(value_date, created_at, id)`.
 *
 * Waived milestones are excluded — they absorb nothing.
 * Reversals (`reverses_id IS NOT NULL`) are excluded: a reversed receipt's
 * allocations are mirrored explicitly by the reversal path, not re-derived here.
 *
 * `is_inferred = true` marks every row as migration-derived, exactly as
 * `value_date_is_inferred` marks backfilled dates. The existing
 * `payments.payment_term_id` is deliberately IGNORED — that column *is* the
 * corrupted data. It survives forever via `ledger_entries.source_id`.
 */

export const ALLOCATE_WATERFALL = `
  WITH ms AS (
    SELECT
      m.id,
      m.project_id,
      COALESCE(
        SUM(m.amount_paise) OVER (
          PARTITION BY m.project_id ORDER BY m.display_order, m.id
          ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ), 0
      )::BIGINT AS lo,
      SUM(m.amount_paise) OVER (
        PARTITION BY m.project_id ORDER BY m.display_order, m.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      )::BIGINT AS hi
    FROM payment_milestones m
    WHERE m.status = 'active'
  ),
  rc AS (
    SELECT
      e.id AS entry_id,
      e.project_id,
      e.created_by,
      COALESCE(
        SUM(e.amount_paise) OVER (
          PARTITION BY e.project_id ORDER BY e.value_date, e.created_at, e.id
          ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ), 0
      )::BIGINT AS lo,
      SUM(e.amount_paise) OVER (
        PARTITION BY e.project_id ORDER BY e.value_date, e.created_at, e.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      )::BIGINT AS hi
    FROM ledger_entries e
    WHERE e.direction = 'in'
      AND e.reverses_id IS NULL
  )
  INSERT INTO ledger_allocations (entry_id, milestone_id, project_id, amount_paise, is_inferred, created_by)
  SELECT
    rc.entry_id,
    ms.id,
    rc.project_id,
    (LEAST(rc.hi, ms.hi) - GREATEST(rc.lo, ms.lo))::BIGINT,
    true,
    rc.created_by
  FROM rc
  JOIN ms ON ms.project_id = rc.project_id
  WHERE LEAST(rc.hi, ms.hi) > GREATEST(rc.lo, ms.lo)
`;

/**
 * Gate R7 — the assertion this whole migration exists to satisfy.
 * Must hold immediately after the waterfall runs.
 */
export const ASSERT_NO_OVER_ALLOCATED_MILESTONES = `
  DO $$
  DECLARE n INTEGER;
  BEGIN
    SELECT COUNT(*) INTO n FROM v_milestone_balance WHERE over_allocated_paise > 0;
    IF n > 0 THEN
      RAISE EXCEPTION 'M5: % milestones are over-allocated after the waterfall; this must be impossible.', n;
    END IF;
  END $$
`;

/** No receipt may have more allocated than it carries — that would create money. */
export const ASSERT_NO_OVER_ALLOCATED_ENTRIES = `
  DO $$
  DECLARE n INTEGER;
  BEGIN
    SELECT COUNT(*) INTO n FROM (
      SELECT a.entry_id
        FROM ledger_allocations a
        JOIN ledger_entries e ON e.id = a.entry_id
       GROUP BY a.entry_id, e.amount_paise
      HAVING ABS(SUM(a.amount_paise)) > ABS(e.amount_paise)
    ) x;
    IF n > 0 THEN
      RAISE EXCEPTION 'M5: % entries are over-allocated after the waterfall.', n;
    END IF;
  END $$
`;

export const ALLOCATE_LEDGER: string[] = [
  ALLOCATE_WATERFALL,
  ASSERT_NO_OVER_ALLOCATED_MILESTONES,
  ASSERT_NO_OVER_ALLOCATED_ENTRIES,
];

export const UNDO_ALLOCATE_LEDGER: string[] = [`DELETE FROM ledger_allocations`];
