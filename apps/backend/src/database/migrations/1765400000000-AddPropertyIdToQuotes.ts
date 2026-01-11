import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add property_id to quotes table
 *
 * Links quotes to specific customer properties for better tracking
 * and property-specific quote generation.
 */
export class AddPropertyIdToQuotes1765400000000 implements MigrationInterface {
  name = 'AddPropertyIdToQuotes1765400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add property_id column with foreign key reference
    await queryRunner.query(`
      ALTER TABLE quotes 
      ADD COLUMN IF NOT EXISTS property_id UUID 
      REFERENCES customer_properties(id) ON DELETE SET NULL
    `);

    // Create index for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_quotes_property_id 
      ON quotes(property_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_quotes_property_id
    `);

    // Drop column
    await queryRunner.query(`
      ALTER TABLE quotes 
      DROP COLUMN IF EXISTS property_id
    `);
  }
}
