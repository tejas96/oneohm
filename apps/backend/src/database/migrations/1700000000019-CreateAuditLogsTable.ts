import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create Audit Logs Table
 * Module: Audit & Logging (Module 19)
 * Schema: Lines 2039-2070
 *
 * Creates comprehensive audit trail system for tracking all entity changes
 */
export class CreateAuditLogsTable1700000000019 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // AUDIT_LOGS TABLE
    // Schema: Lines 2039-2064
    // ============================================
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id),
        
        -- Entity Info
        entity_type VARCHAR(100) NOT NULL,
        entity_id UUID NOT NULL,
        
        -- Action
        action VARCHAR(50) NOT NULL,
        
        -- Changes
        old_values JSONB,
        new_values JSONB,
        
        -- User Info
        user_id UUID REFERENCES users(id),
        ip_address INET,
        user_agent TEXT,
        
        -- Metadata
        metadata JSONB,
        
        -- Timestamp
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================
    // INDEXES
    // Schema: Lines 2066-2070
    // ============================================

    // Index for entity queries (most common)
    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_entity 
      ON audit_logs(entity_type, entity_id);
    `);

    // Index for user activity queries
    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_user 
      ON audit_logs(user_id);
    `);

    // Index for time-based queries
    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_created 
      ON audit_logs(created_at);
    `);

    // Index for action filtering
    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_action 
      ON audit_logs(action);
    `);

    // Index for organization queries
    await queryRunner.query(`
      CREATE INDEX idx_audit_logs_organization 
      ON audit_logs(organization_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop table (CASCADE will drop indexes automatically)
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs CASCADE;`);
  }
}
