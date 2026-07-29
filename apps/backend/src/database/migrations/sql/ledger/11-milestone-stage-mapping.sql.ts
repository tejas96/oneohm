/**
 * Bind workflow tasks to payment milestones by STAGE, not by name.
 *
 * THE DEFECT. `v_milestone_completion` joined
 *   LOWER(TRIM(t.milestone_name)) = LOWER(TRIM(m.name))
 * across two vocabularies that barely overlap. Work milestones are named
 * "Installation", "Commissioning & Testing", "Handover"; payment milestones are
 * "Advance", "Installation Complete", "Commissioning". Measured across the whole
 * database the join matched 80 tasks for Commissioning, 10 for Installation
 * Complete, and ZERO for Advance. Event-driven due dates and the stalled-payment
 * alert therefore never fired for the milestones carrying ~95% of contract value,
 * and every receivables row read ageing "Current".
 *
 * THE FIX. Normalise both sides to a canonical work-stage key and join on that.
 * Payment milestones already carry a controlled `stage` vocabulary; tasks carry
 * free text, so it gets prefix rules rather than a literal list — `LIKE
 * 'commissioning%'` absorbs "Commissioning & Testing", `LIKE 'installation%'`
 * absorbs "Installation Complete".
 *
 * `advance` maps to NULL deliberately. An advance is due on order confirmation,
 * not on any task finishing — it has no workflow event and never will. Its due
 * date comes from the offset path instead.
 *
 * `due_basis_stage` already exists on payment_milestones and was NULL on every
 * row, so it becomes the per-milestone override at zero migration cost: NULL
 * means "use the default map". This migration writes NO data — it is pure DDL.
 */

export const CREATE_FN_WORK_STAGE_KEY = `
  CREATE OR REPLACE FUNCTION fn_work_stage_key(p_name TEXT)
  RETURNS TEXT LANGUAGE sql IMMUTABLE PARALLEL SAFE RETURNS NULL ON NULL INPUT AS $fn$
    SELECT CASE
      WHEN btrim(lower(p_name)) = ''                        THEN NULL
      WHEN btrim(lower(p_name)) LIKE 'commissioning%'
        OR btrim(lower(p_name)) = 'testing'                 THEN 'commissioning'
      WHEN btrim(lower(p_name)) LIKE 'installation%'
        OR btrim(lower(p_name)) = 'electrical'              THEN 'installation'
      WHEN btrim(lower(p_name)) LIKE 'material%'            THEN 'material_procurement'
      WHEN btrim(lower(p_name)) IN ('design', 'planning')   THEN 'design'
      WHEN btrim(lower(p_name)) LIKE 'permit%'
        OR btrim(lower(p_name)) = 'approval'                THEN 'permits'
      WHEN btrim(lower(p_name)) LIKE 'site survey%'         THEN 'site_survey'
      WHEN btrim(lower(p_name)) = 'inspection'              THEN 'inspection'
      WHEN btrim(lower(p_name)) = 'handover'                THEN 'handover'
      WHEN btrim(lower(p_name)) = 'monitoring'              THEN 'monitoring'
      ELSE NULL
    END
  $fn$
`;

export const CREATE_FN_PAYMENT_STAGE_WORK_KEY = `
  CREATE OR REPLACE FUNCTION fn_payment_stage_work_key(p_stage TEXT)
  RETURNS TEXT LANGUAGE sql IMMUTABLE PARALLEL SAFE RETURNS NULL ON NULL INPUT AS $fn$
    SELECT CASE btrim(lower(p_stage))
      WHEN 'installation_complete' THEN 'installation'
      WHEN 'installation_start'    THEN 'installation'
      WHEN 'commissioning'         THEN 'commissioning'
      WHEN 'material_procurement'  THEN 'material_procurement'
      WHEN 'design'                THEN 'design'
      WHEN 'net_metering'          THEN 'inspection'
      WHEN 'final_payment'         THEN 'handover'
      WHEN 'post_installation'     THEN 'handover'
      ELSE NULL
    END
  $fn$
`;

/**
 * Rebuilt completion view. DROP then CREATE, not CREATE OR REPLACE — the column
 * list gains `stage` and `work_stage_key`, and Postgres refuses a REPLACE that
 * changes the output shape.
 */
