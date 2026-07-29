import { type MigrationInterface, type QueryRunner } from 'typeorm';

import { ADD_TASK_COMPLETION, DROP_TASK_COMPLETION } from './sql/ledger/08-task-completion.sql';

/**
 * AddTaskCompletionTracking — M8.
 *
 * Adds `project_tasks.completed_at` and the `v_milestone_completion` view that
 * bridges workflow tasks to payment milestones via `milestone_name`.
 *
 * This is what makes two client requirements answerable: the count of meter
 * installations completed in a period, and event-driven payment due dates.
 * The historical completion instants are recovered from the `activity_log`
 * jsonb the task service already writes on every status change — all 97
 * currently-done tasks carry one, so nothing has to be fabricated.
 *
 * Runs after the append-only triggers (M7) because it touches neither ledger
 * table.
 */
export class AddTaskCompletionTracking1851000000007 implements MigrationInterface {
  name = 'AddTaskCompletionTracking1851000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const statement of ADD_TASK_COMPLETION) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const statement of DROP_TASK_COMPLETION) {
      await queryRunner.query(statement);
    }
  }
}
