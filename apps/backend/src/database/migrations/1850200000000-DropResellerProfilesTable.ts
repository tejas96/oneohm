import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: DropResellerProfilesTable
 *
 * Part 3/3 of the reseller_profiles → employee_profiles merge. By this point
 * every reseller-facing column lives on employee_profiles (migration 1) and
 * employee_commissions/quotes.reseller_id already point at employee_profiles
 * (migration 2), so reseller_profiles is fully retired.
 *
 * No data backfill is needed: reseller_profiles is empty in every
 * environment at the time of this migration (confirmed before planning this
 * change) — this is a pure contraction, safe to run with CASCADE.
 *
 * down() restores structure only (matching the convention already used by
 * RefactorUsersProfilesTables1700000000022's own down() for its dropped
 * `users_old` table) — this is a lossy rollback in general, but a non-issue
 * here in practice since the table is empty.
 */
export class DropResellerProfilesTable1850200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the per-row updated_at trigger + its function (created in
    // CreateCustomersResellersTables1700000000003)
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_resellers_updated_at ON reseller_profiles;
    `);
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_resellers_updated_at();
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS reseller_profiles CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Lossy rollback: restores table structure only, not data (there was no
    // data to lose — reseller_profiles was empty in every environment this
    // migration ran against). New rows created against employee_profiles
    // with profile_kind='reseller' after this migration ran are NOT moved
    // back into this table.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reseller_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        organization_id UUID,

        company_name VARCHAR(255) NOT NULL,
        company_code VARCHAR(50) NOT NULL,

        contact_person_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        alternate_phone VARCHAR(20),

        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'India',
        pincode VARCHAR(10),

        gstin VARCHAR(15),
        pan VARCHAR(10),

        commission_percentage DECIMAL(5,2) DEFAULT 4.00,
        commission_min_percentage DECIMAL(5,2) DEFAULT 2.00,
        commission_max_percentage DECIMAL(5,2) DEFAULT 10.00,

        bank_name VARCHAR(255),
        account_number VARCHAR(50),
        ifsc_code VARCHAR(20),
        account_holder_name VARCHAR(255),

        total_leads_generated INTEGER DEFAULT 0,
        total_projects_converted INTEGER DEFAULT 0,
        total_revenue_generated DECIMAL(15,2) DEFAULT 0,
        total_commission_earned DECIMAL(15,2) DEFAULT 0,

        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'blocked')),

        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,

        created_by UUID,
        updated_by UUID,

        CONSTRAINT uq_reseller_profiles_org_company_code UNIQUE (organization_id, company_code),
        CONSTRAINT uq_reseller_profiles_user_org UNIQUE (user_id, organization_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reseller_profiles_user_org ON reseller_profiles(user_id, organization_id);
      CREATE INDEX IF NOT EXISTS idx_reseller_profiles_org_status ON reseller_profiles(organization_id, status, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_reseller_profiles_email ON reseller_profiles(email) WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_reseller_profiles_phone ON reseller_profiles(phone) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_resellers_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trigger_update_resellers_updated_at
      BEFORE UPDATE ON reseller_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_resellers_updated_at();
    `);
  }
}
