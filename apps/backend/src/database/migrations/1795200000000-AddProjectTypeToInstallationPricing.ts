import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectTypeToInstallationPricing1795200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE installation_pricing
      ADD COLUMN IF NOT EXISTS project_type varchar(30) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE installation_pricing
      DROP COLUMN IF EXISTS project_type
    `);
  }
}
