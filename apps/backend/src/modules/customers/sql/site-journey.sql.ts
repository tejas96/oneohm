import { LOSS_REASON_LABELS } from '@tejas96/shared/constants';
import {
  CustomerStatus,
  LossReason,
  ProjectStatus,
  PropertyStatus,
  QuoteStatus,
  type CustomerJourney,
  type JourneySteps,
  type SiteDealQuote,
} from '@tejas96/shared/types';
import { SITE_JOURNEY_STEPS } from '@tejas96/shared/utils';

import { systemSizeKwSqlRaw } from '../../../common/utils/transform.util';
import { dealQuoteOrderSql } from '../../quotes/sql/deal-facts.sql';

/**
 * The single definition of where a site stands on its journey.
 *
 * One row per site that is not deleted: `stage_index` (0–5, an index into
 * `SITE_JOURNEY_STEPS`), `lost`, `lost_reason`, `meter_installed`, the five
 * step facts and the deal quote. The site reads (`GET /customer-properties/
 * customer/:id` and `GET /customer-properties/:id`) publish the row as it is
 * and the customer list (`GET /customers`) rolls it up with
 * `rollUpCustomerJourney`, so a customer's stage can never disagree with the
 * sites behind it. The web reads the result and never re-derives it.
 *
 * Each step is one fact about the site; the stage is the highest fact that
 * holds:
 *  5 Commissioned  — the site's project has its meter installed (a row in
 *                    `v_project_commissioning`, the rule the projects dashboard
 *                    and finance use), or the project is `completed`
 *  4 Won           — the site is `converted`, or it has a live accepted quote,
 *                    or it has a project that counts (see below)
 *  3 Quote sent    — the deal quote is `sent`, `viewed`, `expired`, `rejected`
 *                    or `accepted` (live or voided: a quote that went out and
 *                    was voided when the site closed still went out; a live
 *                    accepted one is already step 4)
 *  2 Quote drafted — the site has a live (not deleted, not voided) quote, or
 *                    its deal quote went out (step 3)
 *  1 Survey done   — `survey_done` or `site_visit_done`
 *  0 Lead captured — otherwise
 *
 * The facts are published too (`surveyed`, `quoted`, `quote_sent`, `won`,
 * `commissioned`) because the stage only says how far a site got, not that
 * every earlier step happened: a site can be won with no survey on record.
 *
 * Lost: the site is `lost`, or its live deal quote is rejected. The stage is
 * still computed — it says where the site stopped. A voided quote never makes
 * a site lost, and neither does a cancelled project: cancelling releases the
 * roof, which can be re-quoted and sold again.
 *
 * A project counts when it is not cancelled, or when the site is lost. A
 * cancelled project on a lost site still says the deal was won before it was
 * lost ("stopped at won"); on an open site it says nothing, and the stage
 * comes from the site's quotes and survey like any other open site.
 *
 * `lost_reason` is the first of: why the site was closed, "Project cancelled"
 * (a lost site with a cancelled project and no reason of its own), the
 * quote's rejection reason. `lost_at` is when: the site's `lost_at`, else
 * when the rejected quote last changed.
 *
 * "The deal quote" is the quote the quote list shows for the site
 * (`dealQuoteOrderSql`): a live accepted quote, else the newest live quote,
 * else the newest voided one. So the deal quote is live exactly when the site
 * has any live quote, and is live + accepted exactly when the site has a live
 * accepted quote — which is how steps 4 and 2 are read below. Its id, number,
 * status, value and size are published so a screen can show the quote the
 * stage was read from, not a second pick.
 *
 * "The site's project" is its current project, the rule
 * `CustomerPropertyRepository.findProjectsByPropertyIds` applies: the live
 * project when the roof has one, otherwise the most recently cancelled one.
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
  // Only reached voided (a live accepted quote is step 4): accepted, then the
  // site closed or its project was cancelled. It went out before it was accepted.
  QuoteStatus.ACCEPTED,
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

/**
 * A project counts toward the journey when it is not cancelled, or when the
 * site is lost (the deal was won before it was lost). `pj` / `s` are the
 * aliases the fact CTE joins under.
 */
