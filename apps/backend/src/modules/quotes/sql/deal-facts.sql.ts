import type { DealAttention, DealStageFilter } from '@tejas96/shared/types';
import { LEAD_SOURCE_NOT_SET } from '@tejas96/shared/utils';

import { systemSizeKwSqlRaw } from '../../../common/utils/transform.util';

/**
 * One row per DEAL — a customer property with at least one non-deleted quote —
 * with every fact the quotes dashboard and the quote list filters need.
 *
 * The deal's quote is the one the quote list already shows for the property
 * (`rank` in QuoteRepository.findWithFilters): a live accepted quote, else the
 * newest live quote, else the newest voided one. Keep the two in step.
 *
 * Stage, in order: won (live + accepted) → lost (rejected, or property lost) →
 * none (voided, property not lost; in no stage count) → drafting → waiting
 * (sent/viewed/expired, valid_until ≥ today) → quiet (past valid_until).
 * `viewed` and `expired` are never set reliably, so the date decides.
 *
 * Text, not a view: callers write `WITH ${DEAL_FACTS_CTE} SELECT … FROM deal_facts df`.
 * Dates and CURRENT_DATE use the session time zone, which the app sets to IST.
 * Spec: docs/superpowers/specs/2026-10-09-quotes-dashboard-design.md
 */
export const DEAL_FACTS_CTE = `
  df_quote AS (
    SELECT
      q.*,
      ROW_NUMBER() OVER (
        PARTITION BY q.property_id
        ORDER BY
          CASE WHEN q.voided_at IS NULL AND q.status = 'accepted' THEN 2
               WHEN q.voided_at IS NULL THEN 1
               ELSE 0 END DESC,
          q.created_at DESC,
          q.id DESC
      ) AS rn,
      MIN(q.created_at) OVER (PARTITION BY q.property_id) AS first_quote_at
    FROM quotes q
    WHERE q.deleted_at IS NULL AND q.property_id IS NOT NULL
  ),
  df_base AS (
    SELECT
      dq.property_id,
      dq.customer_id,
      dq.id AS quote_id,
      dq.status AS quote_status,
      (dq.voided_at IS NOT NULL) AS voided,
      COALESCE(qv.final_price, 0)::float AS value_rupees,
      (${systemSizeKwSqlRaw('qv')})::float AS kw,
      dq.created_by AS person_id,
      COALESCE(prop.wants_loan, false) AS wants_loan,
      COALESCE(NULLIF(btrim(cp.lead_source), ''), '${LEAD_SOURCE_NOT_SET}') AS lead_source,
      CASE
        WHEN dq.voided_at IS NULL AND dq.status = 'accepted' THEN 'won'
        WHEN dq.status = 'rejected' OR prop.status = 'lost' THEN 'lost'
        WHEN dq.voided_at IS NOT NULL THEN 'none'
        WHEN dq.status = 'draft' THEN 'drafting'
        WHEN dq.valid_until >= CURRENT_DATE THEN 'waiting'
        ELSE 'quiet'
      END AS stage,
      dq.first_quote_at AS new_at,
      dq.accepted_at,
      dq.updated_at AS quote_updated_at,
      prop.status AS property_status,
      prop.lost_at AS property_lost_at,
      prop.loss_reason,
      dq.valid_until,
      dq.created_at AS quote_created_at,
      EXISTS (
        SELECT 1 FROM followups f
        WHERE f.property_id = dq.property_id AND f.status = 'pending' AND f.deleted_at IS NULL
      ) AS has_pending_followup,
      EXISTS (
        SELECT 1 FROM projects p
        WHERE p.property_id = dq.property_id AND p.deleted_at IS NULL
      ) AS has_project
    FROM df_quote dq
    JOIN customer_properties prop ON prop.id = dq.property_id AND prop.deleted_at IS NULL
    LEFT JOIN customer_profiles cp ON cp.id = dq.customer_id
    LEFT JOIN LATERAL (
      SELECT v.final_price, v.total_wattage_wp
      FROM quote_versions v
      WHERE v.quote_id = dq.id
      ORDER BY v.created_at DESC, v.version_number DESC, v.id DESC
      LIMIT 1
    ) qv ON true
    WHERE dq.rn = 1
  ),
  deal_facts AS (
    SELECT
      b.property_id, b.customer_id, b.quote_id, b.quote_status, b.voided,
      b.value_rupees, b.kw, b.person_id, b.wants_loan, b.lead_source, b.stage,
      b.new_at,
      CASE WHEN b.stage = 'won' THEN b.accepted_at END AS won_at,
      CASE WHEN b.stage = 'lost' THEN
        CASE WHEN b.property_status = 'lost' AND b.property_lost_at IS NOT NULL
             THEN b.property_lost_at ELSE b.quote_updated_at END
      END AS lost_at,
      b.loss_reason,
      b.valid_until,
      b.quote_created_at,
      (b.stage = 'quiet' AND NOT b.has_pending_followup) AS quiet_no_followup,
      (b.stage = 'waiting' AND b.valid_until <= CURRENT_DATE + 6) AS ends_this_week,
      (b.stage = 'drafting' AND b.quote_created_at < now() - interval '7 days') AS stale_draft,
      (b.stage = 'won' AND NOT b.has_project) AS won_no_project
    FROM df_base b
  )
`;

