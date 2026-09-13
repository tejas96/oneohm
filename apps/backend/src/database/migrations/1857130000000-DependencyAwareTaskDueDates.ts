import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A task's effort days are how long the work takes, not how long it is since the
 * project started.
 *
 * Every task used to be created with `end_date = project start + effort days`,
 * so a task that cannot begin until another one closes was already late before
 * anyone could touch it. A task with an unfinished dependency now carries no due
 * date at all, and gets `end_date = the day it came free + effort days` on the
 * day its last dependency closes.
 *
 * `due_date_is_auto` marks the dates this rule owns. It goes false the moment a
 * person sets a due date by hand, and from then on nothing here overwrites or
 * clears that date.
 *
 * The backfill clears the fake due dates already sitting on blocked tasks. It
 * touches only tasks that have not started, are not done, and whose step
 * actually carries an effort, so no hand-entered date on a step without an
 * effort is lost. Those cleared dates cannot be restored, so `down()` only drops
 * the column.
 */
export class DependencyAwareTaskDueDates1857130000000 implements MigrationInterface {
  name = 'DependencyAwareTaskDueDates1857130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE project_tasks
         ADD COLUMN IF NOT EXISTS due_date_is_auto boolean NOT NULL DEFAULT true`,
    );

    // Only `done` stops blocking dependents (task catalog: blocksDependents),
    // so any other live status on a dependency still holds its dependents back.
    await queryRunner.query(`
      UPDATE project_tasks t
         SET end_date = NULL
       WHERE t.deleted_at IS NULL
         AND t.status <> 'done'
         AND t.start_date IS NULL
         AND t.end_date IS NOT NULL
         AND EXISTS (
           SELECT 1
             FROM workflow_steps s
            WHERE s.id = t.workflow_step_id
              AND s.effort_days IS NOT NULL
         )
         AND EXISTS (
           SELECT 1
             FROM project_tasks d
            WHERE d.id = ANY(t.depends_on_task_ids)
              AND d.deleted_at IS NULL
              AND d.status <> 'done'
         )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE project_tasks DROP COLUMN IF EXISTS due_date_is_auto`);
  }
}
