import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { DashboardProvider, OkSection } from './provider.types';
import { type ProviderRow, toSection } from './section-shaping';
import { MY_CUSTOMERS_CTE, MY_PROPERTIES_CTE, MY_QUOTES_CTE, withCtes } from '../services/scope.sql';

/** Rows shown per bucket. The badge still reports the true total. */
const CAP = 5;

/** Quotes carry no expiry job, so "expiring" is a window on valid_until. */
const QUOTE_EXPIRY_DAYS = 7;

const BUCKET_LABELS: Record<string, string> = {
  lapsed: 'Lapsed',
  blocked: 'Blocked',
  stalled: 'Stalled',
  due_soon: 'Expiring soon',
};

@Injectable()
export class WorkflowProvider implements DashboardProvider {
  readonly key = 'workflow' as const;

  constructor(private readonly dataSource: DataSource) {}

  async load(userId: string): Promise<OkSection> {
    const rows: ProviderRow[] = await this.dataSource.query(this.sql(), [userId]);
    return toSection(rows, CAP, BUCKET_LABELS);
  }

  private sql(): string {
    return `
${withCtes(MY_CUSTOMERS_CTE, MY_PROPERTIES_CTE, MY_QUOTES_CTE)},

/**
 * The furthest-along incomplete step per property, and only that one.
 * Showing a property under both "site visit pending" and "survey pending"
 * would double-count one problem and offer two buttons for one next action.
 */
property_stage AS (
  SELECT
    p.id                AS property_id,
    p.customer_id,
    p.property_name,
    p.site_visit_assignee,
    p.site_visit_done,
    p.survey_done,
    p.site_visit_completed_at,
    p.site_survey_completed_at,
    -- Read the GLOBAL quotes table, not my_quotes. "Does a quote exist?" is a
    -- fact about the property, not about who can see it. A property reaches
    -- my_properties through site_visit_assignee / site_survey_assignee even
    -- when its customer is not mine, but a quote on it only reaches my_quotes
    -- via created_by or the customer walk — so a colleague's quote goes unseen
    -- and this rule tells the surveyor to create a second one. Same shape as
    -- the property_missing rule below, which already queries global
    -- customer_properties for exactly this reason.
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.property_id = p.id AND q.deleted_at IS NULL
    ) AS has_quote
  FROM customer_properties p
  WHERE p.id IN (SELECT id FROM my_properties)
    AND p.deleted_at IS NULL
),

stalls AS (
  -- 1. Lead onboarded, no property yet.
  SELECT
    'property_missing'::text AS kind, 'warning'::text AS severity, 'stalled'::text AS bucket,
    c.id::text AS entity_id,
    COALESCE(NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), ''), 'Customer') AS title,
    'Lead'::text AS subtitle,
    'Onboarded ' || GREATEST((CURRENT_DATE - c.created_at::date), 0)::text || ' days ago, no property added' AS reason,
    NULL::text AS meta,
    NULL::text AS due_date,
    'add_property'::text AS action,
    c.id::text AS customer_id, NULL::text AS property_id,
    2 AS rank
  FROM customer_profiles c
  WHERE c.id IN (SELECT id FROM my_customers)
    AND c.status IN ('lead', 'prospect')
    AND NOT EXISTS (
      SELECT 1 FROM customer_properties cp WHERE cp.customer_id = c.id AND cp.deleted_at IS NULL
    )

  UNION ALL
  -- 2/3. Site visit: unassigned, or assigned and not done.
  SELECT
    CASE WHEN ps.site_visit_assignee IS NULL THEN 'site_visit_unassigned' ELSE 'site_visit_pending' END,
    CASE WHEN ps.site_visit_assignee IS NULL THEN 'warning' ELSE 'info' END,
    'stalled',
    ps.property_id::text,
    ps.property_name,
    'Property',
    CASE WHEN ps.site_visit_assignee IS NULL
         THEN 'Nobody is assigned to visit this property yet'
         ELSE 'Site visit assigned but not completed' END,
    NULL, NULL, 'open_property',
    ps.customer_id::text, ps.property_id::text,
    CASE WHEN ps.site_visit_assignee IS NULL THEN 2 ELSE 3 END
  FROM property_stage ps
  WHERE ps.site_visit_done = false

  UNION ALL
  -- 4. Site visit done, survey not started.
  SELECT
    'survey_pending', 'warning', 'stalled',
    ps.property_id::text, ps.property_name, 'Property',
    'Site visit completed '
      || GREATEST((CURRENT_DATE - ps.site_visit_completed_at::date), 0)::text
      || ' days ago, survey not started',
    NULL, NULL, 'complete_survey',
    ps.customer_id::text, ps.property_id::text, 2
  FROM property_stage ps
  WHERE ps.site_visit_done = true AND ps.survey_done = false

  UNION ALL
  -- 5. Survey done, no quote on the property.
  SELECT
    'quote_missing', 'warning', 'stalled',
    ps.property_id::text, ps.property_name, 'Property',
    'Survey done '
      || GREATEST((CURRENT_DATE - ps.site_survey_completed_at::date), 0)::text
      || ' days ago, no quote created',
    NULL, NULL, 'create_quote',
    ps.customer_id::text, ps.property_id::text, 2
  FROM property_stage ps
  WHERE ps.survey_done = true AND ps.has_quote = false

  UNION ALL
  -- 6. Draft quote. NOTE: draft already MEANS not sent; there is no separate
  -- "unsent" state, and emitting both would count one quote twice.
  SELECT
    'quote_draft', 'info', 'stalled',
    q.id::text, COALESCE(cp.property_name, 'Quote'), q.quote_number,
    'Drafted ' || GREATEST((CURRENT_DATE - qq.created_at::date), 0)::text || ' days ago, never sent',
    -- meta is NULL, not the quote number: it is already the subtitle two lines
    -- up, and the row would print it twice.
    NULL, NULL, 'open_quote',
    q.customer_id::text, q.property_id::text, 3
  FROM my_quotes q
  JOIN quotes qq ON qq.id = q.id
  LEFT JOIN customer_properties cp ON cp.id = q.property_id
  WHERE q.status = 'draft'

  UNION ALL
  -- 7/8. Expiry is computed from valid_until, NEVER read from status:
  -- markExpiredQuotes() exists and nothing schedules it, so a quote past its
  -- date still says 'sent'. See quote.service.ts:257.
  SELECT
    CASE WHEN q.valid_until < CURRENT_DATE THEN 'quote_lapsed' ELSE 'quote_expiring' END,
    CASE WHEN q.valid_until < CURRENT_DATE THEN 'critical' ELSE 'warning' END,
    CASE WHEN q.valid_until < CURRENT_DATE THEN 'lapsed' ELSE 'due_soon' END,
    q.id::text, COALESCE(cp.property_name, 'Quote'), q.quote_number,
    CASE WHEN q.valid_until < CURRENT_DATE
         THEN 'Quote lapsed ' || (CURRENT_DATE - q.valid_until)::text || ' days ago, still marked sent'
         ELSE 'Quote expires in ' || (q.valid_until - CURRENT_DATE)::text || ' days' END,
    -- Same here: the quote number is already the subtitle.
    NULL, to_char(q.valid_until, 'YYYY-MM-DD'), 'open_quote',
    q.customer_id::text, q.property_id::text,
    CASE WHEN q.valid_until < CURRENT_DATE THEN 1 ELSE 2 END
  FROM my_quotes q
  LEFT JOIN customer_properties cp ON cp.id = q.property_id
  WHERE q.status IN ('sent', 'viewed')
    AND q.valid_until <= CURRENT_DATE + ${QUOTE_EXPIRY_DAYS}

  UNION ALL
  -- 9. Accepted, but no project was ever created from it.
  SELECT
    'quote_accepted_no_project', 'critical', 'blocked',
    q.id::text, COALESCE(cp.property_name, 'Quote'), 'Accepted quote',
    'Accepted ' || GREATEST((CURRENT_DATE - qq.updated_at::date), 0)::text
      || ' days ago, project never created',
    -- Kept here, unlike the two arms above: this row's subtitle is the literal
    -- 'Accepted quote', so meta is the only place the number appears.
    q.quote_number, NULL, 'convert_to_project',
    q.customer_id::text, q.property_id::text, 1
  FROM my_quotes q
  JOIN quotes qq ON qq.id = q.id
  LEFT JOIN customer_properties cp ON cp.id = q.property_id
  WHERE q.status = 'accepted'
    AND NOT EXISTS (
      SELECT 1 FROM projects pr WHERE pr.quote_id = q.id AND pr.deleted_at IS NULL
    )
)

SELECT
  s.*,
  COUNT(*)     OVER (PARTITION BY s.bucket)                                       AS bucket_total,
  ROW_NUMBER() OVER (PARTITION BY s.bucket ORDER BY s.rank, s.due_date NULLS LAST) AS rn
FROM stalls s
ORDER BY s.rank, s.due_date NULLS LAST
`;
  }
}
