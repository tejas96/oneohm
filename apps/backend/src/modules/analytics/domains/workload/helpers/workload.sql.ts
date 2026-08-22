/**
 * Department workload — pending and completed task counts per workflow step.
 *
 * Phase 1 of the client's dashboard request. The third metric they asked for,
 * "average time taken (standard vs actual)", is deliberately NOT here: of 4,932
 * completed tasks only 21 carry both a start_date and a completed_at, so a
 * duration built from them would describe 0.4% of the work while appearing to
 * describe all of it. See docs/superpowers/specs/2026-08-22-department-workload-design.md.
 *
 * `effort_days` IS returned, because it is the standard half of that comparison
 * and it costs nothing to carry. Nothing computes an actual against it yet.
 *
 * Steps with no department are change-request types (Consumer Name Change, New
 * Connection, …) rather than pipeline stages, and are excluded.
 */
export const WORKLOAD_BY_STEP_SQL = `
  SELECT
    ws.default_department                                      AS "department",
    ws.id::text                                                AS "stepId",
    ws.name                                                    AS "stepName",
    ws.sequence_order                                          AS "sequenceOrder",
    ws.effort_days                                             AS "standardDays",
    COUNT(t.id) FILTER (WHERE t.status <> 'done')::int          AS "pending",
    -- Completed is scoped to the requested window; pending deliberately is not.
    -- "How much is outstanding" is a question about now, not about a period,
    -- and filtering it by date would make the backlog shrink when someone
    -- narrowed the range.
    COUNT(t.id) FILTER (
      WHERE t.status = 'done'
        AND t.completed_at IS NOT NULL
        AND t.completed_at::date >= $1::date
        AND t.completed_at::date <= $2::date
    )::int                                                      AS "completed",
    COUNT(t.id) FILTER (WHERE t.status = 'done')::int           AS "completedAllTime",
    -- How long open work has been sitting, against the step's standard.
    --
    -- This is the honest form of the client's "average time taken (standard vs
    -- actual)". The literal reading needs a task START time, which exists for
    -- 0.4% of completed tasks. Age of work IN FLIGHT is knowable for all of it,
    -- measures the same thing, and unlike a retrospective average it describes
    -- work somebody can still act on.
    --
    -- Measured from created_at because that is the only reliable clock: tasks
    -- are generated for a project up front, so this is "days since this became
    -- somebody's problem", not "days somebody spent on it".
    ROUND(AVG(CURRENT_DATE - t.created_at::date)
      FILTER (WHERE t.status <> 'done'))::int                   AS "avgDaysOpen",
    MAX(CURRENT_DATE - t.created_at::date)
      FILTER (WHERE t.status <> 'done')::int                    AS "oldestDaysOpen"
  FROM workflow_steps ws
  LEFT JOIN project_tasks t
    ON t.workflow_step_id = ws.id
   AND t.deleted_at IS NULL
  LEFT JOIN projects pr
    ON pr.id = t.project_id AND pr.deleted_at IS NULL
  WHERE ws.deleted_at IS NULL
    AND ws.default_department IS NOT NULL
    AND ($3::text IS NULL OR ws.default_department = $3)
  GROUP BY ws.id, ws.default_department, ws.name, ws.sequence_order, ws.effort_days
  ORDER BY ws.default_department, ws.sequence_order
`;

/**
 * Where the money is stuck.
 *
 * Each project's earliest incomplete step is the one holding it up. Joined to
 * what that project still owes, this answers a question nobody asked and every
 * owner wants: which operational bottleneck is sitting on the most cash.
 *
 * Measured 2026-08-22: Rs 1.06 Cr — 56% of the entire receivable — behind a
 * single Liaisoning step across 85 projects.
 *
 * Money comes from `v_milestone_balance` on the same terms as the finance KPI
 * (`status = 'active' AND balance_paise > 0`), so this panel and the finance
 * figures elsewhere describe one population.
 *
 * Served from its own endpoint rather than folded into the step query: it
 * exposes receivables, so the web gates it on `finance.view` and simply does
 * not call it otherwise.
 */
export const WORKLOAD_BOTTLENECKS_SQL = `
  WITH blocked_at AS (
    -- The earliest incomplete step per project. A project with everything done
    -- drops out; so does one whose remaining steps carry no department.
    SELECT DISTINCT ON (t.project_id)
      t.project_id,
      ws.id   AS step_id,
      ws.name AS step_name,
      ws.default_department AS department
    FROM project_tasks t
    JOIN workflow_steps ws ON ws.id = t.workflow_step_id
    JOIN projects pr       ON pr.id = t.project_id AND pr.deleted_at IS NULL
    WHERE t.deleted_at IS NULL
      AND t.status <> 'done'
      AND ws.default_department IS NOT NULL
    ORDER BY t.project_id, ws.sequence_order
  ),
  owed AS (
    SELECT project_id, SUM(balance_paise)::BIGINT AS balance_paise
    FROM v_milestone_balance
    WHERE status = 'active' AND balance_paise > 0
    GROUP BY project_id
  )
  SELECT
    b.department                              AS "department",
    b.step_id::text                           AS "stepId",
    b.step_name                               AS "stepName",
    COUNT(*)::int                             AS "projectsStuck",
    (SUM(o.balance_paise) / 100.0)::float8    AS "amountOwed"
  FROM blocked_at b
  JOIN owed o ON o.project_id = b.project_id
  GROUP BY b.department, b.step_id, b.step_name
  ORDER BY SUM(o.balance_paise) DESC
  LIMIT $1
`;

/**
 * Total owed across every blocked project.
 *
 * Its own query rather than a sum of the rows above, because that list is
 * truncated — a share-of-total computed from a top-8 would show each row as a
 * larger slice of a smaller pie and quietly overstate every one of them.
 */
export const WORKLOAD_BOTTLENECK_TOTAL_SQL = `
  WITH blocked AS (
    SELECT DISTINCT t.project_id
    FROM project_tasks t
    JOIN workflow_steps ws ON ws.id = t.workflow_step_id
    JOIN projects pr       ON pr.id = t.project_id AND pr.deleted_at IS NULL
    WHERE t.deleted_at IS NULL
      AND t.status <> 'done'
      AND ws.default_department IS NOT NULL
  )
  SELECT COALESCE(SUM(v.balance_paise), 0)::BIGINT AS "totalPaise"
  FROM v_milestone_balance v
  JOIN blocked b ON b.project_id = v.project_id
  WHERE v.status = 'active' AND v.balance_paise > 0
`;
