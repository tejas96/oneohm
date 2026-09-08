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
 * No existing row is affected: `chk_payment_milestones_status` still only
 * permits `active | waived`, so nothing can carry `status = 'cancelled'` until
 * whichever later task starts writing it also widens that constraint. Until
 * then this migration only changes how the views WOULD read such a row.
 */
export class MilestoneCancelledStatus1857010000000 implements MigrationInterface {
  name = 'MilestoneCancelledStatus1857010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const sql of ORG_CLEANUP_DROP_VIEWS) {
      await queryRunner.query(sql);
    }
    for (const sql of ORG_CLEANUP_CREATE_VIEWS) {
      await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The previous definition differs only in the two expressions above, and
    // both are forward-compatible: no row carries status 'cancelled' until the
    // cancellation service ships. Recreating from source is the honest revert.
    for (const sql of ORG_CLEANUP_DROP_VIEWS) {
      await queryRunner.query(sql);
    }
    for (const sql of ORG_CLEANUP_CREATE_VIEWS) {
      await queryRunner.query(sql);
    }
  }
}
