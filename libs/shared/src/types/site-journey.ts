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
import type { QuoteStatus } from './enums/quote.enum';

/**
 * Which of the six steps actually happened. The stage says how far a site got;
 * these say whether each step on the way is on record — a site can be won with
 * no survey recorded. "Lead captured" has no flag: it is always true.
 */
export interface JourneySteps {
  /** A survey or a site visit is marked done. */
  surveyed: boolean;
  /** The site has a live quote, or a quote of its went out. */
  quoted: boolean;
  /** Its deal quote went out (sent, viewed, expired, rejected or accepted). */
  quoteSent: boolean;
  /** Converted, a live accepted quote, or a project that counts. */
  won: boolean;
  /** Meter installed, or the project is completed. */
  commissioned: boolean;
}

/**
 * The quote a site's stage was read from: a live accepted quote, else the
 * newest live quote, else the newest voided one — the quote list's pick.
 */
export interface SiteDealQuote {
  id: string;
  number: string;
  status: QuoteStatus;
  /** Voided: it is history, not the roof's current quote. */
  voided: boolean;
  /** Final price of its latest version, in rupees; null when it has no version. */
  finalPrice: number | null;
  systemSizeKw: number | null;
}

/** One site, on `GET /customer-properties/customer/:id` and `GET /customer-properties/:id`. */
export interface SiteJourney {
  /** Index into `SITE_JOURNEY_STEPS`, 0–5: the highest step the site reached. */
  stageIndex: number;
  /**
   * The site is out of play: it was closed as lost, or its live quote was
   * rejected. `stageIndex` still says where it stopped. A cancelled project
   * does not make a site lost — the roof can be quoted and sold again.
   */
  lost: boolean;
  /**
   * Why, when `lost`, as one line; null when not lost or when nobody recorded a
   * reason. Not the site record's own `lostReason` — that is only the text a
   * person typed when closing the site. This also covers a rejected quote,
   * where the site itself was never closed, and reads "Project cancelled" for a
   * closed site whose project was cancelled and that has no reason of its own.
   */
  journeyLostReason: string | null;
  /** The site's project has its net meter installed. */
  meterInstalled: boolean;
  /** Which steps are on record for this site. */
  journeySteps: JourneySteps;
  /** The quote the stage was read from; null when the site has no quote. */
  dealQuote: SiteDealQuote | null;
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
  /**
   * Each step fact OR-ed over the sites the stage was read from: the sites in
   * play, or every site when `lost`.
   */
  steps: JourneySteps;
  /** The reason on the most recently lost site; null when none or none recorded. */
  lostReason: string | null;
}

/** The pending follow-up with the earliest scheduled time. */
export interface NextFollowup {
  id: string;
  type: FollowupType;
  subject: string;
  /**
   * ISO timestamp. Overdue when its DAY is before today in India — a follow-up
   * due earlier today is "today", not overdue (the follow-ups summary's rule).
   */
  scheduledAt: string;
  /** Full name of the person it is assigned to; null when that user is gone. */
  assigneeName: string | null;
  /** The site it is on; null for a follow-up on the customer itself. */
  propertyId: string | null;
}
