import { Injectable } from '@nestjs/common';
import type {
  DashboardRange,
  NeedsActionRow,
  ProjectsDashboard,
  StageGroupKey,
  StageProjects,
} from '@tejas96/shared/types';
import { STAGE_GROUPS } from '@tejas96/shared/utils';
import { DataSource } from 'typeorm';

import { FinanceReportingService } from '../../finance/services/finance-reporting.service';
import { FACTS, PROJECT_FACTS_CTE, factsBetween } from '../sql/project-facts.sql';
import { addDaysIso } from '../utils/dashboard-period';

/**
 * `$1` member pin (null = all projects), `$2` financing ('cash' | 'loan' | null).
 * Same member rule as the project list (`resolveProjectListMemberId`), same
 * financing rule as Finance (`customer_properties.wants_loan`).
 */
const SCOPED = `
  WITH ${PROJECT_FACTS_CTE},
  scoped AS (
    SELECT pf.* FROM project_facts pf
    WHERE ($1::uuid IS NULL OR pf.project_id IN (
            SELECT tm.project_id FROM project_team_members tm WHERE tm.user_id = $1::uuid))
      AND ($2::text IS NULL
           OR ($2::text = 'loan' AND ${FACTS.loan})
           OR ($2::text = 'cash' AND ${FACTS.cash}))
  )`;

const inPeriod = (column: 'created_at' | 'meter_completed_at'): string => factsBetween(column, '$3', '$4');

/** $3 from, $4 to, $5 previousFrom, $6 previousTo, $7 comingFrom, $8 comingTo, $9 thisWeekTo, $10 nextWeekFrom, $11 nextWeekTo */
const STRIP_SQL = `${SCOPED}
  SELECT
    COUNT(*) FILTER (WHERE ${inPeriod('created_at')})::int AS "onboarded",
    COALESCE(SUM(pf.kw) FILTER (WHERE ${inPeriod('created_at')}), 0)::float AS "onboardedKw",
    COUNT(*) FILTER (WHERE ${inPeriod('created_at')} AND pf.kw IS NULL)::int AS "onboardedKwUnknown",
    COUNT(*) FILTER (WHERE ${inPeriod('created_at')} AND ${FACTS.loan})::int AS "onboardedLoan",
    COUNT(*) FILTER (WHERE ${FACTS.live})::int AS "live",
    COALESCE(SUM(pf.kw) FILTER (WHERE ${FACTS.live}), 0)::float AS "liveKw",
    COUNT(*) FILTER (WHERE ${FACTS.live} AND pf.kw IS NULL)::int AS "liveKwUnknown",
    COUNT(*) FILTER (WHERE ${FACTS.notStarted})::int AS "notStarted",
    COUNT(*) FILTER (WHERE ${FACTS.inProgress})::int AS "inProgress",
    COUNT(*) FILTER (WHERE ${inPeriod('meter_completed_at')})::int AS "meterInstalled",
    COALESCE(SUM(pf.kw) FILTER (WHERE ${inPeriod('meter_completed_at')}), 0)::float AS "meterKw",
    COUNT(*) FILTER (WHERE ${inPeriod('meter_completed_at')} AND pf.kw IS NULL)::int AS "meterKwUnknown",
    COUNT(*) FILTER (WHERE ${factsBetween('meter_completed_at', '$5', '$6')})::int AS "meterInstalledPrevious",
    COUNT(*) FILTER (WHERE ${FACTS.late})::int AS "late",
    COUNT(*) FILTER (WHERE ${FACTS.noStage})::int AS "noStage",
    COUNT(*) FILTER (WHERE ${FACTS.unstagedSteps})::int AS "unstagedSteps",
    COUNT(*) FILTER (WHERE ${FACTS.oldSteps})::int AS "oldStepsOpen",
    COUNT(*) FILTER (WHERE ${FACTS.live} AND ${factsBetween('meter_due_date', '$7', '$8')})::int AS "comingUp",
    COALESCE(SUM(pf.kw) FILTER (WHERE ${FACTS.live} AND ${factsBetween('meter_due_date', '$7', '$8')}), 0)::float AS "comingUpKw",
    COUNT(*) FILTER (WHERE ${FACTS.live} AND ${factsBetween('meter_due_date', '$7', '$9')})::int AS "comingThisWeek",
    COUNT(*) FILTER (WHERE ${FACTS.live} AND ${factsBetween('meter_due_date', '$10', '$11')})::int AS "comingNextWeek"
  FROM scoped pf`;

