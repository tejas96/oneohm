import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create Customers, Resellers, and Reseller Commissions Tables
 * Module: Customers & Resellers (Module 3)
 */
export class CreateCustomersResellersTables1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // RESELLERS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE resellers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        
        -- Company Details
        company_name VARCHAR(255) NOT NULL,
        company_code VARCHAR(50) NOT NULL,
        
        -- Contact Person
        contact_person_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        alternate_phone VARCHAR(20),
        
        -- Address
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'India',
        pincode VARCHAR(10),
        
        -- Business Details
        gstin VARCHAR(15),
        pan VARCHAR(10),
        
        -- Commission Structure
        commission_percentage DECIMAL(5,2) DEFAULT 4.00,
        commission_min_percentage DECIMAL(5,2) DEFAULT 2.00,
        commission_max_percentage DECIMAL(5,2) DEFAULT 10.00,
        
        -- Bank Details
        bank_name VARCHAR(255),
        account_number VARCHAR(50),
        ifsc_code VARCHAR(20),
        account_holder_name VARCHAR(255),
        
        -- Performance Tracking
        total_leads_generated INTEGER DEFAULT 0,
        total_projects_converted INTEGER DEFAULT 0,
        total_revenue_generated DECIMAL(15,2) DEFAULT 0,
        total_commission_earned DECIMAL(15,2) DEFAULT 0,
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'blocked')),
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID,
        updated_by UUID,
        
        UNIQUE(organization_id, company_code)
      );
    `);

    // Create indexes for resellers table
    await queryRunner.query(`
      CREATE INDEX idx_resellers_organization_status ON resellers(organization_id, status, deleted_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_resellers_email ON resellers(email) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_resellers_phone ON resellers(phone) WHERE deleted_at IS NULL;
    `);

    // ============================================
    // CUSTOMERS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        
        -- Personal Info
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(20) NOT NULL,
        alternate_phone VARCHAR(20),
        
        -- Consumer Details
        consumer_number VARCHAR(50),
        consumer_name VARCHAR(255),
        current_load VARCHAR(50),
        
        -- Address
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'India',
        pincode VARCHAR(10),
        location_coordinates POINT,
        
        -- Property Details
        property_name VARCHAR(255),
        property_type VARCHAR(50),
        
        -- Source Tracking
        lead_source VARCHAR(50),
        referral_code VARCHAR(50),
        reseller_id UUID REFERENCES resellers(id) ON DELETE SET NULL,
        
        -- Status
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('lead', 'prospect', 'active', 'inactive')),
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID,
        updated_by UUID
      );
    `);

    // Create indexes for customers table
    await queryRunner.query(`
      CREATE INDEX idx_customers_organization_status ON customers(organization_id, status, deleted_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_customers_phone ON customers(phone) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_customers_email ON customers(email) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_customers_consumer_number ON customers(consumer_number) WHERE deleted_at IS NULL;
    `);

    // ============================================
    // RESELLER COMMISSIONS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE reseller_commissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        reseller_id UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
        project_id UUID,
        
        -- Commission Calculation
        project_value DECIMAL(15,2) NOT NULL,
        commission_percentage DECIMAL(5,2) NOT NULL,
        commission_amount DECIMAL(15,2) NOT NULL,
        
        -- Payment Status
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
        
        -- Approval
        approved_at TIMESTAMP WITH TIME ZONE,
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        
        -- Payment Details
        paid_at DATE,
        paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
        payment_mode VARCHAR(50),
        payment_reference VARCHAR(100),
        
        -- Invoice
        invoice_number VARCHAR(50),
        invoice_date DATE,
        invoice_file_path TEXT,
        
        -- Notes
        notes TEXT,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID,
        updated_by UUID
      );
    `);

    // Create indexes for reseller_commissions table
    await queryRunner.query(`
      CREATE INDEX idx_commissions_organization_reseller ON reseller_commissions(organization_id, reseller_id, status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_commissions_status ON reseller_commissions(status);
    `);

    // ============================================
    // TRIGGERS FOR updated_at
    // ============================================

    // Trigger for resellers
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_resellers_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trigger_update_resellers_updated_at
      BEFORE UPDATE ON resellers
      FOR EACH ROW
      EXECUTE FUNCTION update_resellers_updated_at();
    `);

    // Trigger for customers
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_customers_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trigger_update_customers_updated_at
      BEFORE UPDATE ON customers
      FOR EACH ROW
      EXECUTE FUNCTION update_customers_updated_at();
    `);

    // Trigger for reseller_commissions
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_reseller_commissions_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trigger_update_reseller_commissions_updated_at
      BEFORE UPDATE ON reseller_commissions
      FOR EACH ROW
      EXECUTE FUNCTION update_reseller_commissions_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_reseller_commissions_updated_at ON reseller_commissions;
      DROP FUNCTION IF EXISTS update_reseller_commissions_updated_at();
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_customers_updated_at ON customers;
      DROP FUNCTION IF EXISTS update_customers_updated_at();
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_update_resellers_updated_at ON resellers;
      DROP FUNCTION IF EXISTS update_resellers_updated_at();
    `);

    // Drop tables in reverse order (due to foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS reseller_commissions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS customers;`);
    await queryRunner.query(`DROP TABLE IF EXISTS resellers;`);
  }
}
