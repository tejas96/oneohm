import { type MigrationInterface, type QueryRunner } from 'typeorm';

import { BACKFILL_ENTRIES, UNDO_BACKFILL_ENTRIES } from './sql/ledger/04-backfill-entries.sql';

/**
 * BackfillLedgerEntries — M4 of the finance rebuild.
 *
 * Copies counted, non-deleted `payments` rows into `ledger_entries` as money-in,
 * and `project_expenses` as money-out. The source tables are left untouched.
 *
 * Runs before M7, so the append-only triggers do not yet exist and this load
 * needs no bypass.
 */
export class BackfillLedgerEntries1851000000004 implements MigrationInterface {
  name = 'BackfillLedgerEntries1851000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of BACKFILL_ENTRIES) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of UNDO_BACKFILL_ENTRIES) {
      await queryRunner.query(statement);
    }
  }
}
