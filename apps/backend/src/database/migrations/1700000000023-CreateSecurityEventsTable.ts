import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create Security Events Table
 * Generic table for tracking all security-related events
 */
export class CreateSecurityEventsTable1700000000023 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create security_events table
    await queryRunner.query(`
      CREATE TABLE security_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE,
        
        -- Event Classification
        event_type VARCHAR(50) NOT NULL,
        event_category VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'info',
        status VARCHAR(20) NOT NULL,
        
        -- Event Data
        metadata JSONB NULL,
        ip_address INET NULL,
        user_agent TEXT NULL,
        resource_id UUID NULL,
        resource_type VARCHAR(50) NULL,
        error_message TEXT NULL,
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE NULL
      );
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX idx_security_events_org_type_created 
      ON security_events(organization_id, event_type, created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_security_events_user_type_created 
      ON security_events(user_id, event_type, created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_security_events_type_status_created 
      ON security_events(event_type, status, created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_security_events_category_severity_created 
      ON security_events(event_category, severity, created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_security_events_ip_type_created 
      ON security_events(ip_address, event_type, created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_security_events_expires_at 
      ON security_events(expires_at) WHERE expires_at IS NOT NULL;
    `);

    // Add check constraints
    await queryRunner.query(`
      ALTER TABLE security_events 
      ADD CONSTRAINT chk_security_events_severity 
      CHECK (severity IN ('info', 'warning', 'error', 'critical'));
    `);

    await queryRunner.query(`
      ALTER TABLE security_events 
      ADD CONSTRAINT chk_security_events_status 
      CHECK (status IN ('success', 'failed', 'pending', 'blocked'));
    `);

    // Create function for auto-updating updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Add trigger to auto-update updated_at
    await queryRunner.query(`
      CREATE TRIGGER update_security_events_updated_at
      BEFORE UPDATE ON security_events
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_security_events_updated_at ON security_events;`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column;`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_security_events_expires_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_security_events_ip_type_created;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_security_events_category_severity_created;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_security_events_type_status_created;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_security_events_user_type_created;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_security_events_org_type_created;`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS security_events CASCADE;`);
  }
}
