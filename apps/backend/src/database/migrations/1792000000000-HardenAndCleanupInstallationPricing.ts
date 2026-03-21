import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenAndCleanupInstallationPricing1792000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Phase 2: Schema Hardening ──
    // All constraint additions use DROP IF EXISTS + ADD to be fully idempotent.
    // The DO-block EXCEPTION approach does NOT reliably catch PostgreSQL
    // error 42P07 (relation already exists) vs 42710 (duplicate_object),
    // so we avoid it entirely.

    // 2.1 CHECK constraint: min <= max (or max is null)
    await queryRunner.query(`
      ALTER TABLE installation_pricing
        DROP CONSTRAINT IF EXISTS chk_ip_size_range
    `);
    await queryRunner.query(`
      ALTER TABLE installation_pricing
        ADD CONSTRAINT chk_ip_size_range
        CHECK (min_system_size_kw <= max_system_size_kw OR max_system_size_kw IS NULL)
    `);

    // 2.2 CHECK constraint: effective_from <= effective_to (or effective_to is null)
    await queryRunner.query(`
      ALTER TABLE installation_pricing
        DROP CONSTRAINT IF EXISTS chk_ip_date_range
    `);
    await queryRunner.query(`
      ALTER TABLE installation_pricing
        ADD CONSTRAINT chk_ip_date_range
        CHECK (effective_to IS NULL OR effective_from <= effective_to)
    `);

    // 2.3 UNIQUE constraint: one tier per (org, min, max)
    // Deduplicate any accidental duplicates to avoid constraint failures.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY organization_id, min_system_size_kw, max_system_size_kw
            ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
          ) AS rn
        FROM installation_pricing
      )
      DELETE FROM installation_pricing ip
      USING ranked r
      WHERE ip.id = r.id AND r.rn > 1
    `);
    await queryRunner.query(`
      ALTER TABLE installation_pricing
        DROP CONSTRAINT IF EXISTS uq_ip_org_size_tier
    `);
    await queryRunner.query(`
      ALTER TABLE installation_pricing
        ADD CONSTRAINT uq_ip_org_size_tier
        UNIQUE (organization_id, min_system_size_kw, max_system_size_kw)
    `);

    // 2.4 Drop unused GIN index on cost_components (no queries use it)
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_installation_pricing_cost_components"
    `);

    // ── Phase 3: Field Cleanup ──

    // 3.1 Drop unused columns: name, code, notes, project_type, audit fields, deleted_at
    await queryRunner.query(`
      ALTER TABLE installation_pricing
        DROP COLUMN IF EXISTS name,
        DROP COLUMN IF EXISTS code,
        DROP COLUMN IF EXISTS notes,
        DROP COLUMN IF EXISTS project_type,
        DROP COLUMN IF EXISTS created_by,
        DROP COLUMN IF EXISTS updated_by,
        DROP COLUMN IF EXISTS deleted_at
    `);

    // 3.2 Drop indexes that reference project_type
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_installation_pricing_org_project_active"
    `);

    // Drop TypeORM auto-generated index for the removed entity decorator
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_2d5a5e7b8e2f4a8c9d1e3f5a7c"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore dropped columns
    await queryRunner.query(`
      ALTER TABLE installation_pricing
        ADD COLUMN name varchar(100),
        ADD COLUMN code varchar(50),
        ADD COLUMN notes text,
        ADD COLUMN project_type varchar(30) DEFAULT 'residential',
        ADD COLUMN created_by uuid,
        ADD COLUMN updated_by uuid,
        ADD COLUMN deleted_at timestamptz
    `);

    // Set project_type for existing rows
    await queryRunner.query(`
      UPDATE installation_pricing SET project_type = 'residential' WHERE project_type IS NULL
    `);

    // Restore indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_installation_pricing_org_project_active"
      ON installation_pricing (organization_id, project_type, is_active)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_installation_pricing_cost_components"
      ON installation_pricing USING GIN (cost_components)
    `);

    // Drop constraints
    await queryRunner.query(`
      ALTER TABLE installation_pricing DROP CONSTRAINT IF EXISTS uq_ip_org_size_tier
    `);

    await queryRunner.query(`
      ALTER TABLE installation_pricing DROP CONSTRAINT IF EXISTS chk_ip_date_range
    `);

    await queryRunner.query(`
      ALTER TABLE installation_pricing DROP CONSTRAINT IF EXISTS chk_ip_size_range
    `);
  }
}
