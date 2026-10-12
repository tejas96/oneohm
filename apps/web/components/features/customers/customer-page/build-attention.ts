import { bankLabel } from '@tejas96/shared/constants';
import {
  type AttentionItem,
  ChangeRequestStatus,
  CustomerStatus,
  followupIstDayDiff,
  FollowupStatus,
  LoanStatus,
  ProjectStatus,
  PropertyStatus,
  QuoteStatus,
  SiteStatus,
} from '@tejas96/shared/types';

import type { CustomerLoanApplication, CustomerPropertyResponse } from '../hooks';
import { QUOTE_EXPIRY_WARN_DAYS, quoteDaysLeft } from './quote-validity';

import { followupIsPastDue, type FollowupResponse } from '@/components/features/followups';
import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { formatCurrency, formatDate, formatFollowupWhen, toTitleLabel } from '@/lib/utils';

type AttentionTone = 'danger' | 'warning' | 'info';

/** What the page can do about a line; the page owns the handler for each. */
export type AttentionAction =
  | { kind: 'complete-followup'; followupId: string }
  | { kind: 'open-followups' }
  | { kind: 'plan-followup'; siteId?: string }
  | { kind: 'open-project'; projectId: string }
  | { kind: 'convert-to-project'; siteId: string }
  | { kind: 'assign-owner' }
  | { kind: 'mark-visit-complete'; siteId: string }
  | { kind: 'mark-survey-complete'; siteId: string }
  | { kind: 'open-quote'; quoteId: string }
  | { kind: 'open-site'; siteId: string }
  | { kind: 'edit-site'; siteId: string }
  | { kind: 'open-service' }
  | { kind: 'open-money'; siteId?: string }
  | { kind: 'open-approvals'; projectId: string };

export interface AttentionLine {
  id: string;
  tone: AttentionTone;
  title: string;
  detail?: string;
  actionLabel: string;
  action: AttentionAction;
}

/** A project of the customer, with the attention items its own page shows. */
export interface AttentionProject {
  id: string;
  propertyId: string;
  status: ProjectStatus;
  items: AttentionItem[];
  /** Receipts recorded for it that an approver has not confirmed yet. */
  pendingApprovals: { count: number; amountPaise: number };
}

/**
 * Everything the list is built from. Each field is a fact some screen of the
 * app already shows; this file adds no number of its own. A field left
 * `undefined` means "the user may not see it, or it has not loaded" and its
 * lines are simply absent — never a line built from a guess.
 */
export interface AttentionFacts {
  now?: Date;
  customer: { assigneeId?: string | null; status: CustomerStatus };
  sites: CustomerPropertyResponse[];
  /** The site list has loaded: only then does an empty list mean "no site". */
  sitesKnown: boolean;
  /** Every follow-up of the customer (`followups.view`). */
  followups?: FollowupResponse[];
  /** The customer's row of the receivables ageing report (`finance.view`). */
  aging?: {
    bucket0to30: number;
    bucket31to60: number;
    bucket61to90: number;
    bucket90plus: number;
  };
  /** Live quotes of the customer, for the validity date (`quotes.view`). */
  quotes?: Array<{
    id: string;
    quoteNumber: string;
    propertyId?: string;
    status: QuoteStatus;
    validUntil?: string | null;
    voidedAt?: string | null;
  }>;
  /** `projects.view`. */
  projects?: AttentionProject[];
  /** `finance.view`. */
  loans?: CustomerLoanApplication[];
  /** Tickets that are still open (`service.view`). */
  openTickets?: number;
}

const SENT: QuoteStatus[] = [QuoteStatus.SENT, QuoteStatus.VIEWED];
/** The customer statuses the server chases when there is no site (`CUSTOMER_LEAD_NEEDS_FOLLOWUP`). */
const CHASED: CustomerStatus[] = [CustomerStatus.LEAD, CustomerStatus.PROSPECT];

const SEVERITY_TONE = { critical: 'danger', warning: 'warning', info: 'info' } as const;
const TONE_RANK: Record<AttentionTone, number> = { danger: 0, warning: 1, info: 2 };

const plural = (count: number, one: string, many = `${one}s`): string => (count === 1 ? one : many);

/**
 * What needs attention on this customer, most urgent first.
 *
 * One list for the customer and all of their sites. A line that belongs to a
 * site names it when the customer has more than one.
 */
