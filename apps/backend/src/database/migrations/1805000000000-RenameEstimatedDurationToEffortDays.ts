import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameEstimatedDurationToEffortDays1805000000000 implements MigrationInterface {
  name = 'RenameEstimatedDurationToEffortDays1805000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasOldColumn = await queryRunner.hasColumn('workflow_steps', 'estimated_duration_hours');
    const hasNewColumn = await queryRunner.hasColumn('workflow_steps', 'effort_days');

    if (hasOldColumn && !hasNewColumn) {
      await queryRunner.query(
        `ALTER TABLE workflow_steps RENAME COLUMN estimated_duration_hours TO effort_days`,
      );
    }

    // Convert legacy hour values to day effort (8h = 1 day, rounded up).
    await queryRunner.query(`
      UPDATE workflow_steps
      SET effort_days = CEIL(effort_days::numeric / 8.0)::integer
      WHERE effort_days IS NOT NULL
        AND effort_days > 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasOldColumn = await queryRunner.hasColumn('workflow_steps', 'estimated_duration_hours');
    const hasNewColumn = await queryRunner.hasColumn('workflow_steps', 'effort_days');

    if (!hasOldColumn && hasNewColumn) {
      await queryRunner.query(
        `ALTER TABLE workflow_steps RENAME COLUMN effort_days TO estimated_duration_hours`,
      );
    }
  }
}
