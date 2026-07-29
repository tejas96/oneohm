/**
 * Task completion, and the bridge from workflow tasks to payment milestones.
 *
 * Every workflow task already carries `milestone_name`, and those names match
 * `payment_milestones.name` exactly for the payment-bearing stages
 * ("Installation Complete", "Commissioning", …). That linkage is what makes two
 * outstanding requirements answerable without inventing anything:
 *
 *  - **"how many meter installations were completed in this period"** — count
 *    completed tasks, by date.
 *  - **event-driven due dates** — a payment milestone becomes due when the
 *    workflow tasks carrying its name are all done.
 *
 * The missing piece was *when* a task was completed: `project_tasks` has only
 * `start_date` and `end_date`, both PLANNED. But `project-task.service.ts`
 * already writes a `status_changed` entry into the `activity_log` jsonb on every
 * transition — and all 97 currently-done tasks have one. So the history is
 * recoverable, and `completed_at` can be backfilled rather than lost.
 *
 * Going forward the column is set on the transition itself; the jsonb scan is a
 * one-time migration, not a query path.
 */

export const ADD_TASK_COMPLETED_AT = `
  ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ
`;

/**
 * Recover the completion instant from the activity log.
 *
 * `MAX` rather than `MIN`: a task can be reopened and completed again, and the
 * latest transition into `done` is the one that counts. Tasks whose history
 * predates activity logging get no date — deliberately NULL rather than a
 * fabricated `updated_at`, so a KPI never counts a completion it cannot evidence.
 */
export const BACKFILL_TASK_COMPLETED_AT = `
  UPDATE project_tasks t
     SET completed_at = src.completed_at
    FROM (
      SELECT t2.id,
             MAX((e->>'createdAt')::timestamptz) AS completed_at
        FROM project_tasks t2,
             jsonb_array_elements(t2.activity_log) e
       WHERE t2.status = 'done'
         AND e->>'fieldName' = 'status'
         AND e->>'newValue'  = 'done'
       GROUP BY t2.id
    ) src
   WHERE t.id = src.id
     AND t.completed_at IS NULL
`;

export const CREATE_TASK_COMPLETED_AT_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_project_tasks_completed_at
    ON project_tasks (completed_at)
    WHERE deleted_at IS NULL AND completed_at IS NOT NULL
`;

/** Speeds the milestone-name join used by the completion view. */
export const CREATE_TASK_MILESTONE_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_project_tasks_project_milestone
    ON project_tasks (project_id, milestone_name)
    WHERE deleted_at IS NULL AND milestone_name IS NOT NULL
`;

/**
 * When did each payment milestone's workflow actually finish?
 *
 * A payment milestone is "complete" when every task carrying its name is done;
 * the completion date is the LAST of those tasks. Milestones with no matching
 * tasks report `total_tasks = 0` and never appear complete — the join is on a
 * free-text name and the two vocabularies only partly overlap (tasks also carry
 * "Planning", "Permits & Approvals" and so on, which bear no payment).
 *
 * Left as a view rather than a stored column so it cannot drift from the tasks,
 * consistent with the rest of the ledger read model.
 */
export const CREATE_V_MILESTONE_COMPLETION = `
  CREATE OR REPLACE VIEW v_milestone_completion AS
  SELECT
    m.id                                                  AS milestone_id,
    m.project_id,
    m.organization_id,
    m.name,
    COUNT(t.id)::int                                      AS total_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'done')::int     AS done_tasks,
    (COUNT(t.id) > 0
      AND COUNT(t.id) = COUNT(t.id) FILTER (WHERE t.status = 'done')) AS is_complete,
    MAX(t.completed_at)                                   AS completed_at
  FROM payment_milestones m
  LEFT JOIN project_tasks t
    ON t.project_id = m.project_id
   AND t.deleted_at IS NULL
   AND LOWER(TRIM(t.milestone_name)) = LOWER(TRIM(m.name))
  GROUP BY m.id, m.project_id, m.organization_id, m.name
`;

export const ADD_TASK_COMPLETION: string[] = [
  ADD_TASK_COMPLETED_AT,
  BACKFILL_TASK_COMPLETED_AT,
  CREATE_TASK_COMPLETED_AT_INDEX,
  CREATE_TASK_MILESTONE_INDEX,
  CREATE_V_MILESTONE_COMPLETION,
];

export const DROP_TASK_COMPLETION: string[] = [
  `DROP VIEW IF EXISTS v_milestone_completion`,
  `DROP INDEX IF EXISTS idx_project_tasks_project_milestone`,
  `DROP INDEX IF EXISTS idx_project_tasks_completed_at`,
  `ALTER TABLE project_tasks DROP COLUMN IF EXISTS completed_at`,
];
