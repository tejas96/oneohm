import { type MigrationInterface, type QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration: Add documents column to customer_properties table
 *
 * Purpose:
 * Allow storing property-level documents (identity documents, KYC docs, etc.)
 * independent of loan applications. This enables document upload without
 * requiring the customer to select "wants loan" option.
 *
 * Structure: JSONB array of PropertyDocument objects
 * [{ url: string, tag: string, fileName: string }, ...]
 */
export class AddDocumentsToCustomerProperties1769862463000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add documents JSONB column with default empty array
    await queryRunner.addColumn(
      'customer_properties',
      new TableColumn({
        name: 'documents',
        type: 'jsonb',
        default: "'[]'::jsonb",
        isNullable: false,
      }),
    );

    // Add a GIN index for efficient JSONB queries (if needed in future)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_properties_documents 
      ON customer_properties USING GIN (documents)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_customer_properties_documents
    `);

    // Remove the column
    await queryRunner.dropColumn('customer_properties', 'documents');
  }
}
