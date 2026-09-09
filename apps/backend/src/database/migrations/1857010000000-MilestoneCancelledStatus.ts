import { MigrationInterface, QueryRunner } from 'typeorm';

import { ORG_CLEANUP_CREATE_VIEWS, ORG_CLEANUP_DROP_VIEWS } from './sql/org-cleanup/04-views.sql';

/**
 * MilestoneCancelledStatus — the read side of project cancellation.
 *
 * `payment_milestones.status` today is only `active | waived`; there is no way
 * to mark a milestone as no-longer-collectable without either pretending it
 * was paid or leaving it `active` and perpetually overdue. The cancellation
 * flow lands in a later task and needs a third value, `cancelled`, whose
 * unpaid balance must stop counting as money the customer owes — without
 * losing any cash already collected against it.
 *
 * `v_milestone_balance.balance_paise` and `.derived_status` are widened to
 * recognise `status = 'cancelled'`: balance forced to zero, status reported as
 * `'cancelled'`, while `expected_paise` stays at the contracted figure so the
 * cancelled amount is still visible — just no longer outstanding.
 * `derivedMilestoneStatus()` in `modules/ledger/domain/derived-status.ts` is
 * the TypeScript mirror of this same CASE expression; `derived-status.spec.ts`
 * pins the outcome table so the two cannot drift apart silently.
 *
 * SOURCED FROM sql/org-cleanup/04-views.sql.ts, NOT sql/ledger/06-views.sql.ts.
 * `06`'s `CREATE_V_MILESTONE_BALANCE` still selects the `m.organization_id`
 * column that RemoveOrganizations1852000000000 dropped from `payment_milestones`
 * two migrations after creating it — `06` was never updated afterwards, because
 * nothing re-ran it. `04-views.sql.ts`'s `_V2` constants are the copy that
 * migration actually installed and that every current database runs; its own
 * header names them the current source for exactly this reason. Building this
 * migration from `06` instead compiles, matches the task brief that named it,
 * and then fails outright with `column m.organization_id does not exist` on
 * every database that has gone through org cleanup — proven by running this
 * migration to completion against both the project's real `oneohm-postgres`
 * container and a disposable from-genesis Postgres instance seeded with one
 * organization row, so the org-cleanup migration itself would run. Both refused
 * it identically. `06`'s copy of the two CASE expressions was still edited to
 * match, purely so a reader who only ever looks at `06` does not see it drift
 * from `derivedMilestoneStatus()` — but nothing here executes that copy again.
 *
 * Both views are dropped and recreated in full (`ORG_CLEANUP_DROP_VIEWS` /
 * `ORG_CLEANUP_CREATE_VIEWS`, which also carries `v_milestone_completion` and
 * the contract-composition assertion along for the ride) rather than patched
 * with `CREATE OR REPLACE`, because `v_project_balance` selects from
 * `v_milestone_balance` and Postgres refuses to `CREATE OR REPLACE` a view out
 * from under a column expression a dependent view reads. Reusing the existing
 * drop/create pair — rather than hand-rolling a narrower one — is what keeps
 * `v_project_balance` rebuilt from `CREATE_V_PROJECT_BALANCE_V2` (which carries
 * `quoted_paise` / `change_order_paise`) instead of from `06`'s own
 * `CREATE_V_PROJECT_BALANCE`, which lacks both columns and would have silently
 * reintroduced the exact bug 1851000000012-ContractComposition.ts fixed.
 *
 * This migration also widens `chk_payment_milestones_status` itself, from
 * `active | waived` to `active | waived | cancelled`. Verified directly
 * against the live database: without this, the status this task exists to
 * introduce is rejected outright, and Task 2's entire claim — that a
 * milestone can carry `status = 'cancelled'` — would be false while the
 * narrower constraint stood. A later task's `UPDATE ... SET status =
 * 'cancelled'` depends on this constraint already accepting the value. The
 * constraint change runs first, before either view is touched, so a failure
 * there leaves both views exactly as they were. `down()` restores the
 * two-value version — but only while it can. Postgres validates a `CHECK`
 * constraint against every existing row at the moment it is (re-)added, so
 * that first statement in `down()` fails outright the moment any
 * `payment_milestones` row already carries `status = 'cancelled'` — which
 * Task 7 and Task 12 later in this same plan both do. That failure is
 * intentional, not a regression: reverting past this migration once
 * cancellation has shipped requires deciding what those cancelled milestones
 * become — reactivated, deleted, or something else — a data decision this
 * migration cannot make on a caller's behalf, so whoever reverts must resolve
 * it first, before `down()` can succeed.
 *
 * `chk_payment_milestones_waive_fields` — which reads `(status = 'waived') =
 * (waived_at IS NOT NULL)` — is deliberately left alone: a cancelled row
 * satisfies it as long as it was `active` beforehand, and every caller
 * cancels only `active` rows, so widening it would weaken a real invariant
 * for no reason.
 */
export class MilestoneCancelledStatus1857010000000 implements MigrationInterface {
  name = 'MilestoneCancelledStatus1857010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Widen the CHECK constraint before touching either view: if this fails,
    // nothing below has run yet, so a failure here leaves nothing half-applied.
    await queryRunner.query(`
      ALTER TABLE payment_milestones DROP CONSTRAINT chk_payment_milestones_status;
      ALTER TABLE payment_milestones ADD CONSTRAINT chk_payment_milestones_status
        CHECK (status IN ('active', 'waived', 'cancelled'));
    `);

    for (const sql of ORG_CLEANUP_DROP_VIEWS) {
      await queryRunner.query(sql);
    }
    for (const sql of ORG_CLEANUP_CREATE_VIEWS) {
      await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the two-value constraint first, mirroring up()'s ordering: a
    // failure here leaves the views (rebuilt below) as the only side effect
    // still to run, rather than leaving the constraint change half-applied
    // alongside an already-rebuilt view pair.
    await queryRunner.query(`
      ALTER TABLE payment_milestones DROP CONSTRAINT chk_payment_milestones_status;
      ALTER TABLE payment_milestones ADD CONSTRAINT chk_payment_milestones_status
        CHECK (status IN ('active', 'waived'));
    `);

    // The previous view definition differs from this one only in the two
    // expressions this migration changed (balance_paise, derived_status),
    // and both add a branch for status = 'cancelled' that is unreachable
    // while no row carries it. Recreating from source is therefore an honest
    // revert of the views ONLY under that same precondition — the one the
    // constraint restore above already enforces, by failing first and loudly
    // if it does not hold. See this file's top-level JSDoc for what reverting
    // requires once it doesn't.
    for (const sql of ORG_CLEANUP_DROP_VIEWS) {
      await queryRunner.query(sql);
    }
    for (const sql of ORG_CLEANUP_CREATE_VIEWS) {
      await queryRunner.query(sql);
    }
  }
}
