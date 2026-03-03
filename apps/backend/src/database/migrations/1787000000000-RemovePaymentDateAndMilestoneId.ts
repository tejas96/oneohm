import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Remove payment_date and milestone_id from payments table.
 * - payment_date is replaced by the existing created_at timestamp
 * - milestone_id link to project_milestones is no longer needed
 */
export class RemovePaymentDateAndMilestoneId1787000000000 implements MigrationInterface {
  name = 'RemovePaymentDateAndMilestoneId1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_milestone"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_date"`);

    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "fk_payments_milestone"`,
    );

    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "milestone_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "payment_date"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN "milestone_id" UUID`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN "payment_date" DATE NOT NULL DEFAULT CURRENT_DATE`,
    );

    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_milestone" FOREIGN KEY ("milestone_id") REFERENCES "project_milestones"("id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_payments_milestone" ON "payments"("milestone_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_payments_date" ON "payments"("payment_date")`,
    );
  }
}