/**
 * Every "which deals" rule the dashboard counts with and the list filters by.
 * Both embed these exact strings, so a card can never disagree with the list
 * it opens (spec D9). Alias is always `df`.
 */
export const DEAL_FACTS = {
  drafting: "df.stage = 'drafting'",
  waiting: "df.stage = 'waiting'",
  quiet: "df.stage = 'quiet'",
  won: "df.stage = 'won'",
  lost: "df.stage = 'lost'",
  open: "df.stage IN ('drafting', 'waiting', 'quiet')",
  pipeline: "df.stage IN ('waiting', 'quiet')",
  loan: 'df.wants_loan',
  cash: 'NOT df.wants_loan',
  quiet_no_followup: 'df.quiet_no_followup',
  ends_this_week: 'df.ends_this_week',
  stale_draft: 'df.stale_draft',
  won_no_project: 'df.won_no_project',
} as const satisfies Record<DealStageFilter | DealAttention | 'loan' | 'cash', string>;

/** `CAST` rather than `::date` so the same text works with `$3` and with TypeORM `:name`. */
export const dealBetween = (
  column: 'new_at' | 'won_at' | 'lost_at',
  fromSql: string,
  toSql: string,
): string =>
  `CAST(df.${column} AS date) BETWEEN CAST(${fromSql} AS date) AND CAST(${toSql} AS date)`;

export interface DealFactsFilters {
  stage?: DealStageFilter;
  person?: string;
  financing?: 'cash' | 'loan';
  attention?: DealAttention;
  leadSource?: string;
  /** Comma list of lead-source values to exclude (the dashboard's "Other" row). */
  leadSourceNotIn?: string;
  newFrom?: string;
  newTo?: string;
  wonFrom?: string;
  wonTo?: string;
  lostFrom?: string;
  lostTo?: string;
}

/**
 * The quote-list facts filter as a standalone query: `SELECT df.quote_id …`
 * with TypeORM `:name` parameters, or null when no facts filter is set (the
 * common list query stays untouched). The caller runs it once and narrows the
 * list to those quote ids — the deal's own quote — so the list's
 * one-row-per-property collapse returns exactly the deals the dashboard counted.
 */
export function buildDealFactsFilter(
  f: DealFactsFilters | undefined,
): { sql: string; params: Record<string, unknown> } | null {
  if (!f) return null;
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (f.stage) where.push(DEAL_FACTS[f.stage]);
  if (f.attention) where.push(DEAL_FACTS[f.attention]);
  if (f.financing) where.push(f.financing === 'loan' ? DEAL_FACTS.loan : DEAL_FACTS.cash);
  if (f.person) {
    where.push('df.person_id = :dfPerson');
    params.dfPerson = f.person;
  }
  if (f.leadSource) {
    where.push('df.lead_source = :dfLeadSource');
    params.dfLeadSource = f.leadSource;
  }
  if (f.leadSourceNotIn) {
    const excluded = f.leadSourceNotIn
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (excluded.length > 0) {
      where.push('df.lead_source NOT IN (:...dfLeadSourceNotIn)');
      params.dfLeadSourceNotIn = excluded;
    }
  }

  const range = (
    column: 'new_at' | 'won_at' | 'lost_at',
    from: string | undefined,
    to: string | undefined,
    key: string,
  ): void => {
    if (from) {
      where.push(`CAST(df.${column} AS date) >= CAST(:${key}From AS date)`);
      params[`${key}From`] = from;
    }
    if (to) {
      where.push(`CAST(df.${column} AS date) <= CAST(:${key}To AS date)`);
      params[`${key}To`] = to;
    }
  };
  range('new_at', f.newFrom, f.newTo, 'dfNew');
  range('won_at', f.wonFrom, f.wonTo, 'dfWon');
  range('lost_at', f.lostFrom, f.lostTo, 'dfLost');

  if (where.length === 0) return null;
  return {
    sql: `WITH ${DEAL_FACTS_CTE} SELECT df.quote_id FROM deal_facts df WHERE ${where
      .map((w) => `(${w})`)
      .join(' AND ')}`,
    params,
  };
}
