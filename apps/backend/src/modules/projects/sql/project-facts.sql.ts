import {
  MILESTONE_LIFECYCLE_ALIASES,
  MILESTONE_LIFECYCLE_SEQUENCE,
} from '@tejas96/shared/constants';
import type { ProjectAttention, ProjectProgress, StageGroupKey } from '@tejas96/shared/types';
import {
  NET_METER_PHASE,
  SIDE_TRACK_PHASES,
  SIDE_TRACK_STEP_CODES,
  canonicalMilestoneName,
  normalizeMilestoneName,
  phaseToStageGroup,
} from '@tejas96/shared/utils';

import { systemSizeKwSqlRaw } from '../../../common/utils/transform.util';

/**
 * One row per counted project (not deleted, not cancelled) with every fact the
 * projects dashboard and the project list filters need.
 *
 * This is the SQL twin of `deriveProjectStage` (libs/shared/src/utils/project-stage.ts).
 * The phase table is generated from MILESTONE_LIFECYCLE_SEQUENCE at module load,
 * so the order here can never drift from the TS order. Change both together.
 *
 * Text, not a view: callers write `WITH ${PROJECT_FACTS_CTE} SELECT … FROM project_facts pf`.
 * It takes no parameters, so raw `$n` SQL and TypeORM `:name` SQL can both embed it.
 * Status is not trusted for "done" (spec D5) — only `cancelled` is read from it.
 */

const lit = (value: string): string => `'${value.replace(/'/g, "''")}'`;
const list = (values: readonly string[]): string => values.map(lit).join(', ');

/** Same steps as normalizeMilestoneName: trim, lower, & → and, non-alphanumerics → space, trim. */
const normalizedSql = (column: string): string =>
  `btrim(regexp_replace(replace(lower(btrim(COALESCE(${column}, ''))), '&', 'and'), '[^a-z0-9]+', ' ', 'g'))`;

const PHASE_NAME_ROWS = ((): string => {
  const rows = new Map<string, number>();
  for (const name of [
    ...MILESTONE_LIFECYCLE_SEQUENCE,
    ...Object.keys(MILESTONE_LIFECYCLE_ALIASES),
  ]) {
    const canonical = canonicalMilestoneName(name);
    if (!canonical) continue;
    rows.set(normalizeMilestoneName(name), MILESTONE_LIFECYCLE_SEQUENCE.indexOf(canonical) + 1);
  }
  return [...rows].map(([norm, idx]) => `(${lit(norm)}, ${idx})`).join(',\n    ');
})();

const PHASE_ROWS = MILESTONE_LIFECYCLE_SEQUENCE.map((phase, i) => {
  const group = phaseToStageGroup(phase);
  return `(${i + 1}, ${lit(phase)}, ${group ? lit(group) : 'NULL::text'})`;
}).join(',\n    ');

/**
 * `projectIdsParam` (e.g. `$1`) narrows the CTE to a uuid[] of projects, so a page of
 * ids does not aggregate every task in the database. Omit it for the whole population.
 */
