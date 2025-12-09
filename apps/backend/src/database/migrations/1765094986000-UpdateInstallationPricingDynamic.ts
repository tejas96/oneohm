import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Update Installation Pricing to Dynamic Structure
 *
 * Changes:
 * 1. Add new columns: name, code, cost_components (JSONB)
 * 2. Migrate existing data from individual columns to cost_components JSONB
 * 3. Rename transport_cost_per_km to transport_rate_per_km
 * 4. Drop old individual cost columns (electrical_work_cost, fixed_material_cost, etc.)
 *
 * The new structure allows adding any cost component without schema changes.
 */
export class UpdateInstallationPricingDynamic1765094986000 implements MigrationInterface {
  name = 'UpdateInstallationPricingDynamic1765094986000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================== STEP 1: Add new columns ====================

    // Add name column
    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      ADD COLUMN IF NOT EXISTS "name" VARCHAR(100)
    `);

    // Add code column
    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      ADD COLUMN IF NOT EXISTS "code" VARCHAR(50)
    `);

    // Add cost_components JSONB column with default empty object
    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      ADD COLUMN IF NOT EXISTS "cost_components" JSONB DEFAULT '{}'::jsonb
    `);

    // Add transport_rate_per_km column (new name)
    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      ADD COLUMN IF NOT EXISTS "transport_rate_per_km" DECIMAL(8,2) DEFAULT 35
    `);

    // ==================== STEP 2: Migrate existing data ====================

    // Migrate cost data to cost_components JSONB
    await queryRunner.query(`
      UPDATE "installation_pricing"
      SET "cost_components" = jsonb_build_object(
        'electrical_work', COALESCE("electrical_work_cost", 0),
        'fixed_material', COALESCE("fixed_material_cost", 0),
        'variable_floor', COALESCE("variable_floor_cost", 0),
        'msedcl_charges', COALESCE("msedcl_charges", 0),
        'supervision', COALESCE("supervision_charges", 0)
      )
      WHERE "cost_components" = '{}'::jsonb OR "cost_components" IS NULL
    `);

    // Migrate transport_cost_per_km to transport_rate_per_km
    await queryRunner.query(`
      UPDATE "installation_pricing"
      SET "transport_rate_per_km" = COALESCE("transport_cost_per_km", 35)
      WHERE "transport_rate_per_km" IS NULL OR "transport_rate_per_km" = 35
    `);

    // Generate name and code for existing rows
    await queryRunner.query(`
      UPDATE "installation_pricing"
      SET 
        "name" = CONCAT('Installation Charges ', "min_system_size_kw"::integer, 'KW'),
        "code" = CONCAT('INST-', "min_system_size_kw"::integer, 'KW')
      WHERE "name" IS NULL OR "code" IS NULL
    `);

    // ==================== STEP 3: Fix effective_from ====================

    await queryRunner.query(`
      UPDATE "installation_pricing"
      SET "effective_from" = '2024-01-01'
      WHERE "effective_from" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      ALTER COLUMN "effective_from" SET NOT NULL
    `);

    // ==================== STEP 4: Drop old columns ====================

    // Drop old cost columns (data has been migrated to cost_components)
    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      DROP COLUMN IF EXISTS "electrical_work_cost"
    `);

    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      DROP COLUMN IF EXISTS "fixed_material_cost"
    `);

    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      DROP COLUMN IF EXISTS "variable_floor_cost"
    `);

    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      DROP COLUMN IF EXISTS "msedcl_charges"
    `);

    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      DROP COLUMN IF EXISTS "supervision_charges"
    `);

    // Drop old transport column (renamed to transport_rate_per_km)
    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      DROP COLUMN IF EXISTS "transport_cost_per_km"
    `);

    // ==================== STEP 5: Add indexes ====================

    // Index for organization + size range lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_installation_pricing_org_size_range" 
      ON "installation_pricing" ("organization_id", "min_system_size_kw", "max_system_size_kw")
    `);

    // Index for organization + project type + active
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_installation_pricing_org_project_active" 
      ON "installation_pricing" ("organization_id", "project_type", "is_active")
    `);

    // GIN index for cost_components JSONB queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_installation_pricing_cost_components" 
      ON "installation_pricing" USING GIN ("cost_components")
    `);

    // ==================== STEP 6: Add comment for documentation ====================

    await queryRunner.query(`
      COMMENT ON COLUMN "installation_pricing"."cost_components" IS 
      'Dynamic cost components in INR. Standard keys: electrical_work, fixed_material, variable_floor, structure_cost, installation_labor, msedcl_charges, loading_unloading. Add any new key without schema change.'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ==================== Re-add old columns ====================

    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      ADD COLUMN IF NOT EXISTS "electrical_work_cost" DECIMAL(12,2) DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      ADD COLUMN IF NOT EXISTS "fixed_material_cost" DECIMAL(12,2) DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      ADD COLUMN IF NOT EXISTS "variable_floor_cost" DECIMAL(12,2) DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      ADD COLUMN IF NOT EXISTS "msedcl_charges" DECIMAL(12,2) DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      ADD COLUMN IF NOT EXISTS "supervision_charges" DECIMAL(12,2) DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      ADD COLUMN IF NOT EXISTS "transport_cost_per_km" DECIMAL(8,2) DEFAULT 0
    `);

    // ==================== Migrate data back from JSONB ====================

    await queryRunner.query(`
      UPDATE "installation_pricing"
      SET 
        "electrical_work_cost" = COALESCE(("cost_components"->>'electrical_work')::decimal, 0),
        "fixed_material_cost" = COALESCE(("cost_components"->>'fixed_material')::decimal, 0),
        "variable_floor_cost" = COALESCE(("cost_components"->>'variable_floor')::decimal, 0),
        "msedcl_charges" = COALESCE(("cost_components"->>'msedcl_charges')::decimal, 0),
        "supervision_charges" = COALESCE(("cost_components"->>'supervision')::decimal, 0),
        "transport_cost_per_km" = COALESCE("transport_rate_per_km", 0)
    `);

    // ==================== Remove indexes ====================

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_installation_pricing_cost_components"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_installation_pricing_org_project_active"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_installation_pricing_org_size_range"
    `);

    // ==================== Allow NULL for effective_from ====================

    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      ALTER COLUMN "effective_from" DROP NOT NULL
    `);

    // ==================== Remove new columns ====================

    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      DROP COLUMN IF EXISTS "transport_rate_per_km"
    `);

    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      DROP COLUMN IF EXISTS "cost_components"
    `);

    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      DROP COLUMN IF EXISTS "code"
    `);

    await queryRunner.query(`
      ALTER TABLE "installation_pricing" 
      DROP COLUMN IF EXISTS "name"
    `);
  }
}
