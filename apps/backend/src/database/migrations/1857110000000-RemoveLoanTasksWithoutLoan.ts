import { MigrationInterface, QueryRunner } from 'typeorm';

const REASON = 'rule_cleanup';

const RECOMPUTE_PROGRESS = `
  UPDATE projects p
     SET progress_percentage = x.pct,
         updated_at = CURRENT_TIMESTAMP
    FROM (
          SELECT t.project_id,
                 ROUND(100.0 * COUNT(*) FILTER (WHERE t.status = 'done') / COUNT(*))::int AS pct
            FROM project_tasks t
           WHERE t.deleted_at IS NULL
             AND t.project_id = ANY($1::uuid[])
           GROUP BY t.project_id
         ) x
   WHERE p.id = x.project_id
  RETURNING p.project_number, p.progress_percentage
`;

/**
 * One-time cleanup: loan-only tasks on live projects whose site has no loan.
 *
 * Until task rules existed every project got all 8 loan tasks. On a production
 * restore (2026-09-11), 174 of 174 projects without a loan carried them; on live
 * projects 634 sat unstarted and 644 had been marked done only to clear the list
 * (each loan step ~50% "done" on cash projects against ~80% on loan projects,
 * closed in batches, one with a ticked checklist item).
 *
 * On live projects (planning / active / on_hold) whose property has
 * wants_loan = false, it soft-deletes every task of a `loan_only` step that is
 * done or not started (backlog, no ticked checklist item), marked
 * `removal_reason = 'rule_cleanup'`. A started task stays.
 *
 * Progress is recomputed on the changed projects, but status is NOT changed: a
 * project that would reach 100% is logged for a person to complete in the UI,
 * so no project completes — and no customer is told so — from a migration.
 *
 * REVERTING: down() restores every task carrying REASON and recomputes progress,
 * except a task whose project has a live task for the same step again (the loan
 * sync adds one when a site's loan is turned on). That task stays deleted, and the
 * log counts it. The dependency links this removed from other tasks are not restored.
 */
export class RemoveLoanTasksWithoutLoan1857110000000 implements MigrationInterface {
  name = 'RemoveLoanTasksWithoutLoan1857110000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [removed] = (await queryRunner.query(
      `UPDATE project_tasks t
          SET deleted_at = CURRENT_TIMESTAMP,
              removal_reason = $1,
              updated_at = CURRENT_TIMESTAMP
         FROM projects p, customer_properties cp, workflow_steps s
        WHERE p.id = t.project_id
          AND cp.id = p.property_id
          AND s.id = t.workflow_step_id
          AND t.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND p.status IN ('planning', 'active', 'on_hold')
          AND cp.wants_loan = false
          AND s.loan_only = true
          AND (
                t.status = 'done'
             OR (t.status = 'backlog'
                 AND NOT EXISTS (
                   SELECT 1
                     FROM jsonb_array_elements(
                            CASE WHEN jsonb_typeof(COALESCE(t.checklist_override, t.checklist) -> 'items') = 'array'
                                 THEN COALESCE(t.checklist_override, t.checklist) -> 'items'
                                 ELSE '[]'::jsonb END) AS item
                    WHERE item ->> 'isCompleted' = 'true'))
              )
       RETURNING t.id, t.project_id, t.status`,
      [REASON],
    )) as [Array<{ id: string; project_id: string; status: string }>, number];

    const removedIds = removed.map((row) => row.id);
    const projectIds = [...new Set(removed.map((row) => row.project_id))];
    const doneCount = removed.filter((row) => row.status === 'done').length;

    console.warn(
      `[migration] Removed ${removed.length} loan task(s) from ${projectIds.length} live project(s) without a loan: ${doneCount} done, ${removed.length - doneCount} not started.`,
    );

    const kept: Array<{ n: number }> = await queryRunner.query(`
      SELECT count(*)::int AS n
        FROM project_tasks t
        JOIN projects p ON p.id = t.project_id
        JOIN customer_properties cp ON cp.id = p.property_id
        JOIN workflow_steps s ON s.id = t.workflow_step_id
       WHERE t.deleted_at IS NULL AND p.deleted_at IS NULL
         AND p.status IN ('planning', 'active', 'on_hold')
         AND cp.wants_loan = false AND s.loan_only = true
    `);
    console.warn(`[migration] Kept ${kept[0]?.n ?? 0} started loan task(s).`);

    if (removedIds.length === 0) return;

    await queryRunner.query(
      `UPDATE project_tasks
          SET depends_on_task_ids = ARRAY(
                SELECT dep FROM unnest(depends_on_task_ids) AS dep
                 WHERE dep <> ALL($1::uuid[]))
        WHERE deleted_at IS NULL
          AND depends_on_task_ids && $1::uuid[]`,
      [removedIds],
    );

    const [progress] = (await queryRunner.query(RECOMPUTE_PROGRESS, [projectIds])) as [
      Array<{ project_number: string; progress_percentage: number }>,
      number,
    ];
    const atHundred = progress.filter((row) => row.progress_percentage === 100);
    if (atHundred.length > 0) {
      console.warn(
        `[migration] ${atHundred.length} project(s) now at 100%; complete them in the UI: ${atHundred
          .map((row) => row.project_number)
          .join(', ')}`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [restored] = (await queryRunner.query(
      `UPDATE project_tasks t
          SET deleted_at = NULL, removal_reason = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE t.removal_reason = $1
          AND NOT EXISTS (
                SELECT 1
                  FROM project_tasks live
                 WHERE live.project_id = t.project_id
                   AND live.workflow_step_id = t.workflow_step_id
                   AND live.deleted_at IS NULL)
       RETURNING t.project_id`,
      [REASON],
    )) as [Array<{ project_id: string }>, number];

    const projectIds = [...new Set(restored.map((row) => row.project_id))];
    if (projectIds.length > 0) {
      await queryRunner.query(RECOMPUTE_PROGRESS, [projectIds]);
    }
    console.warn(
      `[migration] Restored ${restored.length} loan task(s) on ${projectIds.length} project(s).`,
    );

    const left: Array<{ n: number }> = await queryRunner.query(
      `SELECT count(*)::int AS n FROM project_tasks WHERE removal_reason = $1`,
      [REASON],
    );
    const leftCount = left[0]?.n ?? 0;
    if (leftCount > 0) {
      console.warn(
        `[migration] Left ${leftCount} loan task(s) deleted: their project has a live task for the same step again.`,
      );
    }
  }
}
