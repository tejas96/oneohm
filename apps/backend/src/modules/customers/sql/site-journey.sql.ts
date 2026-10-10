import { LOSS_REASON_LABELS } from '@tejas96/shared/constants';
import {
  CustomerStatus,
  LossReason,
  ProjectStatus,
  PropertyStatus,
  QuoteStatus,
  type CustomerJourney,
} from '@tejas96/shared/types';
import { SITE_JOURNEY_STEPS } from '@tejas96/shared/utils';

import { dealQuoteOrderSql } from '../../quotes/sql/deal-facts.sql';

/**
 * The single definition of where a site stands on its journey.
 *
 * One row per site that is not deleted: `stage_index` (0–5, an index into
 * `SITE_JOURNEY_STEPS`), `lost`, `lost_reason` and `meter_installed`. The site
 * list (`GET /customer-properties/customer/:id`) publishes the row as it is and
 * the customer list (`GET /customers`) rolls it up with `rollUpCustomerJourney`,
 * so a customer's stage can never disagree with the sites behind it. The web
 * reads the result and never re-derives it.
 *
 * Stage, checked highest first:
 *  5 Commissioned  — the site's project has its meter installed (a row in
 *                    `v_project_commissioning`, the rule the projects dashboard
 *                    and finance use), or the project is `completed`
 *  4 Won           — the site is `converted`, or it has a live accepted quote
 *  3 Quote sent    — the deal quote is `sent`, `viewed`, `expired` or `rejected`
 *                    (live or voided: a quote that went out and was voided when
 *                    the site closed still went out)
 *  2 Quote drafted — the site has a live (not deleted, not voided) quote
 *  1 Survey done   — `survey_done` or `site_visit_done`
 *  0 Lead captured — otherwise
 *
 * Lost: the site is `lost`, or its project is `cancelled`, or its deal quote is
 * rejected. The stage is still computed — it says where the site stopped. A
 * voided quote never makes a site lost. `lost_reason` is the first of: why the
 * site was closed, "Project cancelled", the quote's rejection reason.
 *
 * "The deal quote" is the quote the quote list shows for the site
 * (`dealQuoteOrderSql`): a live accepted quote, else the newest live quote,
 * else the newest voided one. So the deal quote is live exactly when the site
 * has any live quote, and is live + accepted exactly when the site has a live
 * accepted quote — which is how steps 4 and 2 are read below.
 *
 * "The site's project" is its current project, the rule
 * `CustomerPropertyRepository.findProjectsByPropertyIds` applies: the live
 * project when the roof has one, otherwise the most recently cancelled one. A
 * roof re-sold after a cancellation is therefore not lost.
 *
 * Text, not a view: callers write
 * `WITH ${siteJourneyCte({ … })} SELECT … FROM site_journey sj`.
 * Pass `propertyIdsParam` or `customerIdsParam` (e.g. `$1`, a uuid[]) so a page
 * never reads every site; omit both for the whole population.
 * Spec: docs/superpowers/specs/2026-10-10-customers-list-design.md
 */

const lit = (value: string): string => `'${value.replace(/'/g, "''")}'`;

const QUOTE_SENT_STATUSES = [
  QuoteStatus.SENT,
  QuoteStatus.VIEWED,
  QuoteStatus.EXPIRED,
  QuoteStatus.REJECTED,
]
  .map(lit)
  .join(', ');

/** The picklist reason as the words the app shows for it, from the shared labels. */
const LOSS_REASON_LABEL_SQL = `CASE s.loss_reason ${Object.entries(LOSS_REASON_LABELS)
  .map(([code, label]) => `WHEN ${lit(code)} THEN ${lit(label)}`)
  .join(' ')} END`;

/**
 * Why a closed site was lost, as one line: the picklist reason, except that
 * "Other" says nothing and so yields to what the person typed.
 */
const SITE_LOST_REASON_SQL = `COALESCE(
          CASE WHEN s.loss_reason <> ${lit(LossReason.OTHER)} THEN ${LOSS_REASON_LABEL_SQL} END,
          s.lost_reason,
          ${LOSS_REASON_LABEL_SQL}
        )`;

