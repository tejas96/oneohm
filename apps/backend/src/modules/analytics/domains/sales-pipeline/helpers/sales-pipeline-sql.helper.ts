import { QuoteStatus } from '@tejas96/shared/types';

import { NEGOTIATION_THRESHOLD_DAYS } from '../constants/sales-pipeline-stages';

export interface SalesPipelineFilterParams {
  fromDate: string;
  toDate: string;
  salesPersonId?: string;
}

export interface CohortQueryParts {
  cteSql: string;
  params: unknown[];
  /** 1-based index of sent-status array param for stage-filter builders */
  sentStatusParamIndex: number;
}

const SENT_QUOTE_STATUSES = [
  QuoteStatus.SENT,
  QuoteStatus.VIEWED,
  QuoteStatus.ACCEPTED,
  QuoteStatus.REJECTED,
  QuoteStatus.EXPIRED,
] as const;

/**
 * Shared cohort CTE ending in `property_enriched` with boolean stage flags
 * for SQL-side filtering and aggregation (no full-row hydration in Node).
 */
export function buildCohortCte(filters: SalesPipelineFilterParams): CohortQueryParts {
  const hasSalesPerson = Boolean(filters.salesPersonId);
  const salesPersonClause = hasSalesPerson
    ? `AND COALESCE(lq.sales_person_id, co.assignee_id) = $1`
    : '';
  const statusParamIndex = hasSalesPerson ? 5 : 4;

  const params: unknown[] = [filters.fromDate, filters.toDate];
  if (hasSalesPerson) {
    params.push(filters.salesPersonId);
  }
  params.push([...SENT_QUOTE_STATUSES]);

  const cteSql = `
    WITH cohort AS (
      SELECT
        p.id AS property_id,
        p.property_name,
        p.created_at AS property_created_at,
        c.id AS customer_id,
        c.first_name AS customer_first_name,
        c.last_name AS customer_last_name,
        c.assignee_id,
        au.first_name AS assignee_first_name,
        au.last_name AS assignee_last_name,
        p.site_visit_done AS is_site_visit_done,
        p.survey_done AS is_site_survey_done
      FROM customer_properties p
      INNER JOIN customer_profiles c
        ON c.id = p.customer_id AND c.deleted_at IS NULL
      LEFT JOIN users au ON au.id = c.assignee_id
      WHERE p.deleted_at IS NULL
        AND p.created_at >= $1::date
        AND p.created_at < ($2::date + INTERVAL '1 day')
    ),
    latest_quotes AS (
      SELECT DISTINCT ON (q.property_id)
        q.property_id,
        q.id AS quote_id,
        q.status,
        q.quote_date,
        q.sales_person_id,
        q.accepted_at
      FROM quotes q
      INNER JOIN cohort co ON co.property_id = q.property_id
      WHERE q.deleted_at IS NULL
      ORDER BY q.property_id, q.quote_date DESC NULLS LAST, q.created_at DESC
    ),
    latest_quote_prices AS (
      SELECT DISTINCT ON (qv.quote_id)
        qv.quote_id,
        qv.final_price
      FROM quote_versions qv
      INNER JOIN latest_quotes lq ON lq.quote_id = qv.quote_id
      ORDER BY qv.quote_id, qv.version_number DESC
    ),
    property_flags AS (
      SELECT
        co.property_id,
        co.property_name,
        co.property_created_at,
        co.customer_id,
        co.customer_first_name,
        co.customer_last_name,
        co.assignee_id,
        co.assignee_first_name,
        co.assignee_last_name,
        lq.sales_person_id,
        lq.status AS latest_quote_status,
        lq.quote_date AS latest_quote_date,
        lq.accepted_at AS latest_quote_accepted_at,
        COALESCE(lqp.final_price, 0)::numeric AS final_price_num,
        (co.is_site_visit_done = true OR co.is_site_survey_done = true) AS flag_site_qualified,
        EXISTS (
          SELECT 1 FROM quotes q2
          WHERE q2.property_id = co.property_id
            AND q2.deleted_at IS NULL
            AND q2.status = ANY($${statusParamIndex}::text[])
        ) AS flag_quoted,
        (lq.status = '${QuoteStatus.ACCEPTED}') AS flag_won,
        (lq.status IN ('${QuoteStatus.REJECTED}', '${QuoteStatus.EXPIRED}')) AS flag_lost,
        (
          lq.status IN ('${QuoteStatus.SENT}', '${QuoteStatus.VIEWED}')
          AND lq.quote_date IS NOT NULL
          AND lq.quote_date < (CURRENT_DATE - INTERVAL '${NEGOTIATION_THRESHOLD_DAYS} days')
        ) AS flag_negotiation,
        (lq.status IN ('${QuoteStatus.SENT}', '${QuoteStatus.VIEWED}')) AS flag_open_pipeline,
        COALESCE(lq.sales_person_id, co.assignee_id) AS effective_sales_person_id
      FROM cohort co
      LEFT JOIN latest_quotes lq ON lq.property_id = co.property_id
      LEFT JOIN latest_quote_prices lqp ON lqp.quote_id = lq.quote_id
      WHERE 1=1 ${salesPersonClause}
    ),
    -- Quoted/Won/Lost imply Qualified so funnel counts stay strictly cumulative
    -- (a sent quote proves the lead was qualified even if no site-activity row was logged).
    property_enriched AS (
      SELECT
        property_id,
        property_name,
        property_created_at,
        customer_id,
        customer_first_name,
        customer_last_name,
        assignee_id,
        assignee_first_name,
        assignee_last_name,
        sales_person_id,
        latest_quote_status,
        latest_quote_date,
        latest_quote_accepted_at,
        final_price_num,
        (flag_site_qualified OR flag_quoted OR flag_won OR flag_lost) AS flag_qualified,
        flag_quoted,
        flag_won,
        flag_lost,
        flag_negotiation,
        flag_open_pipeline,
        effective_sales_person_id
      FROM property_flags
    )
  `;

  return { cteSql, params, sentStatusParamIndex: statusParamIndex };
}

