import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Deactivates duplicate active integrations per provider+category (keeps newest),
 * then adds a partial unique index to prevent future duplicates.
 */
export class AddUniqueActiveIntegrationIndex1842000000000 implements MigrationInterface {
  name = 'AddUniqueActiveIntegrationIndex1842000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY provider, category
            ORDER BY updated_at DESC, created_at DESC
          ) AS rn
        FROM integrations
        WHERE is_active = true
      )
      UPDATE integrations
      SET is_active = false, updated_at = NOW()
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_integrations_active_provider_category
      ON integrations (provider, category)
      WHERE is_active = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_integrations_active_provider_category;
    `);
  }
}
