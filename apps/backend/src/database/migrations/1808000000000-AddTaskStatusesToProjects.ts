import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskStatusesToProjects1808000000000 implements MigrationInterface {
  public name = 'AddTaskStatusesToProjects1808000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS task_statuses JSONB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects DROP COLUMN IF EXISTS task_statuses
    `);
  }
}
