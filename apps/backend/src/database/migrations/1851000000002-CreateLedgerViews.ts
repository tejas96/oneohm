import { type MigrationInterface, type QueryRunner } from 'typeorm';

import { CREATE_LEDGER_VIEWS, DROP_LEDGER_VIEWS } from './sql/ledger/06-views.sql';

/**
 * CreateLedgerViews — M6 of the finance rebuild.
 *
 * `v_milestone_balance` and `v_project_balance` become the single definition of
 * "outstanding", replacing the eight-plus competing definitions scattered across
 * finance-aggregation, receipt.service, payment.repository and the frontend.
 *
 * Numbered 1851000000005 to leave room for the backfill migrations M3–M5
 * (…002 through …004), which must run before the append-only triggers in M7.
 */
export class CreateLedgerViews1851000000002 implements MigrationInterface {
  name = 'CreateLedgerViews1851000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of CREATE_LEDGER_VIEWS) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of DROP_LEDGER_VIEWS) {
      await queryRunner.query(statement);
    }
  }
}
