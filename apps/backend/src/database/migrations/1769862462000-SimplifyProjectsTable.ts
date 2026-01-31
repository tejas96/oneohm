import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Simplify Projects Table
 *
 * Prerequisites: Migration 1769862461000 must have run first (adds property_id, updated_by)
 *
 * This migration:
 * 1. Drops foreign key for quote_id (FK_projects_quote)
 * 2. Drops indexes for quote_id, project_manager_id (no FK for these, just indexes)
 * 3. Adds new simplified date columns (start_date, end_date)
 * 4. Migrates data from old date columns to new ones
 * 5. Drops old columns (quote_id, project_manager_id, lead_technician_id, 4 date fields)
 * 6. Adds unique constraint on property_id (enforces One-to-One with soft delete support)
 * 7. Adds new date index
 *
 * Columns removed: quote_id, project_manager_id, lead_technician_id,
 *                  planned_start_date, planned_end_date, actual_start_date, actual_end_date
 * Columns added: start_date, end_date
 */
export class SimplifyProjectsTable1769862462000 implements MigrationInterface {
  name = 'SimplifyProjectsTable1769862462000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. DROP FOREIGN KEYS
    // Note: FK_projects_lead_technician may or may not exist depending on DB state
    // ============================================
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_quote"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_lead_technician"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_project_manager"`,
    );

    // ============================================
    // 2. DROP INDEXES
    // ============================================
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_quote"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_project_manager"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_lead_technician"`);
    // Drop the old dates index (will be recreated with new columns)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_dates"`);

    // ============================================
    // 3. ADD NEW DATE COLUMNS (before dropping old ones for data migration)
    // ============================================
    await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "start_date" DATE`);
    await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "end_date" DATE`);

    // ============================================
    // 4. MIGRATE DATE DATA
    // Use planned_start_date → start_date
    // Use actual_end_date if available, otherwise planned_end_date → end_date
    // ============================================
    await queryRunner.query(`
      UPDATE "projects" SET 
        start_date = planned_start_date,
        end_date = COALESCE(actual_end_date, planned_end_date)
      WHERE start_date IS NULL
    `);

    // ============================================
    // 5. DROP OLD COLUMNS
    // ============================================
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "quote_id"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "project_manager_id"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "lead_technician_id"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "planned_start_date"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "planned_end_date"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "actual_start_date"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "actual_end_date"`);

    // ============================================
    // 6. ADD UNIQUE CONSTRAINT ON property_id (enforces One-to-One)
    // Uses partial unique index to exclude soft-deleted records
    // This allows a new project to be created for a property after the old one is soft-deleted
    // ============================================
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_projects_property_id" ON "projects"("property_id") 
      WHERE deleted_at IS NULL
    `);

    // ============================================
    // 7. ADD NEW DATE INDEX
    // ============================================
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_projects_dates" ON "projects"("start_date", "end_date") 
      WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. DROP NEW INDEXES
    // ============================================
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_projects_dates"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_projects_property_id"`);

    // ============================================
    // 2. RE-ADD OLD COLUMNS (nullable for data migration)
    // ============================================
    await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "quote_id" UUID`);
    await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "project_manager_id" UUID`);
    await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "lead_technician_id" UUID`);
    await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "planned_start_date" DATE`);
    await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "planned_end_date" DATE`);
    await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "actual_start_date" DATE`);
    await queryRunner.query(`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "actual_end_date" DATE`);

    // ============================================
    // 3. MIGRATE DATA BACK
    // ============================================
    await queryRunner.query(`
      UPDATE "projects" SET 
        planned_start_date = start_date,
        planned_end_date = end_date
      WHERE planned_start_date IS NULL
    `);

    // ============================================
    // 4. DROP NEW DATE COLUMNS
    // ============================================
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "start_date"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "end_date"`);

    // ============================================
    // 5. RE-CREATE OLD INDEXES
    // ============================================
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_projects_quote" ON "projects"("quote_id") 
      WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_projects_project_manager" ON "projects"("project_manager_id") 
      WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_projects_dates" ON "projects"("planned_start_date", "planned_end_date") 
      WHERE deleted_at IS NULL
    `);

    // ============================================
    // 6. RE-CREATE FOREIGN KEYS
    // ============================================
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "FK_projects_quote" 
      FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "projects" 
      ADD CONSTRAINT "FK_projects_lead_technician" 
      FOREIGN KEY ("lead_technician_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    // Note: project_manager_id may not have had a FK constraint originally
  }
}
