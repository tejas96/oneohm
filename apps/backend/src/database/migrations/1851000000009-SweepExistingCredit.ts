import { type MigrationInterface, type QueryRunner } from 'typeorm';

import { SWEEP_CREDIT } from './sql/ledger/10-sweep-existing-credit.sql';

/**
 * SweepExistingCredit — apply unallocated customer credit to milestones that
 * were created after the money arrived.
 *
 * Until now allocation happened only at the moment a receipt was recorded, so a
 * change order raised afterwards started at zero no matter how much credit the
 * customer already had. Projects reported an outstanding balance for customers
 * who had overpaid, and those milestones joined the receivables chase list.
 *
 * INSERT-only, so the append-only guarantee holds: no historical allocation is
 * touched. Self-verifying — the three assertions that follow re-check
 * over-allocation on both sides and cash conservation, and abort the whole
 * transaction if any fails.
 *
 * `down()` is a no-op. The allocations are real attributions of real money and
 * the tables reject DELETE anyway; unwinding one means posting a reversal
 * through the normal path.
 */
export class SweepExistingCredit1851000000009 implements MigrationInterface {
  name = 'SweepExistingCredit1851000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of SWEEP_CREDIT) {
      await queryRunner.query(statement);
    }
  }

  public async down(): Promise<void> {
    // Intentionally empty — ledger_allocations is append-only.
  }
}
