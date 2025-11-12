import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Create Payments Table
 * Module: Module 11 - Payments
 * Table: payments
 * Purpose: Track payments for projects with milestone-based payment support
 */
export class CreatePaymentsTable1700000000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // TABLE: payments
    // ============================================
    await queryRunner.query(`
      CREATE TABLE payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        project_id UUID NOT NULL,
        milestone_id UUID,
        customer_id UUID NOT NULL,
        
        -- Payment Info
        payment_number VARCHAR(50) UNIQUE NOT NULL,
        payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
        
        -- Amount
        expected_amount DECIMAL(15,2) NOT NULL,
        paid_amount DECIMAL(15,2) NOT NULL,
        
        -- Payment Method
        payment_method VARCHAR(50) NOT NULL,
        payment_reference VARCHAR(255),
        
        -- Bank Details
        bank_name VARCHAR(255),
        account_number VARCHAR(50),
        ifsc_code VARCHAR(20),
        transaction_id VARCHAR(100),
        
        -- Status
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
          'pending', 'received', 'verified', 'cleared', 'bounced', 'refunded'
        )),
        
        -- Reconciliation
        reconciled_at TIMESTAMP WITH TIME ZONE,
        reconciled_by UUID,
        
        -- Notes
        notes TEXT,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID,
        updated_by UUID,
        
        -- Foreign Keys
        CONSTRAINT fk_payments_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
        CONSTRAINT fk_payments_project FOREIGN KEY (project_id) REFERENCES projects(id),
        CONSTRAINT fk_payments_milestone FOREIGN KEY (milestone_id) REFERENCES project_milestones(id),
        CONSTRAINT fk_payments_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
        CONSTRAINT fk_payments_reconciled_by FOREIGN KEY (reconciled_by) REFERENCES users(id),
        CONSTRAINT fk_payments_created_by FOREIGN KEY (created_by) REFERENCES users(id),
        CONSTRAINT fk_payments_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
      );
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX idx_payments_organization ON payments(organization_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_payments_project ON payments(project_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_payments_milestone ON payments(milestone_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_payments_customer ON payments(customer_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_payments_status ON payments(status) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_payments_date ON payments(payment_date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS payments CASCADE;`);
  }
}

