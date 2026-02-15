import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create Followups Table and Drop JSONB from Properties
 *
 * This migration:
 * 1. Creates a new `followups` table with proper relational structure
 * 2. Drops the JSONB `followups` column from `customer_properties`
 *
 * The new table supports both:
 * - Customer-level followups (propertyId is NULL)
 * - Property-level followups (propertyId is set)
 */
export class CreateFollowupsTableAndDropJsonb1773000000000 implements MigrationInterface {
  name = 'CreateFollowupsTableAndDropJsonb1773000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Part 1: Create new followups table
    await queryRunner.query(`
      CREATE TABLE followups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id),
        customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
        property_id UUID REFERENCES customer_properties(id) ON DELETE SET NULL,
        
        type VARCHAR(50) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
        assigned_to_user_id UUID NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        priority VARCHAR(20) DEFAULT 'normal',
        notes TEXT,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_by UUID,
        updated_by UUID
      )
    `);

    // Part 2: Create indexes for common queries
    await queryRunner.query(`
      CREATE INDEX idx_followups_org_status 
      ON followups(organization_id, status, deleted_at)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_followups_assigned_user 
      ON followups(assigned_to_user_id, scheduled_at) 
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_followups_customer 
      ON followups(customer_id) 
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_followups_property 
      ON followups(property_id) 
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_followups_scheduled 
      ON followups(scheduled_at, status) 
      WHERE deleted_at IS NULL
    `);

    // Part 3: Drop GIN index for JSONB (if exists)
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_customer_properties_followups
    `);

    // Part 4: Drop followups JSONB column from customer_properties
    await queryRunner.query(`
      ALTER TABLE customer_properties 
      DROP COLUMN IF EXISTS followups
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Part 1: Re-add followups JSONB column to customer_properties
    await queryRunner.query(`
      ALTER TABLE customer_properties 
      ADD COLUMN followups JSONB DEFAULT '[]'::jsonb
    `);

    // Part 2: Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_followups_scheduled`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_followups_property`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_followups_customer`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_followups_assigned_user`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_followups_org_status`);

    // Part 3: Drop followups table
    await queryRunner.query(`DROP TABLE IF EXISTS followups`);
  }
}
