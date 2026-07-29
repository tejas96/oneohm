/**
 * M3 — `project_payment_terms` → `payment_milestones`.
 *
 * Ids are PRESERVED. That keeps the before/after review CSV trivially
 * diffable, and keeps any external reference to a term id valid.
 *
 * Three predicate decisions, each of which aborts the whole migration chain if
 * you get it wrong (`run-migrations.ts` uses `transaction: 'all'`, so M1–M7 is
 * one transaction):
 *
 *  1. `deleted_at IS NULL` is mandatory. The source unique index
 *     `idx_payment_terms_project_order` is PARTIAL on `deleted_at IS NULL`, so
 *     soft-deleted rows legitimately duplicate `(project_id, display_order)` —
 *     6 such pairs exist in the data. Copying them into the new
 *     `uq_payment_milestones_project_order` would fail.
 *  2. `display_order` is RENUMBERED with `ROW_NUMBER()` rather than copied.
 *     Excluding soft-deleted rows can leave gaps, and gaps are fine, but
 *     renumbering also removes any residual collision risk.
 *  3. `status='cancelled'` terms are excluded — that state does not exist in
 *     the new model. Asserted to be zero before the run; the assertion is what
 *     turns a silent data loss into a loud failure.
 *
 * `created_by` is copied as-is including NULLs: 39 of 84 live rows have no
 * creator recorded, there is no system user account to attribute them to, and
 * inventing a UUID would violate an FK to `users` if one is ever added.
 * `payment_milestones.created_by` is NULLable for exactly this reason.
 *
 * Amounts convert with `ROUND(expected_amount * 100)` per row and NO remainder
 * correction. Contract value is *defined* as the sum of milestones from this
 * point on, so there is nothing to reconcile against. (The remainder-to-final
 * rule applies only to new percentage-derived schedules and change orders.)
 */

/** Must return zero rows before M3 runs. */
export const ASSERT_NO_CANCELLED_TERMS = `
  DO $$
  DECLARE n INTEGER;
  BEGIN
    SELECT COUNT(*) INTO n
      FROM project_payment_terms
     WHERE deleted_at IS NULL AND status = 'cancelled';
    IF n > 0 THEN
      RAISE EXCEPTION
        'M3: % cancelled payment terms exist; the new model has no cancelled state. Resolve them before migrating.', n;
    END IF;
  END $$
`;

/** Must return zero rows before M3 runs — a non-positive amount cannot be represented. */
export const ASSERT_NO_NONPOSITIVE_TERM_AMOUNTS = `
  DO $$
  DECLARE n INTEGER;
  BEGIN
    SELECT COUNT(*) INTO n
      FROM project_payment_terms
     WHERE deleted_at IS NULL AND (expected_amount IS NULL OR expected_amount <= 0);
    IF n > 0 THEN
      RAISE EXCEPTION
        'M3: % payment terms have a null or non-positive expected_amount and would be silently dropped.', n;
    END IF;
  END $$
`;

export const BACKFILL_PAYMENT_MILESTONES = `
  INSERT INTO payment_milestones (
    id, organization_id, project_id,
    source, source_quote_version_id,
    stage, name, description, display_order,
    amount_paise, percentage, payer_type,
    due_date, due_date_source,
    status, waived_reason, waived_at, waived_by,
    notes,
    created_at, updated_at, created_by, updated_by
  )
  SELECT
    t.id,
    t.organization_id,
    t.project_id,
    CASE WHEN t.source = 'quote_snapshot' THEN 'quote_snapshot' ELSE 'manual' END,
    t.source_quote_version_id,
    t.stage,
    t.name,
    t.description,
    ROW_NUMBER() OVER (PARTITION BY t.project_id ORDER BY t.display_order, t.id)::int,
    ROUND(t.expected_amount * 100)::BIGINT,
    CASE WHEN t.expected_percentage > 0 AND t.expected_percentage <= 100
         THEN t.expected_percentage END,
    'customer',
    t.due_date,
    CASE WHEN t.due_date IS NOT NULL THEN 'manual' ELSE 'unset' END,
    CASE WHEN t.status = 'waived' THEN 'waived' ELSE 'active' END,
    t.waived_reason,
    CASE WHEN t.status = 'waived' THEN COALESCE(t.completed_at, t.updated_at) END,
    CASE WHEN t.status = 'waived' THEN t.updated_by END,
    t.notes,
    t.created_at,
    t.updated_at,
    t.created_by,
    t.updated_by
  FROM project_payment_terms t
  WHERE t.deleted_at IS NULL
    AND t.status <> 'cancelled'
`;

/**
 * `expected_percentage` is display-only, but the new table constrains it to
 * (0, 100]. A stray 0 or out-of-range value in the 533 live terms would abort
 * the entire M1-M7 transaction on a raw constraint name instead of failing a
 * readable gate. Report it up front rather than discovering it at cutover.
 */
export const ASSERT_PERCENTAGES_IN_RANGE = `
  DO $$
  DECLARE n INTEGER;
  BEGIN
    SELECT COUNT(*) INTO n
      FROM project_payment_terms
     WHERE deleted_at IS NULL
       AND expected_percentage IS NOT NULL
       AND (expected_percentage <= 0 OR expected_percentage > 100);
    IF n > 0 THEN
      RAISE NOTICE 'M3: % terms have an out-of-range expected_percentage; it will be nulled (display-only, amount_paise is authoritative).', n;
    END IF;
  END $$
`;

export const BACKFILL_MILESTONES: string[] = [
  ASSERT_NO_CANCELLED_TERMS,
  ASSERT_NO_NONPOSITIVE_TERM_AMOUNTS,
  ASSERT_PERCENTAGES_IN_RANGE,
  BACKFILL_PAYMENT_MILESTONES,
];

export const UNDO_BACKFILL_MILESTONES: string[] = [`DELETE FROM payment_milestones`];
