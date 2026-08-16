import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Adds an optional calendar due date to service tickets.
 *
 * `date`, not `timestamptz` — the user picks a day, and a timestamp would
 * shift across the IST/UTC boundary on display.
 */
export class AddDueDateToServiceTickets1855200000000 implements MigrationInterface {
  name = 'AddDueDateToServiceTickets1855200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "service_tickets" ADD COLUMN "due_date" date NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_service_tickets_due_date" ON "service_tickets" ("due_date")
        WHERE "deleted_at" IS NULL AND "due_date" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_service_tickets_due_date"`);
    await queryRunner.query(`ALTER TABLE "service_tickets" DROP COLUMN IF EXISTS "due_date"`);
  }
}
