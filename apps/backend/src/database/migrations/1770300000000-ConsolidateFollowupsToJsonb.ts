import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Consolidate Follow-ups to JSONB
 *
 * This migration consolidates the scattered follow-up fields
 * (next_follow_up_date, last_contact_date, follow_up_notes)
 * into a single JSONB array column 'followups'.
 *
 * Changes:
 * - Drops: next_follow_up_date, last_contact_date, follow_up_notes columns
 * - Drops: idx_customer_properties_follow_up index
 * - Adds: followups JSONB column with default []
 * - Adds: GIN index for efficient JSONB querying
 */
export class ConsolidateFollowupsToJsonb1770300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add followups JSONB column first (while old data still exists)
    await queryRunner.query(`
      ALTER TABLE customer_properties
      ADD COLUMN IF NOT EXISTS followups JSONB DEFAULT '[]';
    `);

    // Add GIN index for efficient querying
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_properties_followups
      ON customer_properties USING GIN (followups jsonb_path_ops);
    `);

    // Drop old index (if exists)
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_customer_properties_follow_up";
      DROP INDEX IF EXISTS "IDX_customer_properties_nextFollowUpDate";
    `);

    // Drop old columns
    await queryRunner.query(`
      ALTER TABLE customer_properties
      DROP COLUMN IF EXISTS next_follow_up_date,
      DROP COLUMN IF EXISTS last_contact_date,
      DROP COLUMN IF EXISTS follow_up_notes;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the GIN index
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_customer_properties_followups;
    `);

    // Drop followups column
    await queryRunner.query(`
      ALTER TABLE customer_properties
      DROP COLUMN IF EXISTS followups;
    `);

    // Restore old columns
    await queryRunner.query(`
      ALTER TABLE customer_properties
      ADD COLUMN next_follow_up_date DATE,
      ADD COLUMN last_contact_date TIMESTAMP WITH TIME ZONE,
      ADD COLUMN follow_up_notes TEXT;
    `);

    // Restore old index
    await queryRunner.query(`
      CREATE INDEX idx_customer_properties_follow_up
      ON customer_properties(next_follow_up_date);
    `);
  }
}
