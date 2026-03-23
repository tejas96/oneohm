import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssigneeToCustomerProfiles1796000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_profiles
      ADD COLUMN IF NOT EXISTS assignee_id UUID NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_profiles_assignee
      ON customer_profiles(assignee_id)
      WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_profiles_org_assignee
      ON customer_profiles(organization_id, assignee_id)
      WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_customer_profiles_org_assignee
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_customer_profiles_assignee
    `);

    await queryRunner.query(`
      ALTER TABLE customer_profiles
      DROP COLUMN IF EXISTS assignee_id
    `);
  }
}