export function siteJourneyCte(
  opts: { propertyIdsParam?: string; customerIdsParam?: string } = {},
): string {
  return `
  sj_site AS (
    SELECT
      prop.id AS property_id,
      prop.customer_id,
      prop.status,
      (COALESCE(prop.survey_done, false) OR COALESCE(prop.site_visit_done, false)) AS surveyed,
      prop.loss_reason,
      NULLIF(btrim(prop.lost_reason), '') AS lost_reason
    FROM customer_properties prop
    WHERE prop.deleted_at IS NULL
      ${opts.propertyIdsParam ? `AND prop.id = ANY(${opts.propertyIdsParam}::uuid[])` : ''}
      ${opts.customerIdsParam ? `AND prop.customer_id = ANY(${opts.customerIdsParam}::uuid[])` : ''}
  ),
  sj_quote AS (
    SELECT DISTINCT ON (q.property_id)
      q.property_id,
      q.status,
      (q.voided_at IS NULL) AS live,
      NULLIF(btrim(q.rejection_reason), '') AS rejection_reason
    FROM quotes q
    WHERE q.deleted_at IS NULL
      AND q.property_id IN (SELECT s.property_id FROM sj_site s)
    ORDER BY
      q.property_id,
      ${dealQuoteOrderSql('q')}
  ),
  sj_project AS (
    SELECT DISTINCT ON (pj.property_id)
      pj.property_id,
      pj.status,
      EXISTS (
        SELECT 1 FROM v_project_commissioning com WHERE com.project_id = pj.id
      ) AS meter_installed
    FROM projects pj
    WHERE pj.deleted_at IS NULL
      AND pj.property_id IN (SELECT s.property_id FROM sj_site s)
    ORDER BY
      pj.property_id,
      (pj.status <> ${lit(ProjectStatus.CANCELLED)}) DESC,
      pj.created_at DESC,
      pj.id DESC
  ),
  site_journey AS (
    SELECT
      s.property_id,
      s.customer_id,
      CASE
        WHEN COALESCE(pj.meter_installed, false)
          OR pj.status = ${lit(ProjectStatus.COMPLETED)} THEN 5
        WHEN s.status = ${lit(PropertyStatus.CONVERTED)}
          OR (dq.live AND dq.status = ${lit(QuoteStatus.ACCEPTED)}) THEN 4
        WHEN dq.status IN (${QUOTE_SENT_STATUSES}) THEN 3
        WHEN dq.live THEN 2
        WHEN s.surveyed THEN 1
        ELSE 0
      END AS stage_index,
      (
        s.status = ${lit(PropertyStatus.LOST)}
        OR pj.status = ${lit(ProjectStatus.CANCELLED)}
        OR (dq.live AND dq.status = ${lit(QuoteStatus.REJECTED)})
      ) IS TRUE AS lost,
      COALESCE(
        CASE WHEN s.status = ${lit(PropertyStatus.LOST)} THEN ${SITE_LOST_REASON_SQL} END,
        CASE WHEN pj.status = ${lit(ProjectStatus.CANCELLED)} THEN 'Project cancelled' END,
        CASE WHEN dq.live AND dq.status = ${lit(QuoteStatus.REJECTED)}
             THEN dq.rejection_reason END
      ) AS lost_reason,
      COALESCE(pj.meter_installed, false) AS meter_installed
    FROM sj_site s
    LEFT JOIN sj_quote dq ON dq.property_id = s.property_id
    LEFT JOIN sj_project pj ON pj.property_id = s.property_id
  )
`;
}

/** One `site_journey` row, as the repositories return it. */
export interface SiteJourneyRow {
  propertyId: string;
  customerId: string;
  stageIndex: number;
  lost: boolean;
  lostReason: string | null;
  meterInstalled: boolean;
}

/** `SELECT` list turning a `site_journey sj` row into a `SiteJourneyRow`. */
export const SITE_JOURNEY_COLUMNS = `
  sj.property_id     AS "propertyId",
  sj.customer_id     AS "customerId",
  sj.stage_index     AS "stageIndex",
  sj.lost            AS "lost",
  sj.lost_reason     AS "lostReason",
  sj.meter_installed AS "meterInstalled"
`;

const emptyStageCounts = (): number[] => SITE_JOURNEY_STEPS.map(() => 0);

/**
 * One customer's sites as one journey.
 *
 * The stage is the furthest any site still in play has got. When nothing is in
 * play — every site is lost, or the customer itself is marked lost — the
 * journey is lost and the stage is the furthest any site reached. A customer
 * with no site has no journey to be lost on, whatever their status.
 */
export function rollUpCustomerJourney(
  sites: ReadonlyArray<Pick<SiteJourneyRow, 'stageIndex' | 'lost'>>,
  customerStatus: CustomerStatus,
): CustomerJourney {
  if (sites.length === 0) {
    return {
      siteCount: 0,
      stageIndex: 0,
      lost: false,
      stageCounts: emptyStageCounts(),
      lostSites: 0,
    };
  }

  const stageCounts = emptyStageCounts();
  let lostSites = 0;
  let furthestLive = -1;
  let furthestReached = 0;
  for (const site of sites) {
    furthestReached = Math.max(furthestReached, site.stageIndex);
    if (site.lost) {
      lostSites += 1;
      continue;
    }
    stageCounts[site.stageIndex] = (stageCounts[site.stageIndex] ?? 0) + 1;
    furthestLive = Math.max(furthestLive, site.stageIndex);
  }

  const lost = lostSites === sites.length || customerStatus === CustomerStatus.LOST;
  return {
    siteCount: sites.length,
    stageIndex: lost ? furthestReached : furthestLive,
    lost,
    stageCounts,
    lostSites,
  };
}