export function projectFactsCte(
  opts: { includeCancelled?: boolean; projectIdsParam?: string } = {},
): string {
  return `
  pf_phase_name(norm_name, idx) AS (
    VALUES
    ${PHASE_NAME_ROWS}
  ),
  pf_phase(idx, phase, stage_group) AS (
    VALUES
    ${PHASE_ROWS}
  ),
  pf_task AS (
    SELECT
      t.project_id,
      t.id AS task_id,
      COALESCE(t.status = 'done', false) AS done,
      t.end_date,
      t.assigned_to_user_id,
      ws.default_department AS department,
      COALESCE(t.name_override, ws.name, t.name, t.code) AS step_name,
      ph.idx,
      ph.phase,
      ph.stage_group,
      (ph.phase = ${lit(NET_METER_PHASE)}) IS TRUE AS is_meter_step,
      (
        COALESCE(ws.loan_only, false)
        OR (COALESCE(ws.code, t.code) IN (${list(SIDE_TRACK_STEP_CODES)})) IS TRUE
        OR (ph.phase IN (${list(SIDE_TRACK_PHASES)})) IS TRUE
      ) AS side_track
    FROM project_tasks t
    LEFT JOIN workflow_steps ws ON ws.id = t.workflow_step_id
    LEFT JOIN pf_phase_name pn ON pn.norm_name = ${normalizedSql('COALESCE(t.milestone_name, ws.default_milestone_name)')}
    LEFT JOIN pf_phase ph ON ph.idx = pn.idx
    WHERE t.deleted_at IS NULL
      ${opts.projectIdsParam ? `AND t.project_id = ANY(${opts.projectIdsParam}::uuid[])` : ''}
  ),
  pf_task_ranked AS (
    SELECT
      pt.*,
      (NOT pt.side_track AND pt.stage_group IS NOT NULL) AS main_line,
      MAX(pt.idx) FILTER (WHERE pt.done AND NOT pt.side_track AND pt.stage_group IS NOT NULL)
        OVER (PARTITION BY pt.project_id) AS furthest_idx
    FROM pf_task pt
  ),
  pf_agg AS (
    SELECT
      r.project_id,
      COUNT(*) AS step_count,
      COUNT(*) FILTER (WHERE r.done) AS done_steps,
      COUNT(*) FILTER (WHERE NOT r.done) AS open_steps,
      COUNT(*) FILTER (WHERE r.main_line) AS main_steps,
      MAX(r.furthest_idx) AS furthest_idx,
      MIN(r.idx) FILTER (WHERE r.main_line AND NOT r.done) AS first_open_idx,
      MIN(r.idx) FILTER (WHERE r.main_line AND NOT r.done AND r.idx >= r.furthest_idx) AS next_open_idx,
      COUNT(*) FILTER (WHERE r.main_line AND NOT r.done AND r.idx < r.furthest_idx) AS old_open_steps,
      COUNT(*) FILTER (WHERE NOT r.done AND NOT r.side_track AND r.stage_group IS NULL) AS unstaged_open_steps,
      COUNT(*) FILTER (WHERE NOT r.done AND r.end_date < CURRENT_DATE) AS late_steps,
      MIN(r.end_date) FILTER (WHERE NOT r.done AND r.is_meter_step) AS meter_due_date
    FROM pf_task_ranked r
    GROUP BY r.project_id
  ),
  project_facts AS (
    SELECT
      p.id AS project_id,
      p.created_at,
      COALESCE(prop.wants_loan, false) AS wants_loan,
      (${systemSizeKwSqlRaw('qv')})::float AS kw,
      COALESCE(a.step_count, 0)::int AS step_count,
      COALESCE(a.done_steps, 0)::int AS done_steps,
      COALESCE(a.open_steps, 0)::int AS open_steps,
      (COALESCE(a.open_steps, 0) > 0 OR COALESCE(a.step_count, 0) = 0) AS is_live,
      stage.phase AS current_phase,
      stage.stage_group,
      COALESCE(a.old_open_steps, 0)::int AS old_open_steps,
      COALESCE(a.unstaged_open_steps, 0)::int AS unstaged_open_steps,
      COALESCE(a.late_steps, 0)::int AS late_steps,
      (com.project_id IS NOT NULL) AS meter_installed,
      com.meter_completed_at,
      CASE WHEN com.project_id IS NULL THEN a.meter_due_date END AS meter_due_date
    FROM projects p
    JOIN customer_properties prop ON prop.id = p.property_id
    LEFT JOIN quote_versions qv ON qv.id = p.contract_quote_version_id
    LEFT JOIN pf_agg a ON a.project_id = p.id
    LEFT JOIN v_project_commissioning com ON com.project_id = p.id
    LEFT JOIN pf_phase stage ON stage.idx = CASE
      WHEN COALESCE(a.main_steps, 0) = 0 THEN NULL
      WHEN a.furthest_idx IS NULL THEN a.first_open_idx
      ELSE COALESCE(a.next_open_idx, a.furthest_idx)
    END
    WHERE p.deleted_at IS NULL
      ${opts.includeCancelled ? '' : "AND p.status <> 'cancelled'"}
      ${opts.projectIdsParam ? `AND p.id = ANY(${opts.projectIdsParam}::uuid[])` : ''}
  )
`;
}

export const PROJECT_FACTS_CTE = projectFactsCte();

