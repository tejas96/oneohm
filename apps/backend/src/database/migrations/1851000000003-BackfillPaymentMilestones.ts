import { type MigrationInterface, type QueryRunner } from 'typeorm';

import {
  BACKFILL_MILESTONES,
  UNDO_BACKFILL_MILESTONES,
} from './sql/ledger/03-backfill-milestones.sql';

/**
 * BackfillPaymentMilestones — M3 of the finance rebuild.
 *
 * Copies `project_payment_terms` into `payment_milestones`, preserving ids.
 * The source table is left completely untouched, so this is reversible by
 * emptying the destination.
 */
export class BackfillPaymentMilestones1851000000003 implements MigrationInterface {
  name = 'BackfillPaymentMilestones1851000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of BACKFILL_MILESTONES) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of UNDO_BACKFILL_MILESTONES) {
      await queryRunner.query(statement);
    }
  }
}
