import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Create Compliance & Liaising Tables
 * Schema Reference: Lines 1874-2028
 * Module: Compliance & Liaising (3 tables)
 */
export class CreateComplianceTables1700000000018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // COMPLIANCE_APPLICATIONS TABLE
    // Schema: Lines 1876-1922
    // ============================================
    await queryRunner.query(`
      CREATE TABLE compliance_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        
        -- Application Info
        application_type VARCHAR(100) NOT NULL,
        application_number VARCHAR(50) UNIQUE NOT NULL,
        application_date DATE NOT NULL DEFAULT CURRENT_DATE,
        
        -- Authority Details
        authority_name VARCHAR(255),
        authority_reference_number VARCHAR(100),
        
        -- Status
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
          'draft', 'submitted', 'under_review', 'approved', 'rejected', 'on_hold'
        )),
        
        -- Submission
        submitted_at TIMESTAMP WITH TIME ZONE,
        submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
        
        -- Approval
        approved_at TIMESTAMP WITH TIME ZONE,
        approval_document_path TEXT,
        
        -- Rejection
        rejection_reason TEXT,
        rejected_at TIMESTAMP WITH TIME ZONE,
        
        -- Notes
        notes TEXT,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Create indexes for compliance_applications
    await queryRunner.query(`
      CREATE INDEX idx_compliance_applications_project 
      ON compliance_applications(project_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_compliance_applications_type 
      ON compliance_applications(application_type);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_compliance_applications_status 
      ON compliance_applications(status) WHERE deleted_at IS NULL;
    `);

    // Add auto-update trigger for updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_compliance_applications_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trigger_update_compliance_applications_updated_at
      BEFORE UPDATE ON compliance_applications
      FOR EACH ROW
      EXECUTE FUNCTION update_compliance_applications_updated_at();
    `);

    // ============================================
    // INSPECTIONS TABLE
    // Schema: Lines 1926-1973
    // ============================================
    await queryRunner.query(`
      CREATE TABLE inspections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        
        -- Inspection Info
        inspection_type VARCHAR(100) NOT NULL,
        inspection_number VARCHAR(50) UNIQUE NOT NULL,
        
        -- Schedule
        scheduled_date DATE NOT NULL,
        actual_date DATE,
        
        -- Inspector
        inspector_name VARCHAR(255),
        inspector_organization VARCHAR(255),
        inspector_contact VARCHAR(100),
        
        -- Status
        status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN (
          'scheduled', 'in_progress', 'passed', 'failed', 'rescheduled', 'cancelled'
        )),
        
        -- Results
        inspection_report TEXT,
        issues_found TEXT,
        corrective_actions TEXT,
        
        -- Documents
        report_file_path TEXT,
        photos JSONB,
        
        -- Notes
        notes TEXT,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Create indexes for inspections
    await queryRunner.query(`
      CREATE INDEX idx_inspections_project 
      ON inspections(project_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inspections_type 
      ON inspections(inspection_type);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inspections_status 
      ON inspections(status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_inspections_scheduled 
      ON inspections(scheduled_date);
    `);

    // Add auto-update trigger for updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_inspections_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trigger_update_inspections_updated_at
      BEFORE UPDATE ON inspections
      FOR EACH ROW
      EXECUTE FUNCTION update_inspections_updated_at();
    `);

    // ============================================
    // SUBSIDY_APPLICATIONS TABLE
    // Schema: Lines 1977-2028
    // ============================================
    await queryRunner.query(`
      CREATE TABLE subsidy_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        
        -- Application Info
        application_number VARCHAR(50) UNIQUE NOT NULL,
        application_date DATE NOT NULL DEFAULT CURRENT_DATE,
        
        -- Subsidy Details
        subsidy_scheme VARCHAR(255),
        applied_amount DECIMAL(15,2) NOT NULL,
        
        -- Portal Details
        portal_name VARCHAR(100),
        portal_application_id VARCHAR(100),
        
        -- Status
        status VARCHAR(50) DEFAULT 'initiated' CHECK (status IN (
          'initiated', 'submitted', 'under_review', 'approved', 'disbursed', 'rejected'
        )),
        
        -- Approval
        approved_amount DECIMAL(15,2),
        approved_at TIMESTAMP WITH TIME ZONE,
        
        -- Disbursement
        disbursement_date DATE,
        disbursement_amount DECIMAL(15,2),
        disbursement_mode VARCHAR(50),
        disbursement_reference VARCHAR(100),
        
        -- Rejection
        rejection_reason TEXT,
        
        -- Notes
        notes TEXT,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Create indexes for subsidy_applications
    await queryRunner.query(`
      CREATE INDEX idx_subsidy_applications_project 
      ON subsidy_applications(project_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_subsidy_applications_customer 
      ON subsidy_applications(customer_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_subsidy_applications_status 
      ON subsidy_applications(status) WHERE deleted_at IS NULL;
    `);

    // Add auto-update trigger for updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_subsidy_applications_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trigger_update_subsidy_applications_updated_at
      BEFORE UPDATE ON subsidy_applications
      FOR EACH ROW
      EXECUTE FUNCTION update_subsidy_applications_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_update_subsidy_applications_updated_at ON subsidy_applications;`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_update_inspections_updated_at ON inspections;`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_update_compliance_applications_updated_at ON compliance_applications;`,
    );

    // Drop trigger functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_subsidy_applications_updated_at();`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_inspections_updated_at();`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_compliance_applications_updated_at();`);

    // Drop tables in reverse order (respecting foreign key dependencies)
    await queryRunner.query(`DROP TABLE IF EXISTS subsidy_applications CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS inspections CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS compliance_applications CASCADE;`);
  }
}
