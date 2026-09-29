import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `finance.payments.record` now also gates every reseller commission action
 * (approve, edit, cancel, record payment, close recovery). Its description is
 * the sentence the access dialog shows someone who was refused, and it read
 * "Record a customer payment" even when they had pressed Approve on a
 * commission. The web catalog (`apps/web/lib/rbac/catalog.ts`) is the source;
 * this keeps the `permissions` mirror in step, as that file asks.
 */
export class CommissionPermissionWording1857300000001 implements MigrationInterface {
  name = 'CommissionPermissionWording1857300000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE permissions SET description = $1, updated_at = now() WHERE code = 'finance.payments.record'`,
      ['Record payments, and approve or pay reseller commissions'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE permissions SET description = $1, updated_at = now() WHERE code = 'finance.payments.record'`,
      ['Record a customer payment'],
    );
  }
}
