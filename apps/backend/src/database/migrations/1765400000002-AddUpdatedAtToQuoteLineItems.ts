import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUpdatedAtToQuoteLineItems1765400000002 implements MigrationInterface {
  name = 'AddUpdatedAtToQuoteLineItems1765400000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing updated_at column to quote_line_items table
    await queryRunner.query(`
      ALTER TABLE "quote_line_items" 
      ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);

    // Create trigger to auto-update updated_at on row modification
    // (reusing the function created in previous migration)
    await queryRunner.query(`
      CREATE TRIGGER trigger_quote_line_items_updated_at
      BEFORE UPDATE ON "quote_line_items"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the trigger first
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_quote_line_items_updated_at ON "quote_line_items"
    `);

    // Drop the column
    await queryRunner.query(`
      ALTER TABLE "quote_line_items" DROP COLUMN "updated_at"
    `);
  }
}
