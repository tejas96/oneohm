import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Update Subsidy Configuration
 *
 * Changes:
 * 1. Add scheme_code column (for unique identification)
 * 2. Add max_subsidy_amount column (subsidy cap in INR)
 * 3. Convert scheme_type from enum to varchar (for flexibility)
 * 4. Convert project_type from enum to varchar (for flexibility)
 * 5. Add unique index on organization_id + scheme_code
 */
export class UpdateSubsidyConfiguration1765094987000 implements MigrationInterface {
  name = 'UpdateSubsidyConfiguration1765094987000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================== STEP 1: Add new columns ====================

    // Add scheme_code column
    await queryRunner.query(`
      ALTER TABLE "subsidy_configurations" 
      ADD COLUMN IF NOT EXISTS "scheme_code" VARCHAR(50)
    `);

    // Add max_subsidy_amount column
    await queryRunner.query(`
      ALTER TABLE "subsidy_configurations" 
      ADD COLUMN IF NOT EXISTS "max_subsidy_amount" DECIMAL(12,2)
    `);

    // ==================== STEP 2: Migrate enum to varchar ====================

    // Convert scheme_type to varchar if it's an enum
    // First check if it's currently an enum and convert if needed
    await queryRunner.query(`
      ALTER TABLE "subsidy_configurations" 
      ALTER COLUMN "scheme_type" TYPE VARCHAR(30) USING "scheme_type"::VARCHAR(30)
    `);

    // Convert project_type to varchar if it's an enum
    await queryRunner.query(`
      ALTER TABLE "subsidy_configurations" 
      ALTER COLUMN "project_type" TYPE VARCHAR(30) USING "project_type"::VARCHAR(30)
    `);

    // ==================== STEP 3: Generate scheme_code for existing rows ====================

    await queryRunner.query(`
      UPDATE "subsidy_configurations"
      SET "scheme_code" = UPPER(
        REGEXP_REPLACE(
          REGEXP_REPLACE("scheme_name", '[^a-zA-Z0-9]', '-', 'g'),
          '-+', '-', 'g'
        )
      )
      WHERE "scheme_code" IS NULL
    `);

    // ==================== STEP 4: Add unique index ====================

    // Create unique index on organization_id + scheme_code (if scheme_code not null)
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_subsidy_config_org_scheme_code_unique" 
      ON "subsidy_configurations" ("organization_id", "scheme_code")
      WHERE "scheme_code" IS NOT NULL
    `);

    // ==================== STEP 5: Add comments ====================

    await queryRunner.query(`
      COMMENT ON COLUMN "subsidy_configurations"."scheme_code" IS 
      'Unique scheme code within organization (e.g., PM-SURYA-RES, MH-STATE-SUBSIDY)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "subsidy_configurations"."max_subsidy_amount" IS 
      'Maximum subsidy amount cap in INR (e.g., 78000 for residential)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ==================== Remove index ====================

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_subsidy_config_org_scheme_code_unique"
    `);

    // ==================== Remove new columns ====================

    await queryRunner.query(`
      ALTER TABLE "subsidy_configurations" 
      DROP COLUMN IF EXISTS "max_subsidy_amount"
    `);

    await queryRunner.query(`
      ALTER TABLE "subsidy_configurations" 
      DROP COLUMN IF EXISTS "scheme_code"
    `);

    // Note: We don't convert varchar back to enum as it would require
    // recreating the enum type. The varchar columns will work fine.
  }
}
