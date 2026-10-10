/**
 * The site journey — where a site (and so its customer) stands on the six
 * steps `SITE_JOURNEY_STEPS` names — and the next follow-up shown beside it.
 *
 * Every value here is computed by the backend from ONE SQL rule
 * (apps/backend/src/modules/customers/sql/site-journey.sql.ts). Clients read
 * these fields and never re-derive a stage from quote or project facts.
 * Spec: docs/superpowers/specs/2026-10-10-customers-list-design.md
 */
import type { FollowupType } from './enums/customer.enum';

/** One site, on `GET /customer-properties/customer/:id`. */
export interface SiteJourney {
  /** Index into `SITE_JOURNEY_STEPS`, 0–5: the highest step the site reached. */
  stageIndex: number;
  /**
   * The site is out of play: it was closed as lost, its project was cancelled,
   * or its quote was rejected. `stageIndex` still says where it stopped.
   */
  lost: boolean;
  /**
   * Why, when `lost`, as one line; null when not lost or when nobody recorded a
   * reason. Not the site record's own `lostReason` — that is only the text a
   * person typed when closing the site. This also covers a cancelled project
   * and a rejected quote, where the site itself was never closed.
   */
  journeyLostReason: string | null;
  /** The site's project has its net meter installed. */
  meterInstalled: boolean;
}

/** A customer's sites rolled up, on each `GET /customers` item. */
export interface CustomerJourney {
  /** Sites that are not deleted. 0 means the customer has no site yet. */
  siteCount: number;
  /**
   * The highest step among sites still in play. When `lost`, the highest step
   * any site reached. 0 when there is no site.
   */
  stageIndex: number;
  /** Every site is lost, or the customer itself is marked lost and has sites. */
  lost: boolean;
  /** Sites still in play at each step — one count per `SITE_JOURNEY_STEPS` entry. */
  stageCounts: number[];
  lostSites: number;
}

/** The pending follow-up with the earliest scheduled time. */
export interface NextFollowup {
  id: string;
  type: FollowupType;
  subject: string;
  /** ISO timestamp. In the past means overdue. */
  scheduledAt: string;
  /** Full name of the person it is assigned to; null when that user is gone. */
  assigneeName: string | null;
  /** The site it is on; null for a follow-up on the customer itself. */
  propertyId: string | null;
}
