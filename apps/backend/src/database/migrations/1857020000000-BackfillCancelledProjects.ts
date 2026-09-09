import { MigrationInterface, QueryRunner } from 'typeorm';

const NOTE = 'backfilled: cancelled before cleanup existed';

/**
 * Three projects were cancelled before deal-loss-and-cancellation cleanup
 * (Tasks 1–11) existed. They collected no money and never ran through the
 * new cancellation flow, so they still carry `active` payment milestones,
 * `cancelled_at`/`settled_at` left null, and roofs stuck on `converted` with
 * a live accepted quote blocking a re-quote. `v_milestone_balance` reports
 * every one of those milestones as still owed — measured 2026-09-09 at
 * ₹5,50,457 across the three projects — even though nobody will ever pay it
 * and nobody was ever going to be asked to.
 *
 * By the time this runs, the cancellation endpoint has also been used
 * (during verification of the rest of this feature) to properly cancel
 * several other projects: money collected, settlements answered, milestones
 * already `cancelled`, `settled_at` already stamped. This migration must not
 * disturb those. Every statement is scoped to cancelled projects with **zero
 * receipts** (`NOT EXISTS (... ledger_entries ... direction = 'in')`) — the
 * three legacy projects collected nothing, so that clause is exactly (and
 * only) what catches them. A handful of the properly-cancelled projects also
 * happen to have collected nothing and so match the same clause, but they
 * are harmless to re-touch: the `payment_milestones` update only flips rows
 * still `active`, which none of theirs are, and every other update uses
 * `COALESCE` on the already-stamped columns, so a value that is already set
 * is kept rather than overwritten. Anything with a receipt is left alone on
 * purpose — that needs a person to decide what happens to the cash, not a
 * migration guessing.
 *
 * A cancelled project's roof is also freed here: `customer_properties`
 * moves off `converted` to `lost`, and every live quote still open on that
 * roof is voided so the site can be re-quoted. Tasks are deliberately
 * untouched — there is no cancelled task status, and cancelled projects are
 * already filtered out of every task read.
 *
 * REVERTING: every row this migration actually changes gets the sentinel
 * text `NOTE` written into `cancel_reason` / `lost_reason` / `void_reason`,
 * and `down()` finds rows by matching that exact text — never by re-deriving
 * "which projects were legacy". That also means it is precise: a project
 * that was already properly cancelled (and so was a COALESCE no-op in
 * `up()`) never carries `NOTE`, so `down()` cannot touch it either. The one
 * precondition: if anyone hand-edits `cancel_reason`, `lost_reason` or
 * `void_reason` on a backfilled row after this runs (e.g. giving the project
 * a real cancellation note), `down()` will no longer find that row and will
 * silently leave it as is rather than guess which row it used to be —
 * confirm with `SELECT ... WHERE cancel_reason = '<NOTE>'` before reverting
 * if this has been live for a while.
 *
 * Statement order inside `down()` is the exact reverse of `up()` with one
 * deliberate swap: the `payment_milestones` revert runs BEFORE the
 * `projects` revert, not after. The `payment_milestones` statement finds its
 * rows via `project_id IN (SELECT id FROM projects WHERE cancel_reason =
 * NOTE)` — if the `projects` revert (which clears `cancel_reason` back to
 * null) ran first, that subquery would already return nothing and the
 * milestone revert would silently match zero rows. Swapping the two keeps
 * every statement's own SQL untouched and makes `down()` actually undo what
 * `up()` did, instead of leaving milestones stuck on `cancelled`.
 */
export class BackfillCancelledProjects1857020000000 implements MigrationInterface {
  name = 'BackfillCancelledProjects1857020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Only projects where nothing was ever collected. Anything with cash needs
    // a person to decide what is kept, and this migration must not guess.
    await queryRunner.query(`
      UPDATE payment_milestones m SET status = 'cancelled', updated_at = now()
       WHERE m.status = 'active'
         AND m.project_id IN (
           SELECT p.id FROM projects p
            WHERE p.status = 'cancelled' AND p.deleted_at IS NULL
              AND NOT EXISTS (SELECT 1 FROM ledger_entries e
                               WHERE e.project_id = p.id AND e.direction = 'in')
         )
    `);

    await queryRunner.query(`
      UPDATE projects p
         SET cancelled_at  = COALESCE(p.cancelled_at, p.updated_at),
             settled_at    = COALESCE(p.settled_at, p.updated_at),
             loss_reason   = COALESCE(p.loss_reason, 'other'),
             cancel_reason = COALESCE(p.cancel_reason, '${NOTE}')
       WHERE p.status = 'cancelled' AND p.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM ledger_entries e
                          WHERE e.project_id = p.id AND e.direction = 'in')
    `);

    await queryRunner.query(`
      UPDATE customer_properties cp
         SET status = 'lost', lost_reason = '${NOTE}', loss_reason = 'other',
             lost_at = COALESCE(cp.lost_at, now()), updated_at = now()
       WHERE cp.status = 'converted'
         AND EXISTS (SELECT 1 FROM projects p
                      WHERE p.property_id = cp.id AND p.status = 'cancelled'
                        AND p.deleted_at IS NULL AND p.settled_at IS NOT NULL)
         AND NOT EXISTS (SELECT 1 FROM projects p
                          WHERE p.property_id = cp.id AND p.status <> 'cancelled'
                            AND p.deleted_at IS NULL)
    `);

    // Free the roof so it can be quoted again.
    await queryRunner.query(`
      UPDATE quotes q SET voided_at = now(), void_reason = '${NOTE}'
       WHERE q.voided_at IS NULL AND q.deleted_at IS NULL
         AND q.property_id IN (
           SELECT cp.id FROM customer_properties cp
            WHERE cp.status = 'lost' AND cp.lost_reason = '${NOTE}'
         )
    `);

    // Tasks are deliberately untouched: there is no cancelled task status, and
    // cancelled projects are already filtered out of every task read.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE quotes SET voided_at = NULL, void_reason = NULL WHERE void_reason = '${NOTE}'`,
    );
    await queryRunner.query(
      `UPDATE customer_properties SET status = 'converted', lost_reason = NULL,
              loss_reason = NULL, lost_at = NULL WHERE lost_reason = '${NOTE}'`,
    );
    // Must run BEFORE the `projects` revert below — it looks up projects by
    // `cancel_reason = NOTE`, which the next statement clears. See the
    // "Statement order" note in the class JSDoc above.
    await queryRunner.query(
      `UPDATE payment_milestones SET status = 'active'
        WHERE status = 'cancelled'
          AND project_id IN (SELECT id FROM projects WHERE cancel_reason = '${NOTE}')`,
    );
    await queryRunner.query(
      `UPDATE projects SET cancelled_at = NULL, settled_at = NULL, loss_reason = NULL,
              cancel_reason = NULL WHERE cancel_reason = '${NOTE}'`,
    );
  }
}
