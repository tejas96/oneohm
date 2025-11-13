import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create Milestone Templates Table
 * Module: Projects & Milestones - Templates (Module 20)
 * Schema: Lines 2125-2167
 *
 * Creates reusable milestone templates to standardize project workflows.
 * Note: task_templates table already exists from earlier migration.
 */
export class CreateMilestoneTaskTemplates1700000000020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // MILESTONE_TEMPLATES TABLE
    // Schema: Lines 2125-2163
    // ============================================
    await queryRunner.query(`
      CREATE TABLE milestone_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL,
        description TEXT,
        
        -- Milestone Type
        type VARCHAR(50) NOT NULL,
        
        -- Payment Configuration
        requires_payment BOOLEAN DEFAULT FALSE,
        default_payment_percentage DECIMAL(5,2),
        
        -- Workflow
        sequence_order INTEGER NOT NULL,
        is_mandatory BOOLEAN DEFAULT TRUE,
        can_skip BOOLEAN DEFAULT FALSE,
        
        -- Dependencies
        depends_on_milestone_codes TEXT[],
        
        -- Duration
        estimated_duration_days INTEGER,
        
        -- Status
        is_active BOOLEAN DEFAULT TRUE,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        
        created_by UUID,
        updated_by UUID,
        
        UNIQUE(organization_id, code)
      );
    `);

    // ============================================
    // INDEXES FOR MILESTONE_TEMPLATES
    // Schema: Lines 2165-2166
    // ============================================
    await queryRunner.query(`
      CREATE INDEX idx_milestone_templates_org 
      ON milestone_templates(organization_id) WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_milestone_templates_type 
      ON milestone_templates(type) WHERE is_active = TRUE;
    `);

    // Add auto-update trigger for updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_milestone_templates_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trigger_update_milestone_templates_updated_at
      BEFORE UPDATE ON milestone_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_milestone_templates_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_update_milestone_templates_updated_at ON milestone_templates;`,
    );

    // Drop trigger function
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_milestone_templates_updated_at();`);

    // Drop milestone_templates table (task_templates remains as it's from earlier migration)
    await queryRunner.query(`DROP TABLE IF EXISTS milestone_templates CASCADE;`);
  }
}
