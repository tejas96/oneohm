import type { CustomerJourney, NextFollowup } from '@tejas96/shared/types';
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
export function journeyAltText(stageIndex: number, lost: boolean, hasSite: boolean): string {
  if (!hasSite) return 'No site yet';
  const index = Math.min(Math.max(stageIndex, 0), LAST_STEP);
  const stage = `${index + 1} of ${SITE_JOURNEY_STEPS.length}: ${stepName(index)}`;
  return lost ? `Lost. Stopped at stage ${stage}` : `Stage ${stage}`;
}

export interface JourneySummary {
  kind: 'none' | 'lost' | 'live';
  stageIndex: number;
  /** The bold word: the step, "Lost" or "No site yet". */
  title: string;
  /** The small line beside it; null when there is no site. */
  detail: string | null;
}

/**
 * The words beside a customer's track. Reads the server's roll-up; it never
 * works a stage out for itself.
 */
export function journeySummary(customer: Customer): JourneySummary {
  const journey = customer.journey ?? EMPTY_JOURNEY;
  const { siteCount, stageIndex, lost, stageCounts, lostSites } = journey;

  if (siteCount === 0) return { kind: 'none', stageIndex: 0, title: 'No site yet', detail: null };

  const sites = siteCount === 1 ? '1 site' : `${siteCount} sites`;

  if (lost) {
    const stopped = `stopped at ${stepName(stageIndex).toLowerCase()}`;
    return {
      kind: 'lost',
      stageIndex,
      title: 'Lost',
      detail: siteCount > 1 ? `${stopped} · ${sites}` : stopped,
    };
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

/** One site's words: the step, or "Lost · stopped at …" with the reason when there is one. */
export function siteJourneyText(site: {
  stageIndex?: number;
  lost?: boolean;
  journeyLostReason?: string | null;
}): { title: string; detail: string | null } {
  const step = stepName(site.stageIndex ?? 0);
  if (!site.lost) return { title: step, detail: null };
  const stopped = `stopped at ${step.toLowerCase()}`;
  return {
    title: 'Lost',
    detail: site.journeyLostReason ? `${stopped} · ${site.journeyLostReason}` : stopped,
  };
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

/** Who looks after the customer, for the quiet line under "No follow-up planned". */
function handlerLine(customer: Pick<Customer, 'assigneeName' | 'creatorName'>): string {
  if (customer.assigneeName) return firstName(customer.assigneeName);
  if (!customer.creatorName) return 'not assigned';
  if (customer.creatorName === 'Self') return 'not assigned · self-registered';
  return `not assigned · by ${firstName(customer.creatorName)}`;
}

export function followupTypeLabel(next: Pick<NextFollowup, 'type'>): string {
  const label = toTitleLabel(next.type);
  return label.charAt(0) + label.slice(1).toLowerCase();
}

/** The two lines of a row's follow-up cell. */
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

  if (customer.journey?.lost) return { tone: 'none', title: 'Closed', sub: 'no action needed' };

  return {
    tone: 'none',
    title: customer.needsFollowup ? 'No follow-up planned' : 'Nothing due',
    sub: handlerLine(customer),
  };
}
