import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Migration: Add composite index for My Tasks queries.
 * Covers the primary query pattern: find tasks by assignee + active status + due date ordering.
 */
export class AddMyTasksCompositeIndex1785000000000 implements MigrationInterface {
  name = 'AddMyTasksCompositeIndex1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_project_tasks_my_tasks"
       ON "project_tasks" ("assigned_to_user_id", "status", "end_date")
       WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_project_tasks_my_tasks"`);
  }
}
