import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Restores a real value date on `payments`.
 *
 * `payment_date` was dropped by migration 1787000000000 on the reasoning that
 * "payment_date is replaced by the existing created_at timestamp". That is not
 * equivalent: `created_at` is when the row was typed in, not when the money
 * moved. A cheque received on 15 Jul and entered on 28 Jul was being booked
 * into the wrong period, and every cash-flow / aging figure inherited the error.
 *
 * `CreateReceiptDto.paidAt` already exists and is validated by
 * ReceiptService.assertPaidAt, but was never persisted — this migration plus the
 * matching service change closes that gap.
 *
 * Historical rows have no recoverable true value date, so they are backfilled
 * from `created_at` (converted to IST, the business timezone) and flagged with
 * `paid_at_is_inferred = true`. The flag exists so no one — including a future
 * auditor — mistakes a backfilled date for a recorded fact.
 */
export class AddPaidAtToPayments1850800000000 implements MigrationInterface {
  name = 'AddPaidAtToPayments1850800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at DATE`);
    await queryRunner.query(
      `ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at_is_inferred BOOLEAN NOT NULL DEFAULT false`,
    );

    // Backfill: created_at is a naive UTC timestamp; the business operates in IST.
    await queryRunner.query(`
      UPDATE payments
      SET paid_at = (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date,
          paid_at_is_inferred = true
      WHERE paid_at IS NULL
    `);

    await queryRunner.query(`ALTER TABLE payments ALTER COLUMN paid_at SET NOT NULL`);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_paid_at
      ON payments (paid_at)
      WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_payments_paid_at`);
    await queryRunner.query(`ALTER TABLE payments DROP COLUMN IF EXISTS paid_at_is_inferred`);
    await queryRunner.query(`ALTER TABLE payments DROP COLUMN IF EXISTS paid_at`);
  }
}