const STAGES_SQL = `${SCOPED}
  SELECT pf.stage_group AS "stageGroup", pf.current_phase AS "phase",
         COUNT(*)::int AS "count",
         COUNT(*) FILTER (WHERE pf.late_steps > 0)::int AS "late",
         COALESCE(SUM(pf.kw), 0)::float AS "kw"
  FROM scoped pf
  WHERE ${FACTS.live} AND pf.stage_group IS NOT NULL
  GROUP BY 1, 2`;

const CUSTOMER_NAME = `NULLIF(TRIM(CONCAT_WS(' ', cp.first_name, cp.last_name)), '')`;

/** One row per late project: its oldest late step. */
const NEEDS_ACTION_SQL = `${SCOPED},
  late_step AS (
    SELECT DISTINCT ON (t.project_id)
      t.project_id, t.task_id, t.step_name, t.department, t.assigned_to_user_id,
      (CURRENT_DATE - t.end_date)::int AS days_late
    FROM pf_task t
    JOIN scoped pf ON pf.project_id = t.project_id AND ${FACTS.late}
    WHERE NOT t.done AND t.end_date < CURRENT_DATE
    ORDER BY t.project_id, t.end_date ASC, t.task_id
  )
  SELECT ls.project_id AS "projectId", p.project_number AS "projectNumber",
         ${CUSTOMER_NAME} AS "customerName",
         ls.task_id AS "taskId", ls.step_name AS "stepName", ls.department,
         NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), '') AS "assigneeName",
         ls.days_late AS "daysLate",
         COUNT(*) OVER ()::int AS "total"
  FROM late_step ls
  JOIN projects p ON p.id = ls.project_id
  JOIN customer_properties prop ON prop.id = p.property_id
  LEFT JOIN customer_profiles cp ON cp.id = prop.customer_id
  LEFT JOIN users u ON u.id = ls.assigned_to_user_id
  ORDER BY ls.days_late DESC, p.project_number
  LIMIT 8`;

const TEAMS_SQL = `${SCOPED}
  SELECT COALESCE(t.department, 'Other') AS "department", COUNT(*)::int AS "lateSteps"
  FROM pf_task t
  JOIN scoped pf ON pf.project_id = t.project_id AND ${FACTS.live}
  WHERE NOT t.done AND t.end_date < CURRENT_DATE
  GROUP BY 1
  ORDER BY 2 DESC, 1`;

const TREND_SQL = `${SCOPED},
  months AS (
    SELECT generate_series(
      date_trunc('month', CURRENT_DATE) - interval '11 months',
      date_trunc('month', CURRENT_DATE),
      interval '1 month'
    )::date AS m
  )
  SELECT to_char(mo.m, 'YYYY-MM') AS "month",
    COUNT(pf.project_id) FILTER (WHERE date_trunc('month', pf.created_at)::date = mo.m)::int AS "onboarded",
    COALESCE(SUM(pf.kw) FILTER (WHERE date_trunc('month', pf.created_at)::date = mo.m), 0)::float AS "onboardedKw",
    COUNT(pf.project_id) FILTER (WHERE date_trunc('month', pf.meter_completed_at)::date = mo.m)::int AS "meterInstalled",
    COALESCE(SUM(pf.kw) FILTER (WHERE date_trunc('month', pf.meter_completed_at)::date = mo.m), 0)::float AS "meterKw"
  FROM months mo
  LEFT JOIN scoped pf
    ON date_trunc('month', pf.created_at)::date = mo.m
    OR date_trunc('month', pf.meter_completed_at)::date = mo.m
  GROUP BY mo.m
  ORDER BY mo.m`;