const PROJECT_COUNTS_SQL = `(pj.status <> ${lit(ProjectStatus.CANCELLED)} OR s.status = ${lit(PropertyStatus.LOST)})`;

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
      NULLIF(btrim(prop.lost_reason), '') AS lost_reason,
      prop.lost_at
    FROM customer_properties prop
    WHERE prop.deleted_at IS NULL
      ${opts.propertyIdsParam ? `AND prop.id = ANY(${opts.propertyIdsParam}::uuid[])` : ''}
      ${opts.customerIdsParam ? `AND prop.customer_id = ANY(${opts.customerIdsParam}::uuid[])` : ''}
  ),
  sj_quote AS (
    SELECT DISTINCT ON (q.property_id)
      q.property_id,
      q.id,
      q.quote_number,
      q.status,
      (q.voided_at IS NULL) AS live,
      q.updated_at,
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
  sj_fact AS (
    SELECT
      s.property_id,
      s.customer_id,
      s.surveyed,
      COALESCE(dq.live, false) AS has_live_quote,
      COALESCE(dq.status IN (${QUOTE_SENT_STATUSES}), false) AS quote_sent,
      (
        s.status = ${lit(PropertyStatus.CONVERTED)}
        OR (dq.live AND dq.status = ${lit(QuoteStatus.ACCEPTED)})
        OR (pj.property_id IS NOT NULL AND ${PROJECT_COUNTS_SQL})
      ) IS TRUE AS won,
      (
        (COALESCE(pj.meter_installed, false) OR pj.status = ${lit(ProjectStatus.COMPLETED)})
        AND ${PROJECT_COUNTS_SQL}
      ) IS TRUE AS commissioned,
      (s.status = ${lit(PropertyStatus.LOST)}) AS site_lost,
      (dq.live AND dq.status = ${lit(QuoteStatus.REJECTED)}) IS TRUE AS quote_rejected,
      CASE WHEN s.status = ${lit(PropertyStatus.LOST)} THEN ${SITE_LOST_REASON_SQL} END
        AS site_lost_reason,
      (pj.status = ${lit(ProjectStatus.CANCELLED)}) IS TRUE AS project_cancelled,
      s.lost_at AS site_lost_at,
      dq.rejection_reason,
      dq.updated_at AS quote_updated_at,
      COALESCE(pj.meter_installed, false) AS meter_installed,
      dq.id AS deal_quote_id,
      dq.quote_number AS deal_quote_number,
      dq.status AS deal_quote_status,
      (dq.id IS NOT NULL AND NOT dq.live) AS deal_quote_voided,
      qv.final_price::float AS deal_quote_final_price,
      (${systemSizeKwSqlRaw('qv')})::float AS deal_quote_system_size_kw
    FROM sj_site s
    LEFT JOIN sj_quote dq ON dq.property_id = s.property_id
    LEFT JOIN sj_project pj ON pj.property_id = s.property_id
    LEFT JOIN LATERAL (
      SELECT v.final_price, v.total_wattage_wp
      FROM quote_versions v
      WHERE v.quote_id = dq.id
      ORDER BY v.created_at DESC, v.version_number DESC, v.id DESC
      LIMIT 1
    ) qv ON true
  ),
  site_journey AS (
    SELECT
      f.property_id,
      f.customer_id,
      CASE
        WHEN f.commissioned THEN 5
        WHEN f.won THEN 4
        WHEN f.quote_sent THEN 3
        WHEN f.has_live_quote THEN 2
        WHEN f.surveyed THEN 1
        ELSE 0
      END AS stage_index,
      (f.site_lost OR f.quote_rejected) AS lost,
      COALESCE(
        f.site_lost_reason,
        CASE WHEN f.site_lost AND f.project_cancelled THEN 'Project cancelled' END,
        CASE WHEN f.quote_rejected THEN f.rejection_reason END
      ) AS lost_reason,
      CASE
        WHEN f.site_lost THEN f.site_lost_at
        WHEN f.quote_rejected THEN f.quote_updated_at
      END AS lost_at,
      f.meter_installed,
      f.surveyed,
      (f.has_live_quote OR f.quote_sent) AS quoted,
      f.quote_sent,
      f.won,
      f.commissioned,
      f.deal_quote_id,
      f.deal_quote_number,
      f.deal_quote_status,
      f.deal_quote_voided,
      f.deal_quote_final_price,
      f.deal_quote_system_size_kw
    FROM sj_fact f
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
  /** When it was lost; null when not lost or when nobody recorded the moment. */
  lostAt: Date | null;
  meterInstalled: boolean;
  surveyed: boolean;
  quoted: boolean;
  quoteSent: boolean;
  won: boolean;
  commissioned: boolean;
  dealQuoteId: string | null;
  dealQuoteNumber: string | null;
  dealQuoteStatus: QuoteStatus | null;
  dealQuoteVoided: boolean;
  dealQuoteFinalPrice: number | null;
  dealQuoteSystemSizeKw: number | null;
}

/** `SELECT` list turning a `site_journey sj` row into a `SiteJourneyRow`. */
export const SITE_JOURNEY_COLUMNS = `
  sj.property_id     AS "propertyId",
  sj.customer_id     AS "customerId",
  sj.stage_index     AS "stageIndex",
  sj.lost            AS "lost",
  sj.lost_reason     AS "lostReason",
  sj.lost_at         AS "lostAt",
  sj.meter_installed AS "meterInstalled",
  sj.surveyed        AS "surveyed",
  sj.quoted          AS "quoted",
  sj.quote_sent      AS "quoteSent",
  sj.won             AS "won",
  sj.commissioned    AS "commissioned",
  sj.deal_quote_id               AS "dealQuoteId",
  sj.deal_quote_number           AS "dealQuoteNumber",
  sj.deal_quote_status           AS "dealQuoteStatus",
  sj.deal_quote_voided           AS "dealQuoteVoided",
  sj.deal_quote_final_price      AS "dealQuoteFinalPrice",
  sj.deal_quote_system_size_kw   AS "dealQuoteSystemSizeKw"
`;

/** The five step facts of one site, in the shape both site reads publish. */
export function toJourneySteps(row: SiteJourneyRow | undefined): JourneySteps {
  return {
    surveyed: row?.surveyed ?? false,
    quoted: row?.quoted ?? false,
    quoteSent: row?.quoteSent ?? false,
    won: row?.won ?? false,
    commissioned: row?.commissioned ?? false,
  };
}

/** The deal quote of one site as published; null when the site has no quote. */
export function toDealQuote(row: SiteJourneyRow | undefined): SiteDealQuote | null {
  if (!row?.dealQuoteId || !row.dealQuoteNumber || !row.dealQuoteStatus) return null;
  return {
    id: row.dealQuoteId,
    number: row.dealQuoteNumber,
    status: row.dealQuoteStatus,
    voided: row.dealQuoteVoided,
    finalPrice: row.dealQuoteFinalPrice,
    systemSizeKw: row.dealQuoteSystemSizeKw,
  };
}

const emptyStageCounts = (): number[] => SITE_JOURNEY_STEPS.map(() => 0);

const NO_STEPS: JourneySteps = {
  surveyed: false,
  quoted: false,
  quoteSent: false,
  won: false,
  commissioned: false,
};

type RollUpSite = Pick<
  SiteJourneyRow,
  | 'propertyId'
  | 'stageIndex'
  | 'lost'
  | 'lostReason'
  | 'lostAt'
  | 'surveyed'
  | 'quoted'
  | 'quoteSent'
  | 'won'
  | 'commissioned'
>;

/**
 * Whether `a` was lost more recently than `b`: `lost_at` DESC, undated last,
 * then the site id — a fixed order, so two sites lost at the same moment (or
 * with no moment recorded) always yield the same reason, whatever order the
 * query returned them in.
 */
function lostMoreRecently(a: RollUpSite, b: RollUpSite): boolean {
  const at = a.lostAt ? new Date(a.lostAt).getTime() : null;
  const bt = b.lostAt ? new Date(b.lostAt).getTime() : null;
  if (at !== bt) {
    if (at === null) return false;
    if (bt === null) return true;
    return at > bt;
  }
  return a.propertyId < b.propertyId;
}

/**
 * One customer's sites as one journey.
 *
 * The stage is the furthest any site still in play has got. When nothing is in
 * play — every site is lost, or the customer itself is marked lost — the
 * journey is lost and the stage is the furthest any site reached. A customer
 * with no site has no journey to be lost on, whatever their status.
 *
 * `steps` is each step fact OR-ed over the same sites the stage was read from
 * (the sites in play; every site when the journey is lost), so the customer's
 * checklist ticks a step exactly when one of those sites did it.
 * `lostReason` is the reason on the site that was lost most recently
 * (`lostMoreRecently`: `lost_at` DESC, undated last, then the site id).
 */
export function rollUpCustomerJourney(
  sites: ReadonlyArray<RollUpSite>,
  customerStatus: CustomerStatus,
): CustomerJourney {
  if (sites.length === 0) {
    return {
      siteCount: 0,
      stageIndex: 0,
      lost: false,
      stageCounts: emptyStageCounts(),
      lostSites: 0,
      steps: { ...NO_STEPS },
      lostReason: null,
    };
  }

  const stageCounts = emptyStageCounts();
  let lostSites = 0;
  let furthestLive = -1;
  let furthestReached = 0;
  let lastLost: RollUpSite | null = null;
  for (const site of sites) {
    furthestReached = Math.max(furthestReached, site.stageIndex);
    if (site.lost) {
      lostSites += 1;
      if (lastLost === null || lostMoreRecently(site, lastLost)) lastLost = site;
      continue;
    }
    stageCounts[site.stageIndex] = (stageCounts[site.stageIndex] ?? 0) + 1;
    furthestLive = Math.max(furthestLive, site.stageIndex);
  }

  const lost = lostSites === sites.length || customerStatus === CustomerStatus.LOST;
  const counted = lost ? sites : sites.filter((site) => !site.lost);
  const any = (fact: keyof JourneySteps): boolean => counted.some((site) => site[fact]);
  return {
    siteCount: sites.length,
    // A customer marked lost whose sites are all still open has no lost site.
    stageIndex: lost ? furthestReached : furthestLive,
    lost,
    stageCounts,
    lostSites,
    steps: {
      surveyed: any('surveyed'),
      quoted: any('quoted'),
      quoteSent: any('quoteSent'),
      won: any('won'),
      commissioned: any('commissioned'),
    },
    lostReason: lastLost?.lostReason ?? null,
  };
}
