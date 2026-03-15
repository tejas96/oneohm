import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Fix GST configuration defaults.
 *
 * The entity default was incorrectly set to rate1=12 (should be 5 for solar equipment).
 * This updates all existing rows that still have the old incorrect default, and also
 * updates the column default for new rows.
 *
 * Correct solar EPC composite GST:
 *   - 70% of base at 5% GST (solar equipment)
 *   - 30% of base at 18% GST (services/installation)
 */
export class FixGstConfigDefaults1789000000000 implements MigrationInterface {
  name = 'FixGstConfigDefaults1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update existing rows that have the old incorrect default (rate1=12)
    await queryRunner.query(`
      UPDATE quote_configurations
      SET gst_config = '{"rate1": 5, "rate1Percentage": 70, "rate2": 18, "rate2Percentage": 30}'::jsonb
      WHERE (gst_config->>'rate1')::int = 12
        AND (gst_config->>'rate1Percentage')::int = 70
        AND (gst_config->>'rate2')::int = 18
        AND (gst_config->>'rate2Percentage')::int = 30
    `);

    // Update column default for future rows
    await queryRunner.query(`
      ALTER TABLE quote_configurations
      ALTER COLUMN gst_config SET DEFAULT '{"rate1": 5, "rate1Percentage": 70, "rate2": 18, "rate2Percentage": 30}'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to old default
    await queryRunner.query(`
      ALTER TABLE quote_configurations
      ALTER COLUMN gst_config SET DEFAULT '{"rate1": 12, "rate1Percentage": 70, "rate2": 18, "rate2Percentage": 30}'::jsonb
    `);

    // Revert existing rows back
    await queryRunner.query(`
      UPDATE quote_configurations
      SET gst_config = '{"rate1": 12, "rate1Percentage": 70, "rate2": 18, "rate2Percentage": 30}'::jsonb
      WHERE (gst_config->>'rate1')::int = 5
        AND (gst_config->>'rate1Percentage')::int = 70
        AND (gst_config->>'rate2')::int = 18
        AND (gst_config->>'rate2Percentage')::int = 30
    `);
  }
}
