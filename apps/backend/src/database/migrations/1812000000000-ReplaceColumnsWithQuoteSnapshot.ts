import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceColumnsWithQuoteSnapshot1812000000000 implements MigrationInterface {
  name = 'ReplaceColumnsWithQuoteSnapshot1812000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE quote_versions ADD COLUMN quote_snapshot JSONB`);

    await queryRunner.query(`
      UPDATE quote_versions
      SET quote_snapshot = jsonb_build_object(
        'inputs', COALESCE(calculator_inputs, '{}'::jsonb),
        'calculation', '{}'::jsonb,
        'pricing', COALESCE(pricing_breakdown, '{}'::jsonb),
        'discountAmount', COALESCE((pricing_breakdown->>'discountAmount')::numeric, 0)
      )
    `);

    await queryRunner.query(`ALTER TABLE quote_versions DROP COLUMN calculator_inputs`);
    await queryRunner.query(`ALTER TABLE quote_versions DROP COLUMN pricing_breakdown`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE quote_versions ADD COLUMN calculator_inputs JSONB`);
    await queryRunner.query(`ALTER TABLE quote_versions ADD COLUMN pricing_breakdown JSONB`);

    await queryRunner.query(`
      UPDATE quote_versions
      SET
        calculator_inputs = quote_snapshot->'inputs',
        pricing_breakdown = quote_snapshot->'pricing'
      WHERE quote_snapshot IS NOT NULL
    `);

    await queryRunner.query(
      `ALTER TABLE quote_versions ALTER COLUMN pricing_breakdown SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE quote_versions DROP COLUMN quote_snapshot`);
  }
}
