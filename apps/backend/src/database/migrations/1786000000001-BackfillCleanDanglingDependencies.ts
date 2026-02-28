import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class BackfillCleanDanglingDependencies1786000000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE project_tasks pt
      SET depends_on_task_ids = (
        SELECT COALESCE(array_agg(dep_id), '{}')
        FROM unnest(pt.depends_on_task_ids) AS dep_id
        WHERE EXISTS (
          SELECT 1 FROM project_tasks pt2
          WHERE pt2.id = dep_id
            AND pt2.deleted_at IS NULL
            AND pt2.project_id = pt.project_id
        )
      )
      WHERE pt.depends_on_task_ids IS NOT NULL
        AND array_length(pt.depends_on_task_ids, 1) > 0
        AND pt.deleted_at IS NULL
    `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // Cannot restore removed dangling references -- no-op
  }
}
