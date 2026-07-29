import { type MigrationInterface, type QueryRunner } from 'typeorm';

import {
  DISABLE_LEDGER_APPEND_ONLY,
  ENABLE_LEDGER_APPEND_ONLY,
} from './sql/ledger/07-append-only.sql';

/**
 * EnableLedgerAppendOnly — M7, the LAST migration of the finance rebuild.
 *
 * Must run after M3–M5 (the backfill). Creating the triggers only once the data
 * is loaded means the migration itself never needs a bypass, so there is no
 * permanent escape hatch from the append-only guarantee.
 *
 * After this runs, `UPDATE`, `DELETE` and `TRUNCATE` on `ledger_entries` and
 * `ledger_allocations` all raise. Corrections happen by posting a reversing
 * entry — see `LedgerWriteService.reverse`.
 */
export class EnableLedgerAppendOnly1851000000006 implements MigrationInterface {
  name = 'EnableLedgerAppendOnly1851000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of ENABLE_LEDGER_APPEND_ONLY) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of DISABLE_LEDGER_APPEND_ONLY) {
      await queryRunner.query(statement);
    }
  }
}
