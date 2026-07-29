import { type MigrationInterface, type QueryRunner } from 'typeorm';

import { ALLOCATE_LEDGER, UNDO_ALLOCATE_LEDGER } from './sql/ledger/05-allocate-waterfall.sql';

/**
 * AllocateLedgerWaterfall — M5 of the finance rebuild, and the point of the
 * whole exercise.
 *
 * Derives every allocation by FIFO waterfall using interval intersection,
 * ignoring the existing `payments.payment_term_id` — that column is the
 * corrupted data, and it survives untouched in the source table.
 *
 * Ends by asserting zero over-allocated milestones and zero over-allocated
 * entries. Because `run-migrations.ts` wraps the chain in one transaction, a
 * failed assertion rolls back M1–M5 entirely and leaves production as it was.
 */
export class AllocateLedgerWaterfall1851000000005 implements MigrationInterface {
  name = 'AllocateLedgerWaterfall1851000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of ALLOCATE_LEDGER) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of UNDO_ALLOCATE_LEDGER) {
      await queryRunner.query(statement);
    }
  }
}
