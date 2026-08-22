import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { DashboardProvider, OkSection } from './provider.types';
import { type ProviderRow, toSection } from './section-shaping';
import { MY_PROJECTS_CTE, withCtes } from '../services/scope.sql';

const CAP = 4;

const BUCKET_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  at_risk: 'At risk',
  on_track: 'On track',
};

@Injectable()
export class ProjectsProvider implements DashboardProvider {
  readonly key = 'projects' as const;

  constructor(private readonly dataSource: DataSource) {}

  async load(userId: string): Promise<OkSection> {
    const rows: ProviderRow[] = await this.dataSource.query(this.sql(), [userId]);
    return toSection(rows, CAP, BUCKET_LABELS);
  }

  private sql(): string {
    return `
${withCtes(MY_PROJECTS_CTE)},

/**
 * Task counts per project. Live, not the stored progress_percentage column —
 * that one is written by hand via ProjectRepository.updateProgress and drifts.
 */
task_rollup AS (
  SELECT
    t.project_id,
    COUNT(*)                                              AS total_tasks,
    COUNT(*) FILTER (WHERE t.status = 'done')             AS done_tasks,
    COUNT(*) FILTER (WHERE t.status = 'blocked')          AS blocked_tasks,
    COUNT(*) FILTER (
      WHERE t.status <> 'done' AND t.end_date IS NOT NULL AND t.end_date < CURRENT_DATE
    )                                                     AS overdue_tasks
  FROM project_tasks t
  WHERE t.deleted_at IS NULL
    AND t.project_id IN (SELECT id FROM my_projects)
  GROUP BY t.project_id
),

/**
 * Milestone health, grouped by the NAME written on each task. There is no
 * milestone table — MilestoneDisplayStatus replaced the old entity — so a
 * milestone with no tasks simply does not exist here.
 */
milestone_rollup AS (
  SELECT
    m.project_id,
    json_agg(
      json_build_object(
        'name',    m.milestone_name,
        'done',    m.done_count,
        'total',   m.total_count,
        'overdue', m.overdue_count,
        'blocked', m.blocked_count,
        'state',   CASE
                     WHEN m.overdue_count > 0 OR m.blocked_count > 0 THEN 'risk'
                     WHEN m.done_count = m.total_count               THEN 'complete'
                     WHEN m.done_count > 0                           THEN 'progress'
                     ELSE 'none'
                   END
      )
      ORDER BY m.min_order NULLS LAST, m.milestone_name
    ) AS milestones
  FROM (
    SELECT
      t.project_id,
      t.milestone_name,
      MIN(t.milestone_order)                         AS min_order,
      COUNT(*)                                       AS total_count,
      COUNT(*) FILTER (WHERE t.status = 'done')      AS done_count,
      COUNT(*) FILTER (WHERE t.status = 'blocked')   AS blocked_count,
      COUNT(*) FILTER (
        WHERE t.status <> 'done' AND t.end_date IS NOT NULL AND t.end_date < CURRENT_DATE
      )                                              AS overdue_count
    FROM project_tasks t
    WHERE t.deleted_at IS NULL
      AND t.milestone_name IS NOT NULL
      AND t.project_id IN (SELECT id FROM my_projects)
    GROUP BY t.project_id, t.milestone_name
  ) m
  -- Group by the SUBQUERY's project_id. Re-joining project_tasks here would
  -- multiply each milestone by the project's task count, so json_agg would
  -- repeat every milestone dozens of times.
  GROUP BY m.project_id
),

scoped AS (
  SELECT
    CASE
      WHEN p.end_date IS NOT NULL AND p.end_date < CURRENT_DATE THEN 'project_overdue'
      WHEN COALESCE(tr.overdue_tasks, 0) > 0
        OR COALESCE(tr.blocked_tasks, 0) > 0                    THEN 'project_at_risk'
      ELSE 'project_on_track'
    END AS kind,
    CASE
      WHEN p.end_date IS NOT NULL AND p.end_date < CURRENT_DATE THEN 'critical'
      WHEN COALESCE(tr.overdue_tasks, 0) > 0
        OR COALESCE(tr.blocked_tasks, 0) > 0                    THEN 'warning'
      ELSE 'info'
    END AS severity,
    CASE
      WHEN p.end_date IS NOT NULL AND p.end_date < CURRENT_DATE THEN 'overdue'
      WHEN COALESCE(tr.overdue_tasks, 0) > 0
        OR COALESCE(tr.blocked_tasks, 0) > 0                    THEN 'at_risk'
      ELSE 'on_track'
    END AS bucket,
    p.id::text AS entity_id,
    p.name AS title,
    COALESCE(cp.property_name, 'Project') AS subtitle,
    CASE
      WHEN p.end_date IS NOT NULL AND p.end_date < CURRENT_DATE
        THEN 'Deadline was ' || to_char(p.end_date, 'DD Mon') || ', '
             || (COALESCE(tr.total_tasks, 0) - COALESCE(tr.done_tasks, 0))::text || ' tasks open'
      WHEN COALESCE(tr.overdue_tasks, 0) > 0
        THEN COALESCE(tr.overdue_tasks, 0)::text || ' tasks overdue'
      WHEN COALESCE(tr.blocked_tasks, 0) > 0
        THEN COALESCE(tr.blocked_tasks, 0)::text || ' tasks blocked'
      WHEN p.end_date IS NOT NULL THEN 'Due ' || to_char(p.end_date, 'DD Mon')
      ELSE 'No deadline set'
    END AS reason,
    COALESCE(tr.done_tasks, 0)::text || ' / ' || COALESCE(tr.total_tasks, 0)::text AS meta,
    COALESCE(mr.milestones, '[]'::json)::text AS meta_secondary,
    to_char(p.end_date, 'YYYY-MM-DD') AS due_date,
    'open_project'::text AS action,
    NULL::text AS customer_id,
    p.property_id::text AS property_id,
    p.id::text AS project_id,
    CASE
      WHEN p.end_date IS NOT NULL AND p.end_date < CURRENT_DATE THEN 1
      WHEN COALESCE(tr.overdue_tasks, 0) > 0 THEN 2
      ELSE 3
    END AS rank
  FROM my_projects p
  LEFT JOIN task_rollup      tr ON tr.project_id = p.id
  LEFT JOIN milestone_rollup mr ON mr.project_id = p.id
  LEFT JOIN customer_properties cp ON cp.id = p.property_id
  WHERE p.status IN ('planning', 'active')
)
SELECT
  s.*,
  COUNT(*)     OVER (PARTITION BY s.bucket)                                        AS bucket_total,
  ROW_NUMBER() OVER (PARTITION BY s.bucket ORDER BY s.rank, s.due_date NULLS LAST) AS rn
FROM scoped s
ORDER BY s.rank, s.due_date NULLS LAST
`;
  }
}
