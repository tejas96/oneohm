import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Restore `project_tasks.completed_at`, then bring every payment milestone's
 * due date up to date.
 *
 * WHAT BROKE
 *   `completed_at` was added by the ledger backfill (1851000000007), which
 *   recovered historical values from each task's `activity_log`. The column was
 *   never mapped on `ProjectTaskEntity`, so from that day nothing wrote it: a
 *   task moving to `done` left it untouched. `MAX(completed_at)` across the
 *   whole table sat frozen at the migration date while tasks kept being
 *   completed, and 1,219 done tasks were updated more than a day after their
 *   recorded completion.
 *
 *   Two features read that column and both stopped silently:
 *     - the event-driven due date — "a milestone becomes due when the workflow
 *       tasks carrying its name are complete" — became a permanent no-op;
 *     - the finance dashboard's meter-installation count, which buckets by
 *       `completed_at`, could only ever report zero.
 *
 *   The entity mapping and the write in `ProjectTaskService.updateStatus` are
 *   fixed in the same change as this migration. This repairs the rows that were
 *   completed while the write was missing.
 *
 * WHY THE ACTIVITY LOG IS TRUSTWORTHY HERE
 *   Every status change is appended to `project_tasks.activity_log` as
 *   `{fieldName: 'status', newValue: 'done', createdAt}`. All 1,219 affected
 *   tasks carry such an entry, so the true completion moment is recoverable
 *   rather than guessed — the same source and technique 1851000000007 used.
 *   `updated_at` is deliberately NOT used as a fallback: it moves for any edit,
 *   so it would date a task by its last comment rather than its completion.
 *
 * IDEMPOTENT
 *   Only writes where the recovered timestamp is newer than what is stored, so
 *   re-running changes nothing and a task completed after this migration keeps
 *   the value the application wrote.
 */
export class RestoreTaskCompletionTimestamps1854300000000 implements MigrationInterface {
  name = 'RestoreTaskCompletionTimestamps1854300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- 1. Recover completion timestamps -------------------------------
    await queryRunner.query(`
      UPDATE project_tasks t
         SET completed_at = recovered.done_at
        FROM (
          SELECT t2.id, MAX((e->>'createdAt')::timestamptz) AS done_at
          FROM project_tasks t2,
               LATERAL jsonb_array_elements(t2.activity_log) e
          WHERE t2.deleted_at IS NULL
            AND t2.status = 'done'
            AND jsonb_typeof(t2.activity_log) = 'array'
            AND e->>'fieldName' = 'status'
            AND e->>'newValue'  = 'done'
          GROUP BY t2.id
        ) recovered
       WHERE t.id = recovered.id
         AND (t.completed_at IS NULL OR t.completed_at < recovered.done_at)
    `);

    // ---- 2. Derive due dates from newly-visible stage completions --------
    // Same statement as MilestoneScheduleService.deriveDueDatesFromCompletedStages.
    // Run here so the schedule is correct the moment this deploys rather than
    // up to an hour later when the cron next fires.
    await queryRunner.query(`
      UPDATE payment_milestones m
         SET due_date = (c.completed_at::date + COALESCE(m.due_offset_days, 7)),
             due_date_source = 'stage_event',
             updated_at = CURRENT_TIMESTAMP
        FROM v_milestone_completion c
       WHERE c.milestone_id = m.id
         AND c.is_complete
         AND c.completed_at IS NOT NULL
         AND m.status = 'active'
         AND m.due_date IS NULL
         AND m.due_date_source IN ('unset', 'stage_event')
    `);

    // ---- 3. Derive due dates for milestones with no stage to wait for ----
    // `advance` maps to no work stage on purpose (migration 11): it falls due
    // on order confirmation, not on a task finishing. That migration named the
    // offset path as its source and `chk_payment_milestones_due_source` already
    // allowed 'offset', but nothing ever wrote it — so 105 unpaid advances
    // worth ₹89.3 lakh, the largest single category of receivables, could never
    // age past `current` or reach the chase list.
    //
    // Basis is the later of the project starting and the milestone being
    // created, so an advance dates from project start and a change order from
    // the day it was agreed.
    //
    // Same statement as MilestoneScheduleService.deriveDueDatesFromOffset.
    await queryRunner.query(`
      UPDATE payment_milestones m
         SET due_date = (
               GREATEST(
                 COALESCE(pr.start_date, pr.created_at::date),
                 m.created_at::date
               ) + COALESCE(m.due_offset_days, 7)
             ),
             due_date_source = 'offset',
             updated_at = CURRENT_TIMESTAMP
        FROM projects pr
       WHERE pr.id = m.project_id
         AND pr.deleted_at IS NULL
         AND m.status = 'active'
         AND m.due_date IS NULL
         AND m.due_date_source IN ('unset', 'offset')
         AND COALESCE(
               NULLIF(BTRIM(m.due_basis_stage), ''),
               fn_payment_stage_work_key(m.stage)
             ) IS NULL
    `);

    // ---- 4. Assert -------------------------------------------------------
    // A milestone that follows a work stage must never be given an offset date:
    // that would make it due before the work it is meant to follow.
    await queryRunner.query(`
      DO $$
      DECLARE n INTEGER;
      BEGIN
        SELECT COUNT(*) INTO n
        FROM payment_milestones
        WHERE due_date_source = 'offset'
          AND COALESCE(NULLIF(BTRIM(due_basis_stage), ''), fn_payment_stage_work_key(stage)) IS NOT NULL;
        IF n > 0 THEN
          RAISE EXCEPTION 'Due dates: % stage-driven milestones were given an offset date.', n;
        END IF;
      END $$
    `);

    // A manually entered due date is the operator's decision and outranks both
    // derivations. Neither statement above touches 'manual', but assert it.
    await queryRunner.query(`
      DO $$
      DECLARE n INTEGER;
      BEGIN
        SELECT COUNT(*) INTO n FROM payment_milestones
        WHERE due_date_source = 'manual' AND due_date IS NULL;
        IF n > 0 THEN
          RAISE EXCEPTION 'Due dates: % manual milestones lost their date.', n;
        END IF;
      END $$
    `);
  }

  /**
   * Reversible only in the sense that matters: the derived due dates are
   * dropped, returning those milestones to "no date". `completed_at` is left
   * alone — it holds recovered facts about when work finished, and discarding
   * them would re-break the meter-installation count for no benefit. Manually
   * entered dates are untouched in both directions.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE payment_milestones
         SET due_date = NULL, due_date_source = 'unset', updated_at = CURRENT_TIMESTAMP
       WHERE due_date_source IN ('stage_event', 'offset')
    `);
  }
}
