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
    COUNT(t.id) FILTER (WHERE t.status = 'done')::int           AS "completedAllTime"
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