/** $3 stage key or 'none', $4 phase or null. */
const STAGE_PROJECTS_SQL = `${SCOPED},
  picked AS (
    SELECT pf.* FROM scoped pf
    WHERE CASE WHEN $3::text = 'none' THEN ${FACTS.noStage}
               ELSE ${FACTS.live} AND pf.stage_group = $3::text END
      AND ($4::text IS NULL OR pf.current_phase = $4::text)
  ),
  worst AS (
    SELECT t.project_id, MAX(CURRENT_DATE - t.end_date)::int AS days_late
    FROM pf_task t
    JOIN picked pk ON pk.project_id = t.project_id
    WHERE NOT t.done AND t.end_date < CURRENT_DATE
    GROUP BY t.project_id
  )
  SELECT pk.project_id AS "projectId", p.project_number AS "projectNumber",
         ${CUSTOMER_NAME} AS "customerName",
         pk.kw, pk.current_phase AS "currentPhase", w.days_late AS "daysLate",
         COUNT(*) OVER ()::int AS "total"
  FROM picked pk
  JOIN projects p ON p.id = pk.project_id
  JOIN customer_properties prop ON prop.id = p.property_id
  LEFT JOIN customer_profiles cp ON cp.id = prop.customer_id
  LEFT JOIN worst w ON w.project_id = pk.project_id
  ORDER BY w.days_late DESC NULLS LAST, p.created_at DESC
  LIMIT 10`;

type Row = Record<string, unknown>;
const num = (v: unknown): number => Number(v ?? 0);

/** Monday-based weeks, IST. */
function comingUpWindow(today: string): {
  from: string;
  to: string;
  thisWeekTo: string;
  nextWeekFrom: string;
  nextWeekTo: string;
} {
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon = 0
  const monday = addDaysIso(today, -weekday);
  return {
    from: today,
    to: addDaysIso(today, 30),
    thisWeekTo: addDaysIso(monday, 6),
    nextWeekFrom: addDaysIso(monday, 7),
    nextWeekTo: addDaysIso(monday, 13),
  };
}

