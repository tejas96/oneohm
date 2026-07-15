import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remove Auto Split Feature
 *
 * - Drops the `auto_split_enabled` column from `subsidy_configurations`
 *
 * Note: `dcr_preference` was already dropped from the `quotes` table by
 * migration 1779000000000-RestructureQuoteTables. It now lives inside
 * the JSONB `quote_snapshot` on `quote_versions`, where the default is
 * controlled by the CalculateQuoteDto (application-level default: 'dcr_only').
 *
 * Historical quotes with dcrPreference = 'auto_split' in their JSONB
 * snapshots are preserved as-is.
 */
export class RemoveAutoSplitFeature1752537600000 implements MigrationInterface {
  name = 'RemoveAutoSplitFeature1752537600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop auto_split_enabled column from subsidy_configurations
    await queryRunner.query(
      `ALTER TABLE subsidy_configurations DROP COLUMN IF EXISTS auto_split_enabled`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add auto_split_enabled column with default true
    await queryRunner.query(
      `ALTER TABLE subsidy_configurations ADD COLUMN auto_split_enabled BOOLEAN NOT NULL DEFAULT true`,
    );
  }
}
