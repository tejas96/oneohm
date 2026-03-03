import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddDependencyGINIndex1786000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_tasks_depends_on
      ON project_tasks USING GIN (depends_on_task_ids)
      WHERE deleted_at IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_project_tasks_depends_on`);
  }
}
