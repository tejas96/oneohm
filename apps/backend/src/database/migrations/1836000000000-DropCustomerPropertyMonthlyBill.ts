import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropCustomerPropertyMonthlyBill1836000000000 implements MigrationInterface {
  name = 'DropCustomerPropertyMonthlyBill1836000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_properties
      DROP COLUMN IF EXISTS monthly_bill
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_properties
      ADD COLUMN IF NOT EXISTS monthly_bill DECIMAL(10,2)
    `);
  }
}
