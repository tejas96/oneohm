/**
 * Draw unapplied customer credit onto milestones that were created after the
 * money arrived.
 *
 * THE DEFECT. Allocation happened in exactly one place — at the moment a
 * receipt was recorded — against whatever milestones existed then. Raise a
 * change order afterwards and the new milestone starts at zero, however much
 * credit the customer already has sitting on the project. The project then
 * reports an outstanding balance for a customer who has overpaid, and that
 * milestone joins the receivables chase list.
 *
 * WHY THIS IS SAFE UNDER APPEND-ONLY. Nothing here updates or deletes an
 * allocation. It only INSERTs new rows that consume an entry's *unspent*
 * remainder, so every historical row stays exactly as it was posted.
 *
 * THE PREDICATE THAT MATTERS — `NOT EXISTS (… r.reverses_id = e.id)`.
 * Reversal mirrors are written against the REVERSING entry, never against the
 * original. So a bounced receipt keeps its own positive remainder forever. Draw
 * from it and you would mark a milestone paid with money that never cleared —
 * and the append-only guard would happily allow it, because per-entry the sums
 * still balance. Both sides of a reversal pair are excluded outright. Never
 * negate, never ABS, never net the pair.
 *
 * `payer_type = 'customer'` only. `ledger_entries` carries no source-of-funds
 * column, so once a bank disbursement is in the ledger it is indistinguishable
 * from customer cash. Sweeping customer credit onto a lender milestone would
 * quietly report the bank as paid.
 *
 * The geometry is the same interval intersection as the M5 waterfall: lay each
 * entry's remainder and each milestone's balance on one number line per project
 * and allocate the overlap. Σ per entry ≤ its remainder and Σ per milestone ≤
 * its balance both fall out of the algebra rather than out of testing.
 */
export const SWEEP_EXISTING_CREDIT = `
  WITH credit AS (
    SELECT e.project_id,
           e.id           AS entry_id,
           e.created_by,
           e.value_date,
           e.created_at,
           (e.amount_paise - COALESCE(SUM(a.amount_paise), 0))::BIGINT AS remainder
      FROM ledger_entries e
      LEFT JOIN ledger_allocations a ON a.entry_id = e.id
     WHERE e.direction = 'in'
       AND e.reverses_id IS NULL
       AND e.amount_paise > 0
       AND NOT EXISTS (
         SELECT 1 FROM ledger_entries r WHERE r.reverses_id = e.id
       )
     GROUP BY e.id, e.project_id, e.created_by, e.value_date, e.created_at, e.amount_paise
    HAVING (e.amount_paise - COALESCE(SUM(a.amount_paise), 0)) > 0
  ), c AS (
    SELECT credit.*,
      COALESCE(SUM(remainder) OVER (
        PARTITION BY project_id ORDER BY value_date, created_at, entry_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0)::BIGINT AS lo,
      SUM(remainder) OVER (
        PARTITION BY project_id ORDER BY value_date, created_at, entry_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)::BIGINT AS hi
    FROM credit
  ), open_ms AS (
    SELECT v.milestone_id, v.project_id, v.balance_paise, v.display_order
      FROM v_milestone_balance v
     WHERE v.status = 'active'
       AND v.balance_paise > 0
       AND v.payer_type = 'customer'
  ), m AS (
    SELECT open_ms.*,
      COALESCE(SUM(balance_paise) OVER (
        PARTITION BY project_id ORDER BY display_order, milestone_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0)::BIGINT AS lo,
      SUM(balance_paise) OVER (
        PARTITION BY project_id ORDER BY display_order, milestone_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)::BIGINT AS hi
    FROM open_ms
  )
  INSERT INTO ledger_allocations (entry_id, milestone_id, project_id, amount_paise, is_inferred, created_by)
  SELECT c.entry_id,
         m.milestone_id,
         c.project_id,
         (LEAST(c.hi, m.hi) - GREATEST(c.lo, m.lo))::BIGINT,
         true,
         c.created_by
    FROM c
    JOIN m ON m.project_id = c.project_id
   WHERE LEAST(c.hi, m.hi) > GREATEST(c.lo, m.lo)
`;