@Injectable()
export class ProjectDashboardService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly finance: FinanceReportingService,
  ) {}

  async getDashboard(input: {
    range: DashboardRange;
    today: string;
    financing: 'cash' | 'loan' | null;
    memberId: string | null;
    includeMoney: boolean;
  }): Promise<ProjectsDashboard> {
    const { range, financing, memberId } = input;
    const base = [memberId, financing];
    const coming = comingUpWindow(input.today);

    const [[s = {}], stageRows, needsRows, teamRows, trendRows, money] = await Promise.all([
      this.rows(STRIP_SQL, [
        ...base,
        range.from,
        range.to,
        range.previousFrom,
        range.previousTo,
        coming.from,
        coming.to,
        coming.thisWeekTo,
        coming.nextWeekFrom,
        coming.nextWeekTo,
      ]),
      this.rows(STAGES_SQL, base),
      this.rows(NEEDS_ACTION_SQL, base),
      this.rows(TEAMS_SQL, base),
      this.rows(TREND_SQL, base),
      input.includeMoney ? this.getMoney(financing) : Promise.resolve(null),
    ]);

    const live = num(s.live);
    const onboarded = num(s.onboarded);
    const onboardedLoan = num(s.onboardedLoan);

    return {
      period: range,
      strip: {
        onboarded: {
          count: onboarded,
          kw: num(s.onboardedKw),
          kwUnknown: num(s.onboardedKwUnknown),
          loan: onboardedLoan,
          cash: onboarded - onboardedLoan,
        },
        live: {
          count: live,
          kw: num(s.liveKw),
          kwUnknown: num(s.liveKwUnknown),
          notStarted: num(s.notStarted),
          inProgress: num(s.inProgress),
        },
        meterInstalled: {
          count: num(s.meterInstalled),
          kw: num(s.meterKw),
          kwUnknown: num(s.meterKwUnknown),
          previousCount: num(s.meterInstalledPrevious),
        },
        late: {
          count: num(s.late),
          percentOfLive: live > 0 ? Math.round((num(s.late) * 100) / live) : 0,
        },
        money,
      },
      stages: STAGE_GROUPS.map((g) => {
        const rows = stageRows.filter((r) => r.stageGroup === g.key);
        return {
          key: g.key,
          label: g.label,
          count: rows.reduce((a, r) => a + num(r.count), 0),
          lateCount: rows.reduce((a, r) => a + num(r.late), 0),
          kw: rows.reduce((a, r) => a + num(r.kw), 0),
          phases: g.phases.flatMap((name) => {
            const row = rows.find((r) => r.phase === name);
            return row ? [{ name, count: num(row.count) }] : [];
          }),
        };
      }),
      stageNotes: {
        noStage: num(s.noStage),
        unstagedSteps: num(s.unstagedSteps),
        oldStepsOpen: num(s.oldStepsOpen),
      },
      needsAction: {
        total: needsRows.length > 0 ? num(needsRows[0]?.total) : 0,
        rows: needsRows.map(
          (r): NeedsActionRow => ({
            projectId: String(r.projectId),
            projectNumber: String(r.projectNumber),
            customerName: (r.customerName as string | null) ?? null,
            taskId: String(r.taskId),
            stepName: String(r.stepName),
            department: (r.department as string | null) ?? null,
            assigneeName: (r.assigneeName as string | null) ?? null,
            daysLate: num(r.daysLate),
          }),
        ),
      },
      teams: teamRows.map((r) => ({ department: String(r.department), lateSteps: num(r.lateSteps) })),
      trend: trendRows.map((r) => ({
        month: String(r.month),
        onboarded: num(r.onboarded),
        onboardedKw: num(r.onboardedKw),
        meterInstalled: num(r.meterInstalled),
        meterKw: num(r.meterKw),
      })),
      comingUp: {
        count: num(s.comingUp),
        kw: num(s.comingUpKw),
        thisWeek: num(s.comingThisWeek),
        nextWeek: num(s.comingNextWeek),
        ...coming,
      },
    };
  }

  async getStageProjects(input: {
    stage: StageGroupKey | 'none';
    phase: string | null;
    financing: 'cash' | 'loan' | null;
    memberId: string | null;
  }): Promise<StageProjects> {
    const rows = await this.rows(STAGE_PROJECTS_SQL, [
      input.memberId,
      input.financing,
      input.stage,
      input.phase,
    ]);
    return {
      total: rows.length > 0 ? num(rows[0]?.total) : 0,
      rows: rows.map((r) => ({
        projectId: String(r.projectId),
        projectNumber: String(r.projectNumber),
        customerName: (r.customerName as string | null) ?? null,
        kw: r.kw == null ? null : num(r.kw),
        currentPhase: (r.currentPhase as string | null) ?? null,
        daysLate: r.daysLate == null ? null : num(r.daysLate),
      })),
    };
  }

  /**
   * The receivables page's own headline, so the card equals the page it opens.
   * `limit: 1` — only the buckets are read.
   */
  private async getMoney(
    financing: 'cash' | 'loan' | null,
  ): Promise<{ toCollectPaise: number; meterInStillOwedPaise: number }> {
    const [all, recovery] = await Promise.all([
      this.finance.getReceivables({ page: 1, limit: 1, funding: financing }),
      this.finance.getReceivables({ page: 1, limit: 1, scope: 'recovery', funding: financing }),
    ]);
    return {
      toCollectPaise: num(all.buckets.totalOutstandingPaise),
      meterInStillOwedPaise: num(recovery.buckets.totalOutstandingPaise),
    };
  }

  /** `DataSource.query` returns `any`; this pins the row type once. */
  private async rows(sql: string, params: unknown[]): Promise<Row[]> {
    const result: Row[] = await this.dataSource.query(sql, params);
    return result;
  }
}
