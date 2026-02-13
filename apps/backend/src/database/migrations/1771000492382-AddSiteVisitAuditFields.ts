import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSiteVisitAuditFields1771000492382 implements MigrationInterface {
  name = 'AddSiteVisitAuditFields1771000492382';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add audit columns to site_visits table
    await queryRunner.query(`
      ALTER TABLE "site_visits"
      ADD COLUMN IF NOT EXISTS "created_by" uuid,
      ADD COLUMN IF NOT EXISTS "updated_by" uuid
    `);

    // Add indexes for audit columns (partial index excluding soft-deleted)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_site_visits_created_by"
      ON "site_visits" ("created_by")
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_site_visits_created_by"
    `);

    // Drop audit columns
    await queryRunner.query(`
      ALTER TABLE "site_visits"
      DROP COLUMN IF EXISTS "created_by",
      DROP COLUMN IF EXISTS "updated_by"
    `);
  }
}
