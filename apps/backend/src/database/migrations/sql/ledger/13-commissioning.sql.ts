/**
 * When did a project's net meter actually go in?
 *
 * `projects.status = 'completed'` cannot answer this: 7 projects claim it while
 * 41 have the meter installed. Status is not maintained, so nothing that must be
 * right may read it.
 *
 * 'Net Metering Application' is deliberately NOT matched. Applying to the DISCOM
 * is not the meter going in, and counting both roughly doubles the figure.
 *
 * `meter_dated` is false for the one project whose meter task predates activity
 * logging and therefore has no `completed_at`. Its age is unknown, and the UI
 * must render that as em-dash rather than as zero days.
 */
export const CREATE_V_PROJECT_COMMISSIONING = `
  CREATE OR REPLACE VIEW v_project_commissioning AS
  SELECT
    t.project_id,
    MAX(t.completed_at)                 AS meter_completed_at,
    (MAX(t.completed_at) IS NOT NULL)   AS meter_dated
  FROM project_tasks t
  WHERE t.deleted_at IS NULL
    AND t.status = 'done'
    AND BTRIM(LOWER(t.milestone_name)) LIKE 'net meter installation%'
  GROUP BY t.project_id
`;

export const DROP_V_PROJECT_COMMISSIONING = `DROP VIEW IF EXISTS v_project_commissioning`;
