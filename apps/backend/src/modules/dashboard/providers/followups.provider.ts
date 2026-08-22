import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { DashboardProvider, OkSection } from './provider.types';
import { type ProviderRow, toSection } from './section-shaping';
import { MY_CUSTOMERS_CTE, MY_FOLLOWUPS_CTE, withCtes } from '../services/scope.sql';

const CAP = 5;
const UPCOMING_DAYS = 7;

const BUCKET_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Next 7 days',
};

@Injectable()
export class FollowupsProvider implements DashboardProvider {
  readonly key = 'followups' as const;

  constructor(private readonly dataSource: DataSource) {}

  async load(userId: string): Promise<OkSection> {
    const rows: ProviderRow[] = await this.dataSource.query(SQL, [userId]);
    return toSection(rows, CAP, BUCKET_LABELS);
  }
}

const SQL = `
${withCtes(MY_CUSTOMERS_CTE, MY_FOLLOWUPS_CTE)},
scoped AS (
  SELECT
    CASE
      WHEN f.scheduled_at <  date_trunc('day', now())                        THEN 'followup_overdue'
      WHEN f.scheduled_at <  date_trunc('day', now()) + interval '1 day'     THEN 'followup_today'
      ELSE 'followup_upcoming'
    END AS kind,
    CASE
      WHEN f.scheduled_at <  date_trunc('day', now())                    THEN 'critical'
      WHEN f.scheduled_at <  date_trunc('day', now()) + interval '1 day' THEN 'warning'
      ELSE 'info'
    END AS severity,
    CASE
      WHEN f.scheduled_at <  date_trunc('day', now())                    THEN 'overdue'
      WHEN f.scheduled_at <  date_trunc('day', now()) + interval '1 day' THEN 'today'
      ELSE 'upcoming'
    END AS bucket,
    f.id::text AS entity_id,
    COALESCE(NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), ''), 'Customer') AS title,
    f.subject AS subtitle,
    CASE
      WHEN f.scheduled_at < date_trunc('day', now())
        THEN 'Due ' || EXTRACT(DAY FROM (date_trunc('day', now()) - f.scheduled_at))::int::text
             || ' days ago'
      ELSE f.subject
    END AS reason,
    to_char(f.scheduled_at, 'FMHH12:MI AM') AS meta,
    NULL::text AS meta_secondary,
    to_char(f.scheduled_at, 'YYYY-MM-DD') AS due_date,
    'complete_followup'::text AS action,
    f.customer_id::text AS customer_id,
    f.property_id::text  AS property_id,
    NULL::text AS project_id,
    f.scheduled_at AS sort_at
  FROM followups f
  JOIN customer_profiles c ON c.id = f.customer_id
  WHERE f.deleted_at IS NULL
    AND f.status = 'pending'
    -- Ownership lives in scope.sql, like every other section's.
    AND f.id IN (SELECT id FROM my_followups)
    AND f.scheduled_at < date_trunc('day', now()) + interval '${UPCOMING_DAYS + 1} days'
)
SELECT
  s.*,
  COUNT(*)     OVER (PARTITION BY s.bucket)                        AS bucket_total,
  ROW_NUMBER() OVER (PARTITION BY s.bucket ORDER BY s.sort_at ASC) AS rn
FROM scoped s
ORDER BY s.sort_at ASC
`;
