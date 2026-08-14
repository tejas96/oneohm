import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Carry a caller-supplied allocation through the approval queue.
 *
 * `POST /projects/:id/ledger/receipts` has always accepted an optional
 * `allocations` array to target specific milestones instead of letting the FIFO
 * waterfall decide. When recording became "submit for approval", that field
 * stopped being forwarded — it was still validated and still advertised in
 * Swagger, so a caller targeting milestone B had the instruction silently
 * dropped and the money landed on milestone A instead.
 *
 * Stored as jsonb rather than a child table: it is an opaque instruction that is
 * only ever read back whole and handed to `LedgerWriteService`, which validates
 * it against live balances at approval time. Nothing queries inside it.
 */
export class AddAllocationsToPendingLedgerEntries1854500000000 implements MigrationInterface {
  name = 'AddAllocationsToPendingLedgerEntries1854500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pending_ledger_entries"
        ADD COLUMN "allocations" jsonb NULL
    `);

    // Only a receipt can target milestones. An expense never touches one, and a
    // reversal mirrors whatever its target did.
    await queryRunner.query(`
      ALTER TABLE "pending_ledger_entries"
        ADD CONSTRAINT "chk_ple_allocations_receipt_only"
        CHECK ("allocations" IS NULL OR "kind" = 'receipt')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "pending_ledger_entries"
        DROP CONSTRAINT IF EXISTS "chk_ple_allocations_receipt_only"
    `);
    await queryRunner.query(`
      ALTER TABLE "pending_ledger_entries" DROP COLUMN IF EXISTS "allocations"
    `);
  }
}
