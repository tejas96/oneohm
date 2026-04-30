import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Adds purchase_orders.paid_amount NUMERIC(15,2) to track running paid totals.
 *
 * Backfill rule (per Decision A2 of the inventory-rebuild plan):
 *   payment_status = 'paid'    -> paid_amount = total_amount
 *   payment_status in ('partial','pending') -> paid_amount = 0
 *
 * This deliberately under-counts historical 'partial' payments; we have no
 * source of truth for the partial fraction. Going forward, the new
 * record-payment endpoint maintains paid_amount accurately and recomputes
 * payment_status from it.
 *
 * CHECK constraint enforces 0 <= paid_amount <= total_amount.
 */
export class AddPaidAmountToPurchaseOrders1823000000000 implements MigrationInterface {
  name = 'AddPaidAmountToPurchaseOrders1823000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE purchase_orders
         ADD COLUMN paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(
      `UPDATE purchase_orders
          SET paid_amount = total_amount
        WHERE payment_status = 'paid'`,
    );

    await queryRunner.query(
      `ALTER TABLE purchase_orders
         ADD CONSTRAINT chk_purchase_orders_paid_amount
         CHECK (paid_amount >= 0 AND paid_amount <= total_amount)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS chk_purchase_orders_paid_amount`,
    );
    await queryRunner.query(`ALTER TABLE purchase_orders DROP COLUMN IF EXISTS paid_amount`);
  }
}
