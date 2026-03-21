import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfitMarginTiersToQuoteConfigurations1795100000000 implements MigrationInterface {
  name = 'AddProfitMarginTiersToQuoteConfigurations1795100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE quote_configurations ADD COLUMN IF NOT EXISTS profit_margin_tiers jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE quote_configurations DROP COLUMN IF EXISTS profit_margin_tiers`,
    );
  }
}
