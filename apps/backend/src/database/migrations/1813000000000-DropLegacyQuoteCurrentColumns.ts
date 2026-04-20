import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLegacyQuoteCurrentColumns1813000000000 implements MigrationInterface {
  name = 'DropLegacyQuoteCurrentColumns1813000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_quote_versions_current`);
    await queryRunner.query(`ALTER TABLE quote_versions DROP COLUMN IF EXISTS is_current`);
    await queryRunner.query(`ALTER TABLE quotes DROP COLUMN IF EXISTS current_version`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1`,
    );
    await queryRunner.query(
      `ALTER TABLE quote_versions ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT FALSE`,
    );

    await queryRunner.query(`
      UPDATE quote_versions v
      SET is_current = TRUE
      WHERE v.id IN (
        SELECT DISTINCT ON (qv.quote_id) qv.id
        FROM quote_versions qv
        ORDER BY qv.quote_id, qv.created_at DESC, qv.version_number DESC, qv.id DESC
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_quote_versions_current
      ON quote_versions(quote_id, is_current)
      WHERE is_current = TRUE
    `);
  }
}
