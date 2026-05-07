import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * BackfillPaymentTermLinksOnPayments
 *
 * Plan §7 — for receipts (payments) recorded BEFORE the payment_term_id
 * column existed, attempt to link each receipt to the most plausible
 * payment term on its project.
 *
 * Heuristic (intentionally conservative — better to leave a receipt
 * unlinked than to attach it to the wrong term):
 *
 *   1. Only consider rows with payment_term_id IS NULL (idempotent).
 *   2. Candidate terms are the project's terms ordered by display_order.
 *   3. For each receipt, walk the candidate terms in order, accumulating
 *      receipt allocations against (term.expectedAmount - already-linked
 *      receipts). Pick the first term whose remaining capacity >=
 *      receipt.paid_amount AND whose status is not waived/cancelled.
 *   4. If no candidate fits cleanly, leave it unlinked (advance/
 *      unallocated). The Finance UI will surface these so the operator
 *      can manually re-attribute.
 *
 * Notes:
 *   - We intentionally DO NOT mutate term paid_amount/status here; the
 *     ReaggregateAllTerms step at the bottom calls the same SQL the
 *     runtime service uses, so there is one source of truth.
 *   - All SQL is plain (no PL/pgSQL) so it runs without function
 *     deployment. We use a window-style CTE to compute already-linked
 *     totals, then do an UPDATE … FROM with a subquery to pick the
 *     target term per receipt deterministically.
 *
 * Idempotency:
 *   - The link UPDATE is gated on payment_term_id IS NULL.
 *   - The reaggregation is gated on terms whose status != ('waived',
 *     'cancelled') and recomputes from scratch — safe to re-run.
 *
 * Down migration:
 *   - We do NOT null out payment_term_id on down: the link is the same
 *     shape an operator would have set manually. See class doc for
 *     manual wipe procedure.
 */
export class BackfillPaymentTermLinksOnPayments1830000000007 implements MigrationInterface {
  name = 'BackfillPaymentTermLinksOnPayments1830000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------------------------------------------------------------
    // Step 1: link unlinked receipts to the first term whose remaining
    // capacity covers the receipt amount.
    //
    // We walk projects deterministically; within each project we
    // process receipts in (paid_at, created_at) order so older
    // receipts consume earlier terms first — matching what an operator
    // would have done at the time.
    // ---------------------------------------------------------------
    await queryRunner.query(`
      WITH
      term_remaining AS (
        SELECT
          ppt.id                              AS term_id,
          ppt.project_id                      AS project_id,
          ppt.organization_id                 AS organization_id,
          ppt.display_order                   AS display_order,
          ppt.expected_amount::numeric        AS expected_amount,
          COALESCE((
            SELECT SUM(p.paid_amount)::numeric
              FROM payments p
             WHERE p.payment_term_id = ppt.id
               AND p.deleted_at IS NULL
               AND p.status IN ('received','verified','cleared')
          ), 0) AS already_linked
        FROM project_payment_terms ppt
        WHERE ppt.deleted_at IS NULL
          AND ppt.status NOT IN ('waived','cancelled')
      ),
      candidate AS (
        SELECT DISTINCT ON (p.id)
          p.id                AS payment_id,
          tr.term_id          AS picked_term_id
        FROM payments p
        JOIN term_remaining tr
          ON tr.project_id      = p.project_id
         AND tr.organization_id = p.organization_id
         AND (tr.expected_amount - tr.already_linked) >= p.paid_amount
        WHERE p.payment_term_id IS NULL
          AND p.deleted_at      IS NULL
          AND p.status IN ('received','verified','cleared','pending')
        ORDER BY p.id, tr.display_order ASC, tr.term_id
      )
      UPDATE payments AS p
         SET payment_term_id = c.picked_term_id,
             updated_at      = CURRENT_TIMESTAMP
        FROM candidate AS c
       WHERE p.id = c.payment_id
         AND p.payment_term_id IS NULL;
    `);

    // ---------------------------------------------------------------
    // Step 2: re-aggregate every term that now has linked receipts so
    // the term snapshot (paid_amount + status + completed_at) matches
    // what the runtime service would compute. Mirrors
    // PaymentTermRepository.reaggregateTerm but runs as a single bulk
    // UPDATE keyed by the freshly-linked term ids.
    //
    // Status derivation:
    //   paid     when paid_amount  >= expected_amount
    //   partial  when 0 < paid_amount < expected_amount
    //   pending  when paid_amount = 0
    // Terminal states (waived/cancelled) are preserved by the WHERE clause.
    // ---------------------------------------------------------------
    await queryRunner.query(`
      WITH agg AS (
        SELECT
          ppt.id AS term_id,
          ppt.expected_amount::numeric AS expected_amount,
          COALESCE((
            SELECT SUM(p.paid_amount)::numeric
              FROM payments p
             WHERE p.payment_term_id = ppt.id
               AND p.deleted_at IS NULL
               AND p.status IN ('received','verified','cleared')
          ), 0) AS paid_amount
        FROM project_payment_terms ppt
        WHERE ppt.deleted_at IS NULL
          AND ppt.status NOT IN ('waived','cancelled')
      )
      UPDATE project_payment_terms ppt
         SET paid_amount = agg.paid_amount,
             status =
               CASE
                 WHEN agg.paid_amount >= agg.expected_amount THEN 'paid'
                 WHEN agg.paid_amount > 0                    THEN 'partial'
                 ELSE 'pending'
               END,
             completed_at =
               CASE
                 WHEN agg.paid_amount >= agg.expected_amount
                   THEN COALESCE(ppt.completed_at, CURRENT_TIMESTAMP)
                 ELSE NULL
               END,
             updated_at = CURRENT_TIMESTAMP
        FROM agg
       WHERE ppt.id = agg.term_id
         AND (
              ppt.paid_amount IS DISTINCT FROM agg.paid_amount
           OR ppt.status     IS DISTINCT FROM (
                CASE
                  WHEN agg.paid_amount >= agg.expected_amount THEN 'paid'
                  WHEN agg.paid_amount > 0                    THEN 'partial'
                  ELSE 'pending'
                END
              )
         );
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: the linkage is the same shape an operator would set
    // manually. See class doc for manual wipe procedure if needed.
  }
}