/**
 * Every "which projects" rule the dashboard counts with and the list filters by.
 * Both sides embed these exact strings, so a card can never disagree with the
 * list it opens (spec D6). Alias is always `pf`.
 */
export const FACTS = {
  live: 'pf.is_live',
  notStarted: 'pf.is_live AND pf.done_steps = 0',
  inProgress: 'pf.is_live AND pf.done_steps > 0',
  late: 'pf.is_live AND pf.late_steps > 0',
  oldSteps: 'pf.is_live AND pf.old_open_steps > 0',
  unstagedSteps: 'pf.is_live AND pf.unstaged_open_steps > 0',
  noStage: 'pf.is_live AND pf.stage_group IS NULL',
  loan: 'pf.wants_loan',
  cash: 'NOT pf.wants_loan',
} as const;

/** `CAST` rather than `::date` so the same text works with `$3` and with TypeORM `:name`. */
export const factsBetween = (
  column: 'created_at' | 'meter_completed_at' | 'meter_due_date',
  fromSql: string,
  toSql: string,
): string =>
  `CAST(pf.${column} AS date) BETWEEN CAST(${fromSql} AS date) AND CAST(${toSql} AS date)`;

export interface ProjectFactsFilters {
  financing?: 'cash' | 'loan';
  progress?: ProjectProgress;
  stage?: StageGroupKey | 'none';
  phase?: string;
  attention?: ProjectAttention;
  onboardedFrom?: string;
  onboardedTo?: string;
  meterInstalledFrom?: string;
  meterInstalledTo?: string;
  meterDueFrom?: string;
  meterDueTo?: string;
}

/**
 * The project-list facts filter as a standalone query: `SELECT pf.project_id …`
 * with TypeORM `:name` parameters. Returns null when no facts filter is set, so
 * the common list query is untouched. The caller runs it once and narrows the
 * list by the ids, so the CTE is not re-evaluated by each statement TypeORM
 * issues for a paginated list.
 */
export function buildProjectFactsFilter(
  f: ProjectFactsFilters | undefined,
): { sql: string; params: Record<string, unknown> } | null {
  if (!f) return null;
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (f.financing) where.push(f.financing === 'loan' ? FACTS.loan : FACTS.cash);
  if (f.progress === 'live') where.push(FACTS.live);
  if (f.progress === 'not_started') where.push(FACTS.notStarted);
  if (f.progress === 'in_progress') where.push(FACTS.inProgress);
  if (f.stage === 'none') where.push(FACTS.noStage);
  else if (f.stage) {
    where.push(`${FACTS.live} AND pf.stage_group = :pfStage`);
    params.pfStage = f.stage;
  }
  if (f.phase) {
    where.push(`${FACTS.live} AND pf.current_phase = :pfPhase`);
    params.pfPhase = f.phase;
  }
  if (f.attention === 'late_steps') where.push(FACTS.late);
  if (f.attention === 'old_steps') where.push(FACTS.oldSteps);
  if (f.attention === 'unstaged_steps') where.push(FACTS.unstagedSteps);

  const range = (
    column: 'created_at' | 'meter_completed_at' | 'meter_due_date',
    from: string | undefined,
    to: string | undefined,
    key: string,
  ): void => {
    if (from) {
      where.push(`CAST(pf.${column} AS date) >= CAST(:${key}From AS date)`);
      params[`${key}From`] = from;
    }
    if (to) {
      where.push(`CAST(pf.${column} AS date) <= CAST(:${key}To AS date)`);
      params[`${key}To`] = to;
    }
  };
  range('created_at', f.onboardedFrom, f.onboardedTo, 'pfOnboarded');
  range('meter_completed_at', f.meterInstalledFrom, f.meterInstalledTo, 'pfMeter');
  if (f.meterDueFrom || f.meterDueTo) where.push(FACTS.live);
  range('meter_due_date', f.meterDueFrom, f.meterDueTo, 'pfMeterDue');

  if (where.length === 0) return null;
  return {
    sql: `WITH ${PROJECT_FACTS_CTE} SELECT pf.project_id FROM project_facts pf WHERE ${where
      .map((w) => `(${w})`)
      .join(' AND ')}`,
    params,
  };
}