export const RECREATE_V_MILESTONE_COMPLETION = `
  CREATE VIEW v_milestone_completion AS
  WITH m AS (
    SELECT
      pm.id, pm.project_id, pm.organization_id, pm.name, pm.stage,
      COALESCE(
        NULLIF(btrim(pm.due_basis_stage), ''),
        fn_payment_stage_work_key(pm.stage)
      ) AS work_stage_key
    FROM payment_milestones pm
  )
  SELECT
    m.id                                                 AS milestone_id,
    m.project_id,
    m.organization_id,
    m.name,
    m.stage,
    m.work_stage_key,
    COUNT(t.id)::int                                     AS total_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'done')::int    AS done_tasks,
    (COUNT(t.id) > 0
      AND COUNT(t.id) = COUNT(t.id) FILTER (WHERE t.status = 'done')) AS is_complete,
    MAX(t.completed_at) FILTER (WHERE t.status = 'done') AS completed_at
  FROM m
  LEFT JOIN project_tasks t
    ON  t.project_id = m.project_id
    AND t.deleted_at IS NULL
    AND m.work_stage_key IS NOT NULL
    AND fn_work_stage_key(t.milestone_name) = m.work_stage_key
  GROUP BY m.id, m.project_id, m.organization_id, m.name, m.stage, m.work_stage_key
`;

/**
 * Two workflow step templates ship with no default milestone, so every task
 * created from them lands ungrouped and immediately reads as overdue on a
 * day-old project. Assign them by their department, matching the sibling steps
 * already in each group. Guarded on IS NULL so it never overwrites a deliberate
 * choice, and scoped by code so it cannot touch anything else.
 *
 * The COR-* steps are left alone on purpose: change-of-request work is raised
 * ad hoc and genuinely belongs to no delivery milestone.
 */
export const BACKFILL_WORKFLOW_STEP_MILESTONES = `
  UPDATE workflow_steps
     SET default_milestone_name  = 'Permits & Approvals',
         default_milestone_order = 3,
         updated_at              = now()
   WHERE code = 'LIA-09'
     AND deleted_at IS NULL
     AND default_milestone_name IS NULL
`;

export const BACKFILL_WORKFLOW_STEP_MILESTONES_LOAN = `
  UPDATE workflow_steps
     SET default_milestone_name  = 'Planning',
         default_milestone_order = 2,
         updated_at              = now()
   WHERE code = 'LOAN-002'
     AND deleted_at IS NULL
     AND default_milestone_name IS NULL
`;

/**
 * Existing tasks created from those two templates before the fix. Same guard:
 * only rows that are still ungrouped, only those two step codes.
 */
export const BACKFILL_UNGROUPED_TASKS = `
  UPDATE project_tasks t
     SET milestone_name  = ws.default_milestone_name,
         milestone_order = ws.default_milestone_order,
         updated_at      = now()
    FROM workflow_steps ws
   WHERE ws.id = t.workflow_step_id
     AND t.milestone_name IS NULL
     AND t.deleted_at IS NULL
     AND ws.default_milestone_name IS NOT NULL
`;

/** Report — never fail — on payment milestones no task can ever complete. */
export const ASSERT_STAGE_MAPPING_COVERAGE = `
  DO $$
  DECLARE unmapped INT;
  BEGIN
    SELECT COUNT(*) INTO unmapped
      FROM payment_milestones pm
     WHERE pm.status = 'active'
       AND pm.stage NOT IN ('advance', 'change_order', 'custom')
       AND COALESCE(NULLIF(btrim(pm.due_basis_stage), ''),
                    fn_payment_stage_work_key(pm.stage)) IS NULL;
    IF unmapped > 0 THEN
      RAISE WARNING 'MilestoneStageMapping: % active milestone(s) have a stage with no work-stage mapping; set due_basis_stage on them', unmapped;
    END IF;
  END $$
`;

export const ADD_MILESTONE_STAGE_MAPPING: string[] = [
  CREATE_FN_WORK_STAGE_KEY,
  CREATE_FN_PAYMENT_STAGE_WORK_KEY,
  `DROP VIEW IF EXISTS v_milestone_completion`,
  RECREATE_V_MILESTONE_COMPLETION,
  BACKFILL_WORKFLOW_STEP_MILESTONES,
  BACKFILL_WORKFLOW_STEP_MILESTONES_LOAN,
  BACKFILL_UNGROUPED_TASKS,
  ASSERT_STAGE_MAPPING_COVERAGE,
];

export const DROP_MILESTONE_STAGE_MAPPING: string[] = [
  `DROP VIEW IF EXISTS v_milestone_completion`,
  `DROP FUNCTION IF EXISTS fn_work_stage_key(TEXT)`,
  `DROP FUNCTION IF EXISTS fn_payment_stage_work_key(TEXT)`,
];
