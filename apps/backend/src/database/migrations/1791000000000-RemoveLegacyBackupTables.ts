import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cleanup migration to drop legacy backup tables created during
 * the product catalog normalization. These backups are no longer
 * needed and should not be carried forward to new environments.
 */
export class RemoveLegacyBackupTables1791000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DROP TABLE IF EXISTS _backup_pricing_rules;
      DROP TABLE IF EXISTS _backup_product_categories;
      DROP TABLE IF EXISTS _backup_quote_line_items;
      DROP TABLE IF EXISTS _backup_products;
      `,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally left empty: backup tables are not needed anymore.
    // No-op to keep migration reversible without recreating legacy structures.
  }
}
