import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendPriorityEnumsToUnifiedSet1807000000000 implements MigrationInterface {
  name = 'ExtendPriorityEnumsToUnifiedSet1807000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extend project_tasks.priority CHECK to include 'normal'
    await queryRunner.query(`
      ALTER TABLE project_tasks
        DROP CONSTRAINT IF EXISTS project_tasks_priority_check
    `);
    await queryRunner.query(`
      ALTER TABLE project_tasks
        ADD CONSTRAINT project_tasks_priority_check
        CHECK (priority IN ('low', 'medium', 'normal', 'high', 'urgent'))
    `);

    // Extend projects.priority CHECK to include 'medium'
    await queryRunner.query(`
      ALTER TABLE projects
        DROP CONSTRAINT IF EXISTS chk_projects_priority
    `);
    await queryRunner.query(`
      ALTER TABLE projects
        ADD CONSTRAINT chk_projects_priority
        CHECK (priority IN ('low', 'medium', 'normal', 'high', 'urgent'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert project_tasks.priority CHECK (remove 'normal')
    await queryRunner.query(`
      ALTER TABLE project_tasks
        DROP CONSTRAINT IF EXISTS project_tasks_priority_check
    `);
    await queryRunner.query(`
      ALTER TABLE project_tasks
        ADD CONSTRAINT project_tasks_priority_check
        CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
    `);

    // Revert projects.priority CHECK (remove 'medium')
    await queryRunner.query(`
      ALTER TABLE projects
        DROP CONSTRAINT IF EXISTS chk_projects_priority
    `);
    await queryRunner.query(`
      ALTER TABLE projects
        ADD CONSTRAINT chk_projects_priority
        CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
    `);
  }
}
