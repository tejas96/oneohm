import type { CustomerJourney, JourneySteps, NextFollowup } from '@tejas96/shared/types';
import { formatSystemSize, indiaToday, SITE_JOURNEY_STEPS } from '@tejas96/shared/utils';

import { LEAD_SOURCE_LABELS } from '../../constants';
import type { Customer } from '../../hooks/use-customers';

import { toTitleLabel } from '@/lib/utils';

const IST = 'Asia/Kolkata';
const DAY_MS = 86_400_000;

/** Whole days from one `YYYY-MM-DD` to another. */
function daysBetween(fromYmd: string, toYmd: string): number {
  const utc = (ymd: string): number => {
    const [y = 0, m = 1, d = 1] = ymd.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(toYmd) - utc(fromYmd)) / DAY_MS);
}

/** "14 Oct", with the year only when it is not this year (India time). */
export function shortDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const sameYear = indiaToday(date).slice(0, 4) === indiaToday(now).slice(0, 4);
  return date.toLocaleDateString('en-IN', {
    timeZone: IST,
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

export function fullName(customer: Pick<Customer, 'firstName' | 'lastName'>): string {
  return `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.replace(/\s+/g, ' ').trim();
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

/** `groupName (groupCode)`, the same text the Group filter lists. */
export function groupLabel(customer: Pick<Customer, 'groupCode' | 'groupName'>): string | null {
  if (!customer.groupCode) return null;
  return customer.groupName ? `${customer.groupName} (${customer.groupCode})` : customer.groupCode;
}

/** "Sangli 416416" — whichever of the two exists. */
function locationLabel(customer: Pick<Customer, 'city' | 'pincode'>): string | null {
  const text = [customer.city, customer.pincode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  return text || null;
}

/**
 * Where the customer came from. A customer with a reseller reads
 * "Reseller · <name>"; the name is looked up by the caller because the list
 * payload only carries the reseller's id.
 */
function sourceLabel(
  customer: Pick<Customer, 'leadSource' | 'resellerId'>,
  resellerName?: string,
): string | null {
  if (customer.resellerId) return resellerName ? `Reseller · ${resellerName}` : 'Reseller';
  const source = customer.leadSource?.trim();
  if (!source) return null;
  return LEAD_SOURCE_LABELS[source] ?? toTitleLabel(source);
}

/** Line 2 of a row: "Sangli 416416 · Referral". */
export function metaLine(customer: Customer, resellerName?: string): string {
  const parts = [locationLabel(customer), sourceLabel(customer, resellerName)].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Location not set';
}

// ============================================================================
// Journey
// ============================================================================

const EMPTY_JOURNEY: CustomerJourney = {
  siteCount: 0,
  stageIndex: 0,
  lost: false,
  stageCounts: [0, 0, 0, 0, 0, 0],
  lostSites: 0,
  steps: { surveyed: false, quoted: false, quoteSent: false, won: false, commissioned: false },
  lostReason: null,
};

const LAST_STEP = SITE_JOURNEY_STEPS.length - 1;

function stepName(stageIndex: number): string {
  const index = Math.min(Math.max(Math.trunc(stageIndex) || 0, 0), LAST_STEP);
  return SITE_JOURNEY_STEPS[index] ?? SITE_JOURNEY_STEPS[0];
}

/** How far along the track the fill and the pin sit, 0–100. */
export function journeyPercent(stageIndex: number, hasSite: boolean): number {
  if (!hasSite) return 0;
  return (Math.min(Math.max(stageIndex, 0), LAST_STEP) / LAST_STEP) * 100;
}

/** "Stage 4 of 6: Quote sent" — what a screen reader gets instead of the track. */
export function journeyAltText(
  stageIndex: number,
  lost: boolean,
  hasSite: boolean,
  known = true,
): string {
  if (!known) return 'Stage not available';
  if (!hasSite) return 'No site yet';
  const index = Math.min(Math.max(stageIndex, 0), LAST_STEP);
  const stage = `${index + 1} of ${SITE_JOURNEY_STEPS.length}: ${stepName(index)}`;
  return lost ? `Lost. Stopped at stage ${stage}` : `Stage ${stage}`;
}

export interface JourneySummary {
  /**
   * `unknown`: the customer has sites but the response carried no journey (a
   * backend older than this page). Nothing is claimed: no stage, no "No site
   * yet", no "+ Add site" — an empty neutral track.
   */
  kind: 'none' | 'lost' | 'live' | 'unknown';
  stageIndex: number;
  /** The bold word: the step, "Lost" or "No site yet"; empty when unknown. */
  title: string;
  /** The small line beside it; null when there is no site. */
  detail: string | null;
}

/**
 * The words beside a customer's track. Reads the server's roll-up; it never
 * works a stage out for itself.
 */
export function journeySummary(customer: Customer): JourneySummary {
  // No journey on a customer that HAS sites is not "no site yet" — it is "not
  // told". (The backend must be deployed before this page; see the spec.)
  if (!customer.journey && (customer.propertyCount ?? 0) > 0) {
    return { kind: 'unknown', stageIndex: 0, title: '', detail: null };
  }
  const journey = customer.journey ?? EMPTY_JOURNEY;
  const { siteCount, stageIndex, lost, stageCounts, lostSites, lostReason } = journey;

  if (siteCount === 0) return { kind: 'none', stageIndex: 0, title: 'No site yet', detail: null };

  const sites = siteCount === 1 ? '1 site' : `${siteCount} sites`;

  if (lost) {
    // Where it stopped, why (the most recently lost site's reason), how many.
    const lostParts = [`stopped at ${stepName(stageIndex).toLowerCase()}`];
    if (lostReason) lostParts.push(lostReason);
    if (siteCount > 1) lostParts.push(sites);
    return { kind: 'lost', stageIndex, title: 'Lost', detail: lostParts.join(' · ') };
  }

  const parts = [sites];
  const kw = customer.sitePortfolio?.totalSystemSizeKw ?? 0;
  if (kw > 0) parts.push(`${formatSystemSize(kw)} kW`);

  // What the other sites are doing, furthest along first.
  if (siteCount > 1) {
    for (let step = LAST_STEP; step >= 0; step -= 1) {
      const atStep = stageCounts[step] ?? 0;
      const others = step === stageIndex ? atStep - 1 : atStep;
      if (others <= 0) continue;
      const name = stepName(step).toLowerCase();
      parts.push(step === stageIndex ? `${others} more at ${name}` : `${others} at ${name}`);
    }
    if (lostSites > 0) parts.push(`${lostSites} lost`);
  }

  return { kind: 'live', stageIndex, title: stepName(stageIndex), detail: parts.join(' · ') };
}

/**
 * One site's words: the step, or "Lost" with where it stopped and the reason
 * when there is one. Null when the record carries no journey (an endpoint that
 * does not compute it) — the caller then shows nothing rather than a guess.
 */
export function siteJourneyText(site: {
  stageIndex?: number;
  lost?: boolean;
  journeyLostReason?: string | null;
}): { title: string; detail: string | null } | null {
  if (site.stageIndex === undefined) return null;
  const step = stepName(site.stageIndex);
  if (!site.lost) return { title: step, detail: null };
  const stopped = `stopped at ${step.toLowerCase()}`;
  return {
    title: 'Lost',
    detail: site.journeyLostReason ? `${stopped} · ${site.journeyLostReason}` : stopped,
  };
}

export type StepState = 'done' | 'now' | 'missing' | 'todo';

export interface StepLine {
  name: string;
  /**
   * `done` it happened · `now` where it stands · `missing` it stands further on
   * but this step is not on record · `todo` not reached.
   */
  state: StepState;
}

/**
 * The six steps as a checklist. A step is ticked only when its own fact is on
 * record — the stage says how far it got, not that every earlier step happened
 * (a site can be won with no survey recorded). "Lead captured" has no fact of
 * its own: it is true of every lead. A lost journey has no current step; the
 * step it stopped at is ticked.
 */
export function journeyStepLines(
  stageIndex: number,
  lost: boolean,
  hasSite: boolean,
  steps: JourneySteps | undefined,
): StepLine[] {
  const facts = [
    true,
    steps?.surveyed ?? false,
    steps?.quoted ?? false,
    steps?.quoteSent ?? false,
    steps?.won ?? false,
    steps?.commissioned ?? false,
  ];
  const stage = hasSite ? Math.min(Math.max(stageIndex, 0), LAST_STEP) : 0;
  return SITE_JOURNEY_STEPS.map((name, step) => {
    let state: StepState;
    if (step > stage) state = 'todo';
    else if (step === stage && hasSite && !lost) state = 'now';
    else state = facts[step] ? 'done' : 'missing';
    return { name, state };
  });
}

// ============================================================================
// Follow-up
// ============================================================================

export interface FollowupDue {
  /** `overdue`: its day is before today in India. A follow-up due today is not overdue. */
  kind: 'overdue' | 'today' | 'upcoming';
  /** "overdue 8 days" · "today" · "tomorrow" · "in 4 days" */
  label: string;
}

/**
 * Same day boundary as the follow-ups summary: overdue means scheduled on a day
 * before today (India time), whatever the hour.
 */
export function followupDue(scheduledAt: string, now: Date = new Date()): FollowupDue {
  const days = daysBetween(indiaToday(now), indiaToday(new Date(scheduledAt)));
  if (days < 0) {
    const late = -days;
    return { kind: 'overdue', label: `overdue ${late} ${late === 1 ? 'day' : 'days'}` };
  }
  if (days === 0) return { kind: 'today', label: 'today' };
  if (days === 1) return { kind: 'upcoming', label: 'tomorrow' };
  return { kind: 'upcoming', label: `in ${days} days` };
}

export interface FollowupText {
  tone: 'due' | 'ok' | 'none';
  title: string;
  sub: string;
}

export interface HandledBy {
  /** The assignee's full name; null when nobody is assigned. */
  name: string | null;
  /** The name as text: "Vanita Patil", "Anurag Gaikwad (archived)"; null when unassigned. */
  label: string | null;
  /** The assignee's user account is archived — still assigned, not unassigned. */
  archived: boolean;
  /** "Handled by Vanita Patil" · "Not assigned · created by Deepali Shinde" */
  title: string;
}

/**
 * Who handles the customer. The creator is named, never shown as the owner. A
 * customer assigned to someone whose account is archived is still assigned: it
 * reads "<name> (archived)", never "Not assigned".
 */
export function handledBy(
  customer: Pick<Customer, 'assigneeId' | 'assigneeName' | 'assigneeArchived' | 'creatorName'>,
): HandledBy {
  if (customer.assigneeName) {
    const archived = Boolean(customer.assigneeArchived);
    const label = archived ? `${customer.assigneeName} (archived)` : customer.assigneeName;
    return { name: customer.assigneeName, label, archived, title: `Handled by ${label}` };
  }
  const none = { name: null, label: null, archived: false };
  // Assigned, but the server could not name the user: say so rather than "Not assigned".
  if (customer.assigneeId) return { ...none, title: 'Assigned · name not available' };
  if (!customer.creatorName) return { ...none, title: 'Not assigned' };
  if (customer.creatorName === 'Self') return { ...none, title: 'Not assigned · self-registered' };
  return { ...none, title: `Not assigned · created by ${customer.creatorName}` };
}

export function followupTypeLabel(next: Pick<NextFollowup, 'type'>): string {
  const label = toTitleLabel(next.type);
  return label.charAt(0) + label.slice(1).toLowerCase();
}

/**
 * The two lines of a row's follow-up cell. With nothing pending the second
 * line is empty: who handles the customer is the avatar at the end of the row.
 */
export function followupText(customer: Customer, now: Date = new Date()): FollowupText {
  const next = customer.nextFollowup;

  if (next) {
    const due = followupDue(next.scheduledAt, now);
    const more = (customer.pendingFollowupCount ?? 1) - 1;
    const sub = [
      next.assigneeName ? firstName(next.assigneeName) : null,
      due.label,
      more > 0 ? `+${more} more` : null,
    ].filter(Boolean);
    return {
      tone: due.kind === 'overdue' ? 'due' : 'ok',
      title: `${followupTypeLabel(next)} · ${shortDay(next.scheduledAt, now)}`,
      sub: sub.join(' · '),
    };
  }

  // Needs a follow-up FIRST: an open site with a rejected quote reads "lost" on
  // the journey but still owes someone an action — it is not closed.
  if (customer.needsFollowup) return { tone: 'none', title: 'No follow-up planned', sub: '' };
  if (customer.journey?.lost) return { tone: 'none', title: 'Closed', sub: 'no action needed' };
  return { tone: 'none', title: 'Nothing due', sub: '' };
}
