import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateProjectStatusesToActive1833000000000 implements MigrationInterface {
  name = 'MigrateProjectStatusesToActive1833000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop old check constraint
    await queryRunner.query(`
      ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "chk_projects_status"
    `);

    // 2. Update existing status values to 'active'
    await queryRunner.query(`
      UPDATE "projects"
      SET "status" = 'active'
      WHERE "status" IN ('draft', 'in_progress', 'approved', 'testing')
    `);

    // 3. Add new check constraint with exact allowed statuses
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD CONSTRAINT "chk_projects_status"
      CHECK ("status" IN ('planning', 'active', 'on_hold', 'completed', 'cancelled'))
    `);

    // 4. Update default value for column status
    await queryRunner.query(`
      ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the new constraint
    await queryRunner.query(`
      ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "chk_projects_status"
    `);

    // Revert status to 'in_progress' for rollback compatibility
    await queryRunner.query(`
      UPDATE "projects"
      SET "status" = 'in_progress'
      WHERE "status" = 'active'
    `);

    // Revert old check constraint
    await queryRunner.query(`
      ALTER TABLE "projects"
      ADD CONSTRAINT "chk_projects_status"
      CHECK ("status" IN ('draft', 'planning', 'approved', 'in_progress', 'testing', 'completed', 'cancelled', 'on_hold'))
    `);

    // Revert default status column default to 'draft'
    await queryRunner.query(`
      ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'draft'
    `);
  }
}
