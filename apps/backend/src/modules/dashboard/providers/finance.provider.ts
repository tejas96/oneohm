// apps/backend/src/modules/dashboard/providers/finance.provider.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { DashboardProvider, OkSection } from './provider.types';
import { type ProviderRow, toSection } from './section-shaping';
import { MY_PROJECTS_CTE, withCtes } from '../services/scope.sql';

const CAP = 3;

/** The existing payment due-soon horizon. Deliberately 3, not 7 — see the spec. */
const MILESTONE_DUE_SOON_DAYS = 3;

/**
 * Below one rupee is rounding residue, not a debt.
 *
 * A schedule splits a contract by percentage, so the final milestone regularly
 * lands a few paise out. `project-attention.service.ts:50` sets the same floor
 * for the same reason: a warning reading "₹0 short" teaches people to stop
 * reading the section it sits in.
 */
const MIN_OUTSTANDING_PAISE = 100;

const BUCKET_LABELS: Record<string, string> = {
  payment_overdue: 'Overdue',
  payment_due_soon: 'Due soon',
};

/** Same formatter, same options as project-attention.service.ts:287. */
function formatInr(rupees: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

@Injectable()
export class FinanceProvider implements DashboardProvider {
  readonly key = 'finance' as const;

  constructor(private readonly dataSource: DataSource) {}

  async load(userId: string): Promise<OkSection> {
    const rows: (ProviderRow & { balance_paise: string })[] = await this.dataSource.query(
      this.sql(),
      [userId],
    );

    // Substitute the formatted amount before shaping. The SQL emits a literal
    // '{amount}' placeholder so the money string is built in exactly one place.
    const formatted = rows.map((row) => {
      const amount = formatInr(Number(row.balance_paise) / 100);
      return {
        ...row,
        meta: (row.meta ?? '').replace('{amount}', amount),
        reason: row.reason.replace('{amount}', amount),
      };
    });

    return toSection(formatted, CAP, BUCKET_LABELS);
  }

  private sql(): string {
    return `
${withCtes(MY_PROJECTS_CTE)},

scoped AS (
  SELECT
    CASE WHEN v.days_overdue > 0 THEN 'payment_overdue' ELSE 'payment_due_soon' END AS kind,
    CASE WHEN v.days_overdue > 0 THEN 'critical' ELSE 'warning' END                 AS severity,
    CASE WHEN v.days_overdue > 0 THEN 'payment_overdue' ELSE 'payment_due_soon' END AS bucket,
    v.milestone_id::text AS entity_id,
    p.name AS title,
    v.name || ' milestone' AS subtitle,
    -- Money is formatted in TypeScript, below. '₹' is not a to_char token, and
    -- Indian digit grouping is not one either — Intl.NumberFormat('en-IN') does
    -- both, and it is what project-attention.service.ts:287 already uses, so the
    -- dashboard and the project page render the same figure identically.
    CASE
      WHEN v.days_overdue > 0
        THEN '{amount} short, ' || v.days_overdue::text || ' days overdue'
      ELSE 'Due in ' || GREATEST((v.due_date - CURRENT_DATE), 0)::text || ' days'
    END AS reason,
    '{amount}' AS meta,
    v.balance_paise,
    NULL::text AS meta_secondary,
    to_char(v.due_date, 'YYYY-MM-DD') AS due_date,
    'open_payments'::text AS action,
    NULL::text AS customer_id,
    NULL::text AS property_id,
    v.project_id::text AS project_id,
    CASE WHEN v.days_overdue > 0 THEN 1 ELSE 2 END AS rank
  FROM v_milestone_balance v
  JOIN my_projects p ON p.id = v.project_id
  WHERE v.status = 'active'
    AND v.balance_paise >= ${MIN_OUTSTANDING_PAISE}
    AND (
      v.days_overdue > 0
      OR (v.due_date IS NOT NULL AND v.due_date <= CURRENT_DATE + ${MILESTONE_DUE_SOON_DAYS})
    )
)
SELECT
  s.*,
  COUNT(*)     OVER (PARTITION BY s.bucket)                                                   AS bucket_total,
  ROW_NUMBER() OVER (PARTITION BY s.bucket ORDER BY s.rank, s.due_date NULLS LAST)            AS rn
FROM scoped s
ORDER BY s.rank, s.due_date NULLS LAST
`;
  }
}
