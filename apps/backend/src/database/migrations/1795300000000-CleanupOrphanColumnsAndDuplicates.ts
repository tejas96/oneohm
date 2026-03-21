import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupOrphanColumnsAndDuplicates1795300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop orphan columns that were removed from entities but never dropped from DB

    const qcColumns = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'quote_configurations'
         AND column_name IN ('wattage_rounding', 'min_profit_margin_percent')`,
    );
    for (const col of qcColumns) {
      await queryRunner.query(
        `ALTER TABLE "quote_configurations" DROP COLUMN IF EXISTS "${col.column_name}"`,
      );
    }

    const ipColumns = await queryRunner.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'installation_pricing'
         AND column_name = 'project_type'`,
    );
    if (ipColumns.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "installation_pricing" DROP COLUMN IF EXISTS "project_type"`,
      );
    }

    // Deduplicate system product types: keep the one with the earliest created_at
    await queryRunner.query(`
      DELETE FROM product_types
      WHERE is_system = true
        AND id NOT IN (
          SELECT DISTINCT ON (organization_id, code) id
          FROM product_types
          WHERE is_system = true
          ORDER BY organization_id, code, created_at ASC
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quote_configurations" ADD COLUMN IF NOT EXISTS "wattage_rounding" jsonb DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "quote_configurations" ADD COLUMN IF NOT EXISTS "min_profit_margin_percent" decimal(5,2) DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "installation_pricing" ADD COLUMN IF NOT EXISTS "project_type" varchar(30)`,
    );
  }
}
