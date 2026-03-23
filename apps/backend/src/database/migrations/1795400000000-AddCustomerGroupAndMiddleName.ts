import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerGroupAndMiddleName1795400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_profiles
      ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS group_code VARCHAR(20) NULL,
      ADD COLUMN IF NOT EXISTS group_name VARCHAR(100) NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_profiles_org_group
      ON customer_profiles(organization_id, group_code)
      WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_customer_profiles_org_group
    `);

    await queryRunner.query(`
      ALTER TABLE customer_profiles
      DROP COLUMN IF EXISTS middle_name,
      DROP COLUMN IF EXISTS group_code,
      DROP COLUMN IF EXISTS group_name
    `);
  }
}
