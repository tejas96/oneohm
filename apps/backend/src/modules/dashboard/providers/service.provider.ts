import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { DashboardProvider, OkSection } from './provider.types';
import { type ProviderRow, toSection } from './section-shaping';
import {
  MY_CUSTOMERS_CTE,
  MY_EMPLOYEE_CTE,
  MY_PROJECTS_CTE,
  MY_SERVICE_TICKETS_CTE,
  withCtes,
} from '../services/scope.sql';

const CAP = 5;
const DUE_SOON_DAYS = 7;

const BUCKET_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  due_today: 'Due today',
  unassigned: 'Nobody assigned',
  due_soon: 'Due in 7 days',
};

@Injectable()
export class ServiceProvider implements DashboardProvider {
  readonly key = 'service' as const;

  constructor(private readonly dataSource: DataSource) {}

  async load(userId: string): Promise<OkSection> {
    const rows: ProviderRow[] = await this.dataSource.query(this.sql(), [userId]);
    return toSection(rows, CAP, BUCKET_LABELS);
  }

  private sql(): string {
    return `
${withCtes(MY_CUSTOMERS_CTE, MY_PROJECTS_CTE, MY_EMPLOYEE_CTE, MY_SERVICE_TICKETS_CTE)},

scoped AS (
  SELECT
    CASE
      WHEN t.due_date IS NOT NULL AND t.due_date <  CURRENT_DATE THEN 'service_overdue'
      WHEN t.due_date =  CURRENT_DATE                            THEN 'service_due_today'
      WHEN t.assigned_to_employee_id IS NULL                     THEN 'service_unassigned'
      ELSE 'service_due_soon'
    END AS kind,
    CASE
      WHEN t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE THEN 'critical'
      WHEN t.due_date = CURRENT_DATE                            THEN 'warning'
      WHEN t.assigned_to_employee_id IS NULL                    THEN 'warning'
      ELSE 'info'
    END AS severity,
    CASE
      WHEN t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE THEN 'overdue'
      WHEN t.due_date = CURRENT_DATE                            THEN 'due_today'
      WHEN t.assigned_to_employee_id IS NULL                    THEN 'unassigned'
      ELSE 'due_soon'
    END AS bucket,
    t.id::text AS entity_id,
    t.title,
    t.ticket_number || ' · '
      || COALESCE(NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), ''), 'Customer') AS subtitle,
    CASE
      WHEN t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE
        THEN (CURRENT_DATE - t.due_date)::text || ' days overdue, still ' || REPLACE(t.status, '_', ' ')
      WHEN t.due_date = CURRENT_DATE THEN 'Due today'
      WHEN t.assigned_to_employee_id IS NULL THEN 'Nobody is assigned to this yet'
      -- An assigned ticket with no due date lands in due_soon, and concatenating
      -- a NULL date would make the whole string NULL — which breaks the
      -- non-optional 'reason: string' contract on DashboardItem.
      WHEN t.due_date IS NULL THEN 'No due date set'
      ELSE 'Due ' || to_char(t.due_date, 'DD Mon')
    END AS reason,
    CASE WHEN t.due_date IS NULL THEN '—' ELSE to_char(t.due_date, 'DD Mon') END AS meta,
    INITCAP(t.priority) AS meta_secondary,
    to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
    'open_service'::text AS action,
    t.customer_id::text AS customer_id,
    NULL::text AS property_id,
    t.project_id::text AS project_id,
    CASE
      WHEN t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE THEN 1
      WHEN t.due_date = CURRENT_DATE THEN 2
      WHEN t.assigned_to_employee_id IS NULL THEN 3
      ELSE 4
    END AS rank
  FROM service_tickets t
  JOIN customer_profiles c ON c.id = t.customer_id
  WHERE t.deleted_at IS NULL
    -- The single definition of an active ticket, mirrored from
    -- ACTIVE_TICKET_STATUSES in libs/shared. Do not inline a different list.
    AND t.status IN ('open', 'in_progress')
    -- Ownership lives in scope.sql.ts, like every other provider's. This one
    -- used to inline its own four-way predicate.
    AND t.id IN (SELECT id FROM my_service_tickets)
    AND (
      t.due_date IS NULL
      OR t.due_date <= CURRENT_DATE + ${DUE_SOON_DAYS}
    )
)
SELECT
  s.*,
  COUNT(*)     OVER (PARTITION BY s.bucket)                                     AS bucket_total,
  ROW_NUMBER() OVER (PARTITION BY s.bucket ORDER BY s.due_date NULLS LAST, s.entity_id) AS rn
FROM scoped s
ORDER BY s.rank, s.due_date NULLS LAST
`;
  }
}