/** Funnel + stats aggregates in one pass over `property_enriched` (single cohort scan). */
export function buildFunnelAndStatsAggregationSql(parts: CohortQueryParts): string {
  return `
    ${parts.cteSql}
    SELECT
      COUNT(*)::int AS leads_count,
      COALESCE(SUM(final_price_num), 0)::float AS leads_value,
      COUNT(*) FILTER (WHERE flag_qualified)::int AS qualified_count,
      COALESCE(SUM(final_price_num) FILTER (WHERE flag_qualified), 0)::float AS qualified_value,
      COUNT(*) FILTER (WHERE flag_quoted)::int AS quoted_count,
      COALESCE(SUM(final_price_num) FILTER (WHERE flag_quoted), 0)::float AS quoted_value,
      COUNT(*) FILTER (WHERE flag_negotiation)::int AS negotiation_count,
      COALESCE(SUM(final_price_num) FILTER (WHERE flag_negotiation), 0)::float AS negotiation_value,
      COUNT(*) FILTER (WHERE flag_won)::int AS won_count,
      COALESCE(SUM(final_price_num) FILTER (WHERE flag_won), 0)::float AS won_value,
      COUNT(*) FILTER (WHERE flag_lost)::int AS lost_count,
      COALESCE(SUM(final_price_num) FILTER (WHERE flag_lost), 0)::float AS lost_value,
      COALESCE(SUM(final_price_num) FILTER (WHERE flag_open_pipeline), 0)::float AS total_pipeline_value,
      COALESCE(AVG(final_price_num) FILTER (WHERE flag_won), 0)::float AS avg_deal_size,
      COUNT(*) FILTER (WHERE flag_won)::int AS stats_won_count,
      COUNT(*) FILTER (WHERE flag_lost)::int AS stats_lost_count,
      COALESCE(
        AVG(
          EXTRACT(EPOCH FROM (latest_quote_accepted_at - property_created_at)) / 86400
        ) FILTER (WHERE flag_won AND latest_quote_accepted_at IS NOT NULL),
        0
      )::float AS avg_sales_cycle_days
    FROM property_enriched
  `;
}

export function buildFunnelAggregationSql(parts: CohortQueryParts): string {
  return buildFunnelAndStatsAggregationSql(parts);
}

export function buildStatsAggregationSql(parts: CohortQueryParts): string {
  return buildFunnelAndStatsAggregationSql(parts);
}

export function buildLeaderboardSql(parts: CohortQueryParts): string {
  return `
    ${parts.cteSql}
    SELECT
      effective_sales_person_id AS sales_person_id,
      COUNT(*)::int AS property_count,
      COALESCE(SUM(final_price_num) FILTER (WHERE flag_open_pipeline), 0)::float AS pipeline_value,
      COUNT(*) FILTER (WHERE flag_won)::int AS won_count,
      COUNT(*) FILTER (WHERE flag_lost)::int AS lost_count
    FROM property_enriched
    GROUP BY effective_sales_person_id
    ORDER BY pipeline_value DESC, won_count DESC
  `;
}

export function buildTrendSql(parts: CohortQueryParts, granularity: 'week' | 'month'): string {
  const trunc = granularity === 'month' ? 'month' : 'week';
  return `
    ${parts.cteSql},
    leads_by_period AS (
      SELECT
        to_char(date_trunc('${trunc}', property_created_at), 'YYYY-MM-DD') AS period,
        COUNT(*)::int AS leads_count
      FROM property_enriched
      GROUP BY 1
    ),
    won_by_period AS (
      SELECT
        to_char(date_trunc('${trunc}', latest_quote_accepted_at), 'YYYY-MM-DD') AS period,
        COUNT(*)::int AS won_count
      FROM property_enriched
      WHERE flag_won AND latest_quote_accepted_at IS NOT NULL
      GROUP BY 1
    )
    SELECT
      COALESCE(l.period, w.period) AS period,
      COALESCE(l.leads_count, 0)::int AS leads_count,
      COALESCE(w.won_count, 0)::int AS won_count
    FROM leads_by_period l
    FULL OUTER JOIN won_by_period w ON l.period = w.period
    ORDER BY period
  `;
}
