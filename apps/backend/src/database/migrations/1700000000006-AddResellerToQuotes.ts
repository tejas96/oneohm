import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Add Reseller ID to Quotes Table
 * Enables direct tracking of reseller-generated quotes
 */
export class AddResellerToQuotes1700000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add reseller_id column to quotes table
    await queryRunner.query(`
      ALTER TABLE quotes 
      ADD COLUMN reseller_id UUID REFERENCES resellers(id) ON DELETE SET NULL;
    `);

    // Create index for reseller_id
    await queryRunner.query(`
      CREATE INDEX idx_quotes_reseller 
      ON quotes(reseller_id) 
      WHERE deleted_at IS NULL;
    `);

    // Add comment explaining the field
    await queryRunner.query(`
      COMMENT ON COLUMN quotes.reseller_id IS 'Reseller who generated this quote (if applicable)';
    `);

    // Backfill existing quotes with reseller_id from customers table
    await queryRunner.query(`
      UPDATE quotes q
      SET reseller_id = c.reseller_id
      FROM customers c
      WHERE q.customer_id = c.id 
        AND c.reseller_id IS NOT NULL
        AND q.reseller_id IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_quotes_reseller;
    `);

    // Drop column
    await queryRunner.query(`
      ALTER TABLE quotes 
      DROP COLUMN IF EXISTS reseller_id;
    `);
  }
}

