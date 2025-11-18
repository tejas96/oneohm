import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create Integrations Table
 * Module: Integrations
 *
 * Creates multi-tenant integration management system for third-party services
 * Supports messaging, payment, storage, and other integration categories
 */
export class CreateIntegrationsTable1700000000021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // INTEGRATIONS TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        
        -- Integration Info
        name VARCHAR(100) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        category VARCHAR(50) NOT NULL,
        
        -- Credentials & Config
        auth_type VARCHAR(50) NOT NULL,
        credentials JSONB NOT NULL,
        configuration JSONB,
        
        -- Status
        is_active BOOLEAN DEFAULT true,
        last_validated_at TIMESTAMP WITH TIME ZONE,
        validation_error TEXT,
        
        -- Audit Fields
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id),
        updated_by UUID REFERENCES users(id),
        
        -- Constraint: One active integration per org+provider+category
        CONSTRAINT uq_integrations_org_provider_category 
          UNIQUE (organization_id, provider, category)
      );
    `);

    // ============================================
    // INDEXES
    // ============================================

    // Primary lookup: Get integrations for an org
    await queryRunner.query(`
      CREATE INDEX idx_integrations_org_active 
      ON integrations(organization_id, is_active);
    `);

    // Lookup by org + provider + category (for auto-resolution)
    await queryRunner.query(`
      CREATE INDEX idx_integrations_org_provider_category 
      ON integrations(organization_id, provider, category);
    `);

    // Lookup by provider (for admin monitoring)
    await queryRunner.query(`
      CREATE INDEX idx_integrations_provider_active 
      ON integrations(provider, is_active);
    `);

    // Lookup by category (for feature checks)
    await queryRunner.query(`
      CREATE INDEX idx_integrations_category_active 
      ON integrations(category, is_active) WHERE is_active = true;
    `);

    // ============================================
    // TRIGGER: Auto-update updated_at
    // ============================================
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_integrations_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_update_integrations_updated_at
      BEFORE UPDATE ON integrations
      FOR EACH ROW
      EXECUTE FUNCTION update_integrations_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger
    await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_update_integrations_updated_at ON integrations;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_integrations_updated_at();`);

    // Drop table (CASCADE will drop indexes and constraints automatically)
    await queryRunner.query(`DROP TABLE IF EXISTS integrations CASCADE;`);
  }
}

