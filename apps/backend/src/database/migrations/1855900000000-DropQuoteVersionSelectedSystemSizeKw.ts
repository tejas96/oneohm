import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Removes selected system size from quote_versions.
 *
 * `total_wattage_wp` is the only stored size. Strips `inputs.systemSizeKw`
 * from snapshots and aligns JSON size copies with the column before DROP.
 */
export class DropQuoteVersionSelectedSystemSizeKw1855900000000 implements MigrationInterface {
  name = 'DropQuoteVersionSelectedSystemSizeKw1855900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE quote_versions
      SET quote_snapshot = jsonb_set(
        jsonb_set(
          jsonb_set(
            quote_snapshot,
            '{inputs}',
            (COALESCE(quote_snapshot->'inputs', '{}'::jsonb) - 'systemSizeKw'),
            true
          ),
          '{calculation,actualSystemSizeKw}',
          to_jsonb(ROUND(total_wattage_wp / 1000.0, 2)),
          true
        ),
        '{calculation,systemConfig,totalSystemSizeKw}',
        to_jsonb(ROUND(total_wattage_wp / 1000.0, 2)),
        true
      )
      WHERE quote_snapshot IS NOT NULL
    `);

    await queryRunner.query(`
      UPDATE quote_versions
      SET quote_snapshot = jsonb_set(
        quote_snapshot,
        '{inputs,actualSystemSizeKw}',
        to_jsonb(ROUND(total_wattage_wp / 1000.0, 2)),
        true
      )
      WHERE quote_snapshot IS NOT NULL
        AND quote_snapshot->'inputs' ? 'actualSystemSizeKw'
    `);

    await queryRunner.query(`ALTER TABLE quote_versions DROP COLUMN IF EXISTS system_size_kw`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE quote_versions
      ADD COLUMN IF NOT EXISTS system_size_kw DECIMAL(10,2)
    `);

    await queryRunner.query(`
      UPDATE quote_versions
      SET system_size_kw = ROUND(total_wattage_wp / 1000.0, 2)
      WHERE system_size_kw IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE quote_versions
      ALTER COLUMN system_size_kw SET NOT NULL
    `);
  }
}
