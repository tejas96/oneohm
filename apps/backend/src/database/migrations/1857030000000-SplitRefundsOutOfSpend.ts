import { type MigrationInterface, type QueryRunner } from 'typeorm';

import { ORG_CLEANUP_CREATE_VIEWS, ORG_CLEANUP_DROP_VIEWS } from './sql/org-cleanup/04-views.sql';

/**
 * A refund is not money the job cost.
 *
 * `v_project_balance.spent_paise` summed every outbound ledger row. Until this
 * release the only outbound rows were expenses, so that was true. Project
 * cancellation introduced refunds, and a cancelled project with no expenses at
 * all then reported "SPENT ₹45,000" on its money card — the amount handed back
 * to the customer, presented as the cost of delivering the work.
 *
 * `spent_paise` now excludes refunds and a sibling `refunded_paise` carries
 * them. `net_cash_paise` subtracts both, because a refund did leave the bank:
 * separating the two must not quietly inflate the cash position.
 *
 * Rebuilt from the org-cleanup constants, which are the live definitions —
 * `sql/ledger/06-views.sql.ts` is superseded and still selects a dropped
 * `organization_id`.
 *
 * REVERTING: safe at any time. The prior definition simply folds refunds back
 * into `spent_paise`, and no stored data depends on either column.
 */
export class SplitRefundsOutOfSpend1857030000000 implements MigrationInterface {
  name = 'SplitRefundsOutOfSpend1857030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const sql of ORG_CLEANUP_DROP_VIEWS) {
      await queryRunner.query(sql);
    }
    for (const sql of ORG_CLEANUP_CREATE_VIEWS) {
      await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const sql of ORG_CLEANUP_DROP_VIEWS) {
      await queryRunner.query(sql);
    }
    for (const sql of ORG_CLEANUP_CREATE_VIEWS) {
      await queryRunner.query(sql);
    }
  }
}
