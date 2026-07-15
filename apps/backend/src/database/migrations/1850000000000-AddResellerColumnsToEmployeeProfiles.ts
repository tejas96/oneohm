import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: AddResellerColumnsToEmployeeProfiles
 *
 * Part 1/3 of the reseller_profiles → employee_profiles merge (see
 * RenameAndRepointResellerCommissions and DropResellerProfilesTable for the
 * remaining steps). No data backfill is needed: reseller_profiles is empty
 * in every environment at the time of this migration (confirmed before
 * planning this change), so this is a pure additive schema migration.
 *
 * 1. Add `profile_kind` discriminator ('staff' | 'reseller') + the 14
 *    reseller-only columns (nullable, NULL for profile_kind='staff' rows)
 *    to employee_profiles, matching the shape of the old reseller_profiles
 *    table (see CreateCustomersResellersTables / RefactorUsersProfilesTables).
 * 2. Add a partial unique index on (organization_id, company_code) and a
 *    composite lookup index on (organization_id, profile_kind, status, deleted_at).
 * 3. Widen the `status` CHECK constraint on employee_profiles to include
 *    'blocked' (new UserStatus value) and the other UserStatus values
 *    ('pending', 'archived') that the TypeORM entity/TS enum already allowed
 *    but the original inline CHECK (from RefactorUsersProfilesTables,
 *    `CHECK (status IN ('active', 'inactive', 'suspended'))`) never included.
 *    The constraint was created unnamed (Postgres auto-names it
 *    `employee_profiles_status_check`); we look it up dynamically rather than
 *    hardcoding that name, following the pattern already used in
 *    WidenBomAndAllocationCheckConstraints.
 */
export class AddResellerColumnsToEmployeeProfiles1850000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // 1. profile_kind discriminator
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE employee_profiles
      ADD COLUMN IF NOT EXISTS profile_kind VARCHAR(20) NOT NULL DEFAULT 'staff';
    `);

    // ============================================================
    // 2. Reseller-only columns (nullable, no DB-level default — application
    //    code sets sensible defaults on reseller-kind creates)
    // ============================================================
    await queryRunner.query(`
      ALTER TABLE employee_profiles
      ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS company_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS gstin VARCHAR(15),
      ADD COLUMN IF NOT EXISTS pan VARCHAR(10),
      ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS total_leads_generated INTEGER,
      ADD COLUMN IF NOT EXISTS total_projects_converted INTEGER,
      ADD COLUMN IF NOT EXISTS total_revenue_generated DECIMAL(15,2),
      ADD COLUMN IF NOT EXISTS total_commission_earned DECIMAL(15,2);
    `);

    // ============================================================
    // 3. Indexes
    // ============================================================
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_profiles_org_company_code
      ON employee_profiles(organization_id, company_code)
      WHERE company_code IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_profiles_org_kind_status
      ON employee_profiles(organization_id, profile_kind, status, deleted_at);
    `);

    // ============================================================
    // 4. Widen status CHECK constraint to include 'blocked' (and the other
    //    UserStatus values the TS enum already had: 'pending', 'archived')
    // ============================================================
    const statusConstraints = await queryRunner.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'employee_profiles' AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%status%'
    `);
    for (const constraint of statusConstraints) {
      await queryRunner.query(
        `ALTER TABLE employee_profiles DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}"`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE employee_profiles
      ADD CONSTRAINT employee_profiles_status_check
      CHECK (status IN ('active', 'inactive', 'suspended', 'pending', 'archived', 'blocked'));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore narrow status CHECK (matches the original
    // RefactorUsersProfilesTables value list)
    await queryRunner.query(`
      ALTER TABLE employee_profiles DROP CONSTRAINT IF EXISTS employee_profiles_status_check;
    `);
    await queryRunner.query(`
      ALTER TABLE employee_profiles
      ADD CONSTRAINT employee_profiles_status_check
      CHECK (status IN ('active', 'inactive', 'suspended'));
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_employee_profiles_org_kind_status;
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_employee_profiles_org_company_code;
    `);

    await queryRunner.query(`
      ALTER TABLE employee_profiles
      DROP COLUMN IF EXISTS total_commission_earned,
      DROP COLUMN IF EXISTS total_revenue_generated,
      DROP COLUMN IF EXISTS total_projects_converted,
      DROP COLUMN IF EXISTS total_leads_generated,
      DROP COLUMN IF EXISTS account_holder_name,
      DROP COLUMN IF EXISTS ifsc_code,
      DROP COLUMN IF EXISTS account_number,
      DROP COLUMN IF EXISTS bank_name,
      DROP COLUMN IF EXISTS commission_percentage,
      DROP COLUMN IF EXISTS pan,
      DROP COLUMN IF EXISTS gstin,
      DROP COLUMN IF EXISTS contact_person_name,
      DROP COLUMN IF EXISTS company_code,
      DROP COLUMN IF EXISTS company_name,
      DROP COLUMN IF EXISTS profile_kind;
    `);
  }
}