export function buildAttention(facts: AttentionFacts): AttentionLine[] {
  const now = facts.now ?? new Date();
  const many = facts.sites.length > 1;
  const siteName = (site: CustomerPropertyResponse): string => getPropertyDisplayName(site);
  const at = (site: CustomerPropertyResponse, text: string): string =>
    many ? `${siteName(site)} · ${text}` : text;
  const lines: AttentionLine[] = [];

  const liveSites = facts.sites.filter((site) => !siteClosed(site));

  // ── Follow-ups that are late ────────────────────────────────────────────
  const pending = (facts.followups ?? []).filter(
    (followup) => followup.status === FollowupStatus.PENDING,
  );
  const late = pending
    .filter((followup) => followupIsPastDue(followup.scheduledAt, now))
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const oldestLate = late[0];
  if (oldestLate) {
    const days = Math.max(1, followupIstDayDiff(now, new Date(oldestLate.scheduledAt)));
    const what = [
      oldestLate.subject.trim() || 'Untitled follow-up',
      toTitleLabel(oldestLate.type),
      formatFollowupWhen(oldestLate.scheduledAt, now),
    ].join(' · ');
    lines.push(
      late.length === 1
        ? {
            id: 'followup-late',
            tone: 'danger',
            title: `Follow-up is ${days} ${plural(days, 'day')} late`,
            detail: what,
            actionLabel: 'Complete',
            action: { kind: 'complete-followup', followupId: oldestLate.id },
          }
        : {
            id: 'followup-late',
            tone: 'danger',
            title: `${late.length} follow-ups are late`,
            detail: `Oldest: ${what}`,
            actionLabel: 'Open follow-ups',
            action: { kind: 'open-followups' },
          },
    );
  }

  // ── Money past its due date ─────────────────────────────────────────────
  if (facts.aging) {
    const { bucket0to30, bucket31to60, bucket61to90, bucket90plus } = facts.aging;
    const overdue = bucket0to30 + bucket31to60 + bucket61to90 + bucket90plus;
    if (overdue > 0) {
      const oldest =
        bucket90plus > 0
          ? 'over 90 days'
          : bucket61to90 > 0
            ? '61–90 days'
            : bucket31to60 > 0
              ? '31–60 days'
              : 'up to 30 days';
      lines.push({
        id: 'money-overdue',
        tone: 'danger',
        title: `${formatCurrency(overdue)} overdue`,
        detail: `Oldest part is ${oldest} late`,
        actionLabel: 'Open money',
        action: { kind: 'open-money', siteId: siteWithLateMoney(facts.projects) },
      });
    }
  }

  // ── What the project's own page flags (money is the line above) ─────────
  for (const project of facts.projects ?? []) {
    if (project.status === ProjectStatus.CANCELLED) continue;
    const items = project.items.filter((item) => item.kind !== 'payment_due');
    const first = items[0];
    if (!first) continue;
    const site = facts.sites.find((candidate) => candidate.id === project.propertyId);
    const worst = items.reduce<AttentionTone>((tone, item) => {
      const next = SEVERITY_TONE[item.severity];
      return TONE_RANK[next] < TONE_RANK[tone] ? next : tone;
    }, 'info');
    const more = items.length - 1;
    lines.push({
      id: `project-${project.id}`,
      tone: worst,
      title:
        items.length === 1
          ? 'One project item needs attention'
          : `${items.length} project items need attention`,
      detail: [
        many && site ? siteName(site) : null,
        first.title,
        more > 0 ? `and ${more} more` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      actionLabel: 'Open project',
      action: { kind: 'open-project', projectId: project.id },
    });
  }

  // ── A deal that was won and never started ───────────────────────────────
  for (const site of liveSites) {
    const quote = site.dealQuote;
    const won = quote?.status === QuoteStatus.ACCEPTED && !quote.voided;
    // `projectId` is on the record whatever the viewer may see, so this never
    // claims "no project" just because the projects list was withheld.
    if (!won || liveProjectIdOf(site)) continue;
    lines.push({
      id: `convert-${site.id}`,
      tone: 'danger',
      title: 'Quote accepted, no project yet',
      detail: at(site, `${quote.number} is accepted`),
      actionLabel: 'Convert to project',
      action: { kind: 'convert-to-project', siteId: site.id },
    });
  }

  // ── Nobody owns the customer ────────────────────────────────────────────
  if (!facts.customer.assigneeId) {
    lines.push({
      id: 'no-owner',
      tone: 'danger',
      title: 'Nobody handles this customer',
      detail: 'No owner is assigned',
      actionLabel: 'Assign',
      action: { kind: 'assign-owner' },
    });
  }

  // ── Nothing planned ─────────────────────────────────────────────────────
  if (facts.followups) {
    const unplanned = liveSites.filter((site) => site.needsFollowup);
    const firstUnplanned = unplanned[0];
    if (firstUnplanned && unplanned.length === 1) {
      lines.push({
        id: 'no-followup',
        tone: 'warning',
        // A follow-up on the customer, or on another site, does not cover this site.
        title:
          pending.length > 0 ? 'The site has no follow-up of its own' : 'No follow-up is planned',
        detail: at(
          firstUnplanned,
          pending.length > 0
            ? 'The open follow-up is not tied to this site'
            : 'Nobody is due to speak to this customer',
        ),
        actionLabel: 'Schedule',
        action: { kind: 'plan-followup', siteId: firstUnplanned.id },
      });
    } else if (unplanned.length > 1) {
      lines.push({
        id: 'no-followup',
        tone: 'warning',
        title: `${unplanned.length} sites have no follow-up planned`,
        detail: unplanned.map(siteName).join(', '),
        actionLabel: 'Schedule',
        // The drawer opens on the first of them, not on whichever site is chosen.
        action: { kind: 'plan-followup', siteId: firstUnplanned?.id },
      });
    } else if (
      // The server's rule for an enquiry with no site; never guessed while the sites load.
      facts.sitesKnown &&
      facts.sites.length === 0 &&
      pending.length === 0 &&
      CHASED.includes(facts.customer.status)
    ) {
      lines.push({
        id: 'no-followup',
        tone: 'warning',
        title: 'No follow-up is planned',
        detail: 'Nobody is due to speak to this customer',
        actionLabel: 'Schedule',
        action: { kind: 'plan-followup' },
      });
    }
  }

  // ── Site visit and survey ───────────────────────────────────────────────
  for (const site of liveSites) {
    if (site.siteStatus === SiteStatus.CANCELLED) continue;
    // Once the deal is won the visit is history: an old record without one must not nag.
    if (liveProjectIdOf(site) || (site.stageIndex ?? 0) >= 4) continue;
    if (!site.siteVisitDone && !site.surveyDone) {
      lines.push({
        id: `visit-${site.id}`,
        tone: 'warning',
        title: 'Site visit is not done',
        detail: at(
          site,
          site.siteVisitAssignee
            ? assignedTo(site.siteVisitAssigneeName)
            : 'Nobody is assigned to the visit',
        ),
        actionLabel: 'Mark complete',
        action: { kind: 'mark-visit-complete', siteId: site.id },
      });
    } else if (!site.surveyDone) {
      lines.push({
        id: `survey-${site.id}`,
        tone: 'warning',
        title: 'Technical survey is not done',
        detail: at(
          site,
          site.siteSurveyAssignee
            ? assignedTo(site.siteSurveyAssigneeName)
            : 'No surveyor is assigned',
        ),
        actionLabel: 'Mark complete',
        action: { kind: 'mark-survey-complete', siteId: site.id },
      });
    }
  }

  // ── A sent quote near or past its last valid day ────────────────────────
  for (const site of liveSites) {
    const dealQuote = site.dealQuote;
    if (!dealQuote || dealQuote.voided || !SENT.includes(dealQuote.status)) continue;
    const quote = facts.quotes?.find((candidate) => candidate.id === dealQuote.id);
    if (!quote?.validUntil) continue;
    const daysLeft = quoteDaysLeft(
      { validUntil: quote.validUntil, status: quote.status, voided: Boolean(quote.voidedAt) },
      now,
    );
    if (daysLeft === null || daysLeft > QUOTE_EXPIRY_WARN_DAYS) continue;
    lines.push({
      id: `quote-expiry-${site.id}`,
      tone: 'warning',
      title:
        daysLeft < 0
          ? 'Quote has expired'
          : daysLeft === 0
            ? 'Quote expires today'
            : `Quote expires in ${daysLeft} ${plural(daysLeft, 'day')}`,
      detail: at(site, `${quote.quoteNumber} · valid until ${formatDate(quote.validUntil)}`),
      actionLabel: 'Open quote',
      action: { kind: 'open-quote', quoteId: quote.id },
    });
  }

  // ── DISCOM requests nobody has turned into work ─────────────────────────
  for (const site of liveSites) {
    const requests = (site.changeRequests ?? []).filter(
      (request) => request.status === ChangeRequestStatus.PENDING,
    );
    if (requests.length === 0) continue;
    lines.push({
      id: `discom-${site.id}`,
      tone: 'warning',
      title:
        requests.length === 1
          ? 'DISCOM request is pending'
          : `${requests.length} DISCOM requests are pending`,
      detail: at(site, requests.map((request) => toTitleLabel(request.type)).join(', ')),
      actionLabel: 'Open site',
      action: { kind: 'open-site', siteId: site.id },
    });
  }

  // ── Open service tickets ────────────────────────────────────────────────
  const tickets = facts.openTickets ?? 0;
  if (tickets > 0) {
    lines.push({
      id: 'tickets',
      tone: 'warning',
      title: tickets === 1 ? 'One service ticket is open' : `${tickets} service tickets are open`,
      actionLabel: 'Open tickets',
      action: { kind: 'open-service' },
    });
  }

  // ── A loan that was named and never confirmed ───────────────────────────
  for (const loan of facts.loans ?? []) {
    if (loan.status !== LoanStatus.INITIATED) continue;
    const site = facts.sites.find((candidate) => candidate.id === loan.propertyId);
    if (site && siteClosed(site)) continue;
    const namedBank = loan.property?.financingBank ?? site?.financingBank;
    const lender = loan.lenderName || (namedBank ? bankLabel(namedBank) : null);
    lines.push({
      id: `loan-${loan.id}`,
      tone: 'warning',
      title: 'Loan is not confirmed',
      detail: [
        many && site ? siteName(site) : null,
        lender ? `${lender} was named` : 'No lender is named',
        loan.loanAmount ? null : 'no amount',
        loan.bankReferenceNumber ? null : 'no bank reference',
      ]
        .filter(Boolean)
        .join(' · '),
      actionLabel: 'Open money',
      action: { kind: 'open-money', siteId: site?.id },
    });
  }

  // ── Connection details a won site still lacks ───────────────────────────
  for (const site of liveSites) {
    if ((site.stageIndex ?? 0) < 4) continue;
    const missing = [
      site.consumerNumber ? null : 'consumer number',
      site.discomId ? null : 'DISCOM',
      site.meterNumber ? null : 'meter number',
    ].filter((name): name is string => name !== null);
    if (missing.length === 0) continue;
    lines.push({
      id: `connection-${site.id}`,
      tone: 'warning',
      title:
        missing.length === 1
          ? 'One connection detail is not recorded'
          : `${missing.length} connection details are not recorded`,
      detail: at(site, missing.join(', ')),
      actionLabel: 'Add',
      action: { kind: 'edit-site', siteId: site.id },
    });
  }

  // ── Receipts recorded, not yet approved ─────────────────────────────────
  for (const project of facts.projects ?? []) {
    if (project.pendingApprovals.count === 0) continue;
    const site = facts.sites.find((candidate) => candidate.id === project.propertyId);
    lines.push({
      id: `approval-${project.id}`,
      tone: 'info',
      title: `${formatCurrency(project.pendingApprovals.amountPaise / 100)} is waiting for approval`,
      detail: [
        many && site ? siteName(site) : null,
        `${project.pendingApprovals.count} ${plural(project.pendingApprovals.count, 'receipt')} recorded, not yet in the balance`,
      ]
        .filter(Boolean)
        .join(' · '),
      actionLabel: 'Open approvals',
      action: { kind: 'open-approvals', projectId: project.id },
    });
  }

  // Urgent first; inside a tone the order above stands (sort is stable).
  return lines.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
}

/** The assignee is known by id; the name is printed when the read carries it. */
const assignedTo = (name: string | undefined): string =>
  name ? `Assigned to ${name}` : 'Someone is assigned';

/**
 * The site whose project has a payment past its date: where "Open money"
 * lands. The overdue total itself is the customer's, from the ageing report.
 */
function siteWithLateMoney(projects: AttentionProject[] | undefined): string | undefined {
  const late = (projects ?? []).filter(
    (project) =>
      project.status !== ProjectStatus.CANCELLED &&
      project.items.some((item) => item.kind === 'payment_due'),
  );
  const worst = late.find((project) =>
    project.items.some((item) => item.kind === 'payment_due' && item.severity === 'critical'),
  );
  return (worst ?? late[0])?.propertyId;
}

/**
 * The site is closed: someone marked it lost. `site.lost` is wider — it is
 * also true while the site's quote is rejected, and that site is still open
 * and can be quoted again.
 */
export function siteClosed(site: Pick<CustomerPropertyResponse, 'status'>): boolean {
  return site.status === PropertyStatus.LOST;
}

/**
 * The project that owns this roof today, or null. A cancelled project owns
 * nothing: cancelling hands the roof back, so the site can be sold again.
 */
export function liveProjectIdOf(
  site: Pick<CustomerPropertyResponse, 'projectId' | 'project' | 'projectStatus'>,
): string | null {
  const id = site.projectId ?? site.project?.id ?? null;
  const status = site.projectStatus ?? site.project?.status;
  return id && status !== ProjectStatus.CANCELLED ? id : null;
}