/** No milestone may end up holding more than it expects. */
export const ASSERT_SWEEP_NO_OVER_ALLOCATED_MILESTONES = `
  DO $$
  DECLARE bad INT;
  BEGIN
    SELECT COUNT(*) INTO bad
      FROM v_milestone_balance
     WHERE allocated_paise > expected_paise;
    IF bad > 0 THEN
      RAISE EXCEPTION 'SweepExistingCredit: % milestone(s) over-allocated after sweep', bad;
    END IF;
  END $$
`;

/** No entry may end up allocating more than it carries. */
export const ASSERT_SWEEP_NO_OVER_ALLOCATED_ENTRIES = `
  DO $$
  DECLARE bad INT;
  BEGIN
    SELECT COUNT(*) INTO bad FROM (
      SELECT e.id
        FROM ledger_entries e
        JOIN ledger_allocations a ON a.entry_id = e.id
       GROUP BY e.id, e.amount_paise
      HAVING ABS(SUM(a.amount_paise)) > ABS(e.amount_paise)
    ) x;
    IF bad > 0 THEN
      RAISE EXCEPTION 'SweepExistingCredit: % entry/entries over-allocated after sweep', bad;
    END IF;
  END $$
`;

/**
 * Conservation. Every rupee received is either attributed to a milestone or
 * sitting as credit — the sweep moves money between those two buckets and must
 * never change their total.
 */
export const ASSERT_SWEEP_CONSERVATION = `
  DO $$
  DECLARE bad INT;
  BEGIN
    SELECT COUNT(*) INTO bad
      FROM v_project_balance vb
     WHERE vb.received_paise <> (
       COALESCE((SELECT SUM(a.amount_paise)
                   FROM ledger_allocations a
                   JOIN ledger_entries e ON e.id = a.entry_id
                  WHERE e.project_id = vb.project_id), 0)
       + vb.unallocated_paise
     );
    IF bad > 0 THEN
      RAISE EXCEPTION 'SweepExistingCredit: conservation broken on % project(s)', bad;
    END IF;
  END $$
`;

export const SWEEP_CREDIT: string[] = [
  SWEEP_EXISTING_CREDIT,
  ASSERT_SWEEP_NO_OVER_ALLOCATED_MILESTONES,
  ASSERT_SWEEP_NO_OVER_ALLOCATED_ENTRIES,
  ASSERT_SWEEP_CONSERVATION,
];

/**
 * The runtime equivalent, scoped to one project.
 *
 * Shared verbatim with `LedgerWriteService.sweepCreditOntoMilestone` so the
 * migration and the live path cannot drift on which rupee is spent first.
 * Ordered `(value_date, created_at, id)` — identical to the M5 waterfall.
 *
 * $1 = projectId. Returns one row per entry with spendable credit.
 */
export const SELECT_PROJECT_CREDIT_REMAINDERS = `
  SELECT e.id                                                        AS "entryId",
         (e.amount_paise - COALESCE(SUM(a.amount_paise), 0))::BIGINT AS "remainderPaise",
         e.created_by                                                AS "createdBy"
    FROM ledger_entries e
    LEFT JOIN ledger_allocations a ON a.entry_id = e.id
   WHERE e.project_id = $1
     AND e.direction = 'in'
     AND e.reverses_id IS NULL
     AND e.amount_paise > 0
     AND NOT EXISTS (
       SELECT 1 FROM ledger_entries r WHERE r.reverses_id = e.id
     )
   GROUP BY e.id, e.amount_paise, e.created_by, e.value_date, e.created_at
  HAVING (e.amount_paise - COALESCE(SUM(a.amount_paise), 0)) > 0
   ORDER BY e.value_date, e.created_at, e.id
`;

/**
 * Lock the project's credit-bearing entries before computing remainders.
 *
 * This MUST be a separate statement from the remainder read. Postgres runs READ
 * COMMITTED here, so each statement takes a fresh snapshot: a sweep that blocks
 * on this lock will, once released, re-read remainders in a NEW snapshot that
 * includes the other sweep's committed allocations. Fold the lock into a CTE
 * with the aggregate and both sweeps compute against the same pre-lock snapshot
 * and double-spend the same credit.
 *
 * $1 = projectId.
 */
export const LOCK_PROJECT_CREDIT_ENTRIES = `
  SELECT e.id
    FROM ledger_entries e
   WHERE e.project_id = $1
     AND e.direction = 'in'
     AND e.reverses_id IS NULL
     AND e.amount_paise > 0
   ORDER BY e.value_date, e.created_at, e.id
     FOR UPDATE
`;
