import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Remove config_snapshot column from quote_versions
 * 
 * The config_snapshot column was storing audit data that was never actually used
 * in business logic. This migration removes it completely to clean up the schema.
 */
export class RemoveConfigSnapshotColumn1794000000000 implements MigrationInterface {
  name = 'RemoveConfigSnapshotColumn1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🗑️  Removing config_snapshot column from quote_versions table...');

    // Remove the config_snapshot column
    await queryRunner.query(`
      ALTER TABLE quote_versions 
      DROP COLUMN IF EXISTS config_snapshot
    `);

    console.log('✅ Successfully removed config_snapshot column');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Restoring config_snapshot column to quote_versions table...');

    // Restore the config_snapshot column
    await queryRunner.query(`
      ALTER TABLE quote_versions 
      ADD COLUMN config_snapshot jsonb
    `);

    // Restore the comment
    await queryRunner.query(`
      COMMENT ON COLUMN quote_versions.config_snapshot 
      IS 'Pricing configuration snapshot at time of quote creation for audit'
    `);

    console.log('✅ Successfully restored config_snapshot column');
  }
}