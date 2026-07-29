import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Changes `payments.customer_id` from ON DELETE CASCADE to ON DELETE RESTRICT.
 *
 * The constraint was created with CASCADE in migration 1700000000022, which
 * means a physical delete of a customer row silently hard-deletes every receipt
 * that customer ever paid — bypassing the soft-delete model the rest of the
 * finance module relies on, skipping term re-aggregation entirely, and leaving
 * `project_payment_terms.paid_amount` asserting money for which no evidence
 * remains.
 *
 * Payment records are the only evidence that cash was received; there is no
 * bank-statement sync to re-derive them from. They must never be removed as a
 * side effect of deleting something else. Compare `payment_term_id`, which was
 * deliberately given ON DELETE RESTRICT in migration 1830000000001.
 *
 * Deleting a customer who has payments will now fail loudly, which is the
 * correct behaviour — such customers should be soft-deleted.
 */
export class HardenPaymentsCustomerFk1850800000001 implements MigrationInterface {
  name = 'HardenPaymentsCustomerFk1850800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_customer_id`,
    );
    await queryRunner.query(`
      ALTER TABLE payments
      ADD CONSTRAINT fk_payments_customer_id
      FOREIGN KEY (customer_id) REFERENCES customer_profiles(id)
      ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE payments DROP CONSTRAINT IF EXISTS fk_payments_customer_id`,
    );
    await queryRunner.query(`
      ALTER TABLE payments
      ADD CONSTRAINT fk_payments_customer_id
      FOREIGN KEY (customer_id) REFERENCES customer_profiles(id)
      ON DELETE CASCADE
    `);
  }
}
