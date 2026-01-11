import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdatedAtToQuoteVersions1765400000001 implements MigrationInterface {
  name = 'AddUpdatedAtToQuoteVersions1765400000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing updated_at column to quote_versions table
    await queryRunner.query(`
      ALTER TABLE "quote_versions" 
      ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);

    // Create a reusable function to update updated_at timestamp (if not exists)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger to auto-update updated_at on row modification
    await queryRunner.query(`
      CREATE TRIGGER trigger_quote_versions_updated_at
      BEFORE UPDATE ON "quote_versions"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the trigger first
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_quote_versions_updated_at ON "quote_versions"
    `);

    // Drop the column
    await queryRunner.query(`
      ALTER TABLE "quote_versions" DROP COLUMN "updated_at"
    `);

    // Note: We don't drop the function as other tables may use it
  }
}
