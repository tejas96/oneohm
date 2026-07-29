import { type MigrationInterface, type QueryRunner } from 'typeorm';

import { CREATE_LEDGER_CORE, DROP_LEDGER_CORE } from './sql/ledger/01-create-core.sql';

/**
 * CreateLedgerCore — M1 of the finance rebuild.
 *
 * Creates `payment_milestones`, `ledger_entries` and `ledger_allocations`
 * ALONGSIDE the existing `payments` / `project_payment_terms` /
 * `project_expenses` tables. Nothing is dropped, nothing is switched, and no
 * running code reads these tables yet.
 *
 * The append-only triggers are deliberately NOT created here — they land in M7,
 * after the backfill. That way the initial data load needs no bypass mechanism,
 * so no permanent escape hatch from the append-only guarantee ever exists.
 *
 * SQL lives in ./sql/ledger/01-create-core.sql.ts so the dry-run rehearsal
 * executes byte-identical statements rather than a paraphrase.
 */
export class CreateLedgerCore1851000000000 implements MigrationInterface {
  name = 'CreateLedgerCore1851000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of CREATE_LEDGER_CORE) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of DROP_LEDGER_CORE) {
      await queryRunner.query(statement);
    }
  }
}
