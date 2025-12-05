import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create Quote Calculator Tables
 *
 * Creates tables for:
 * 1. subsidy_configurations - Government subsidy schemes and rules
 * 2. installation_pricing - Installation cost configuration by system size
 * 3. quote_configurations - Organization-level quote settings
 *
 * Also adds new columns to:
 * - quotes: phase_type, dcr_preference, calculation_mode, dcr/non_dcr sizes, floor, distance
 * - quote_versions: config_snapshot
 */
export class CreateQuoteCalculatorTables1700000000025 implements MigrationInterface {
  name = 'CreateQuoteCalculatorTables1700000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =====================================================
    // 1. Create subsidy_configurations table
    // =====================================================
    await queryRunner.query(`
      CREATE TABLE "subsidy_configurations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "scheme_name" varchar(100) NOT NULL,
        "scheme_type" varchar(50) NOT NULL DEFAULT 'pm_surya_ghar',
        "project_type" varchar(50) NOT NULL,
        "max_subsidy_kw" decimal(10,2) NOT NULL,
        "requires_dcr" boolean NOT NULL DEFAULT true,
        "auto_split_enabled" boolean NOT NULL DEFAULT true,
        "tiers" jsonb NOT NULL DEFAULT '[]',
        "is_active" boolean NOT NULL DEFAULT true,
        "description" text,
        "effective_from" date,
        "effective_to" date,
        CONSTRAINT "PK_subsidy_configurations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subsidy_configurations_organization" FOREIGN KEY ("organization_id") 
          REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    // Indexes for subsidy_configurations
    await queryRunner.query(`
      CREATE INDEX "IDX_subsidy_config_org_project_active" 
      ON "subsidy_configurations" ("organization_id", "project_type", "is_active")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_subsidy_config_scheme_active" 
      ON "subsidy_configurations" ("scheme_type", "is_active")
    `);

    // =====================================================
    // 2. Create installation_pricing table
    // =====================================================
    await queryRunner.query(`
      CREATE TABLE "installation_pricing" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "min_system_size_kw" decimal(10,2) NOT NULL,
        "max_system_size_kw" decimal(10,2),
        "project_type" varchar(50) NOT NULL DEFAULT 'residential',
        "electrical_work_cost" decimal(12,2) NOT NULL DEFAULT 0,
        "fixed_material_cost" decimal(12,2) NOT NULL DEFAULT 0,
        "variable_floor_cost" decimal(12,2) NOT NULL DEFAULT 0,
        "floor_increment_percent" decimal(5,2) NOT NULL DEFAULT 0,
        "msedcl_charges" decimal(12,2) NOT NULL DEFAULT 0,
        "supervision_charges" decimal(12,2) NOT NULL DEFAULT 0,
        "transport_cost_per_km" decimal(8,2) NOT NULL DEFAULT 0,
        "gst_rate" decimal(5,2) NOT NULL DEFAULT 12,
        "is_active" boolean NOT NULL DEFAULT true,
        "notes" text,
        "effective_from" date,
        "effective_to" date,
        CONSTRAINT "PK_installation_pricing" PRIMARY KEY ("id"),
        CONSTRAINT "FK_installation_pricing_organization" FOREIGN KEY ("organization_id") 
          REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    // Indexes for installation_pricing
    await queryRunner.query(`
      CREATE INDEX "IDX_installation_pricing_org_active" 
      ON "installation_pricing" ("organization_id", "is_active")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_installation_pricing_size_range" 
      ON "installation_pricing" ("min_system_size_kw", "max_system_size_kw")
    `);

    // =====================================================
    // 3. Create quote_configurations table
    // =====================================================
    await queryRunner.query(`
      CREATE TABLE "quote_configurations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "organization_id" uuid NOT NULL,
        "default_validity_days" int NOT NULL DEFAULT 30,
        "max_versions" int NOT NULL DEFAULT 3,
        "default_completion_weeks" int NOT NULL DEFAULT 4,
        "gst_config" jsonb NOT NULL DEFAULT '{"rate1": 12, "rate1Percentage": 70, "rate2": 18, "rate2Percentage": 30}',
        "wattage_rounding" jsonb NOT NULL DEFAULT '{"roundTo": 10, "roundUpThreshold": 5}',
        "payment_milestones" jsonb NOT NULL DEFAULT '[{"stage":"advance","name":"Advance","percentage":40,"order":1},{"stage":"material_delivery","name":"Material Delivery","percentage":30,"order":2},{"stage":"installation_complete","name":"Installation Complete","percentage":20,"order":3},{"stage":"commissioning","name":"Commissioning","percentage":10,"order":4}]',
        "show_inventory_stock" boolean NOT NULL DEFAULT true,
        "min_profit_margin_percent" decimal(5,2),
        "is_active" boolean NOT NULL DEFAULT true,
        "notes" text,
        CONSTRAINT "PK_quote_configurations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_quote_configurations_organization" FOREIGN KEY ("organization_id") 
          REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    // Unique index - only one active config per org
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_quote_config_org_active_unique" 
      ON "quote_configurations" ("organization_id") 
      WHERE "is_active" = true
    `);

    // =====================================================
    // 4. Add new columns to quotes table
    // =====================================================
    await queryRunner.query(`
      ALTER TABLE "quotes" 
      ADD COLUMN IF NOT EXISTS "phase_type" varchar(20),
      ADD COLUMN IF NOT EXISTS "dcr_preference" varchar(20) DEFAULT 'auto_split',
      ADD COLUMN IF NOT EXISTS "calculation_mode" varchar(20) DEFAULT 'auto',
      ADD COLUMN IF NOT EXISTS "dcr_system_size_kw" decimal(10,2),
      ADD COLUMN IF NOT EXISTS "non_dcr_system_size_kw" decimal(10,2),
      ADD COLUMN IF NOT EXISTS "floor_number" int DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "distance_km" decimal(8,2)
    `);

    // =====================================================
    // 5. Add config_snapshot to quote_versions table
    // =====================================================
    await queryRunner.query(`
      ALTER TABLE "quote_versions" 
      ADD COLUMN IF NOT EXISTS "config_snapshot" jsonb
    `);

    // =====================================================
    // 6. Add comments for documentation
    // =====================================================
    await queryRunner.query(`
      COMMENT ON TABLE "subsidy_configurations" IS 'Government subsidy schemes and calculation rules (e.g., PM Surya Ghar)'
    `);
    await queryRunner.query(`
      COMMENT ON TABLE "installation_pricing" IS 'Installation cost configuration by system size range'
    `);
    await queryRunner.query(`
      COMMENT ON TABLE "quote_configurations" IS 'Organization-level quote settings (one active per org)'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "subsidy_configurations"."tiers" IS 'Tiered subsidy rates: [{fromKw, toKw, ratePerKw}]'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "quote_configurations"."gst_config" IS 'GST split config: {rate1, rate1Percentage, rate2, rate2Percentage}'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "quote_configurations"."wattage_rounding" IS 'Wattage rounding rules: {roundTo, roundUpThreshold}'
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN "quote_versions"."config_snapshot" IS 'Pricing configuration snapshot at time of quote creation for audit'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns from quote_versions
    await queryRunner.query(`
      ALTER TABLE "quote_versions" 
      DROP COLUMN IF EXISTS "config_snapshot"
    `);

    // Remove columns from quotes
    await queryRunner.query(`
      ALTER TABLE "quotes" 
      DROP COLUMN IF EXISTS "phase_type",
      DROP COLUMN IF EXISTS "dcr_preference",
      DROP COLUMN IF EXISTS "calculation_mode",
      DROP COLUMN IF EXISTS "dcr_system_size_kw",
      DROP COLUMN IF EXISTS "non_dcr_system_size_kw",
      DROP COLUMN IF EXISTS "floor_number",
      DROP COLUMN IF EXISTS "distance_km"
    `);

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "quote_configurations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "installation_pricing"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subsidy_configurations"`);
  }
}
