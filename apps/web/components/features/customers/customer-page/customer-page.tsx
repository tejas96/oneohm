'use client';

import { CustomerStatus, FollowupStatus, QuoteStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useResellerNames } from '../components/list/use-reseller-names';
import { PropertySelectModal } from '../components/property-select-modal';
import {
  useCustomer,
  useCustomerFollowups,
  useCustomerLoans,
  useCustomerProjects,
  useCustomerProperties,
  useCustomerQuotes,
  useDeleteCustomer,
  type CustomerPropertyResponse,
} from '../hooks';
import {
  type AttentionAction,
  buildAttention,
  liveProjectIdOf,
  siteClosed,
} from './build-attention';
import { FollowupsCard } from './followups-card';
import { buildHistory, HistoryCard } from './history-card';
import { isValidUuid } from './is-valid-uuid';
import { legacyTabTarget } from './legacy-links';
import { MoneyCard } from './money-card';
import { AttentionBox, PageHeader, SiteSwitch, Stands } from './page-top';
import { CardError, LockedCard } from './parts';
import { ProjectCard } from './project-card';
import { QuoteCard } from './quote-card';
import { DocumentsCard, OwnerControl, ProfileCard, ServiceCard } from './side-cards';
import {
  BeforeQuoteCard,
  CancelSiteActivityDialog,
  SiteCard,
  useSiteReadiness,
} from './site-cards';
import { useProjectSignals } from './use-project-signals';

import {
  FollowupDetailHost,
  FollowupDrawer,
  useFollowupDetailQuery,
} from '@/components/features/followups';
import { MarkAsLostDialog } from '@/components/features/properties';
import { ReopenPropertyDialog } from '@/components/features/properties/components/reopen-property-dialog';
import { useDeleteProperty } from '@/components/features/properties/hooks/use-properties';
import { usePropertyQuotes } from '@/components/features/properties/hooks/use-property-quotes';
import { getPropertyDisplayName } from '@/components/features/properties/utils';
import {
  formatDeleteBlockTooltip,
  getCustomerDeleteBlockReasons,
  getPropertyDeleteBlockReasons,
  ORG_ADMIN_ROLES,
} from '@/components/features/properties/utils/delete-eligibility';
import { useQuoteDetail } from '@/components/features/quotes/hooks/use-quote-detail';
import { LIVE_TICKET_STATUSES } from '@/components/features/service-tickets/constants';
import { useServiceTickets } from '@/components/features/service-tickets/hooks/use-service-tickets';
import { EmptyState } from '@/components/shared';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { showToast } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import { useOrgCustomersAr } from '@/lib/hooks/resources';
import { useLedgerEntries } from '@/lib/hooks/resources/ledger';
import { type Gate, useAccessDialog, useCan } from '@/lib/rbac';
import { cn, formatDate, recordRecentView } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const fullName = (customer: {
  firstName: string;
  middleName?: string;
  lastName?: string;
}): string =>
  [customer.firstName, customer.middleName, customer.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');

/** Where a card's top rests after a scroll: the cards' own `scroll-mt-20`. */
const SCROLL_TOP_GAP = 80;

/** The most follow-ups one read returns. */
const FOLLOWUPS_PER_READ = 100;

/** The primary site, or the first: where a link with no `?site=` lands. */
const defaultSite = (sites: CustomerPropertyResponse[]): CustomerPropertyResponse | undefined =>
  sites.find((site) => site.isPrimary) ?? sites[0];

function PageBones(): JSX.Element {
  return (
    <div role="status" aria-label="Loading the customer" className="flex flex-col gap-3">
      <div className="h-16 rounded-rf-xl bg-background-tertiary motion-safe:animate-pulse" />
      <div className="h-40 rounded-rf-xl bg-background-tertiary motion-safe:animate-pulse" />
      <div className="h-64 rounded-rf-xl bg-background-tertiary motion-safe:animate-pulse" />
    </div>
  );
}

export interface CustomerPageProps {
  customerId: string;
}

/**
 * Everything about one customer and each of their sites, on one page: who they
 * are, where the chosen site stands, what needs attention, then the money, the
 * project, the quote, the follow-ups, the history, the site, the documents and
 * the service tickets.
 *
 * It replaces the customer page (9 tabs) and the site page (8 tabs). Each card
 * needs the permission its tab needed and makes no request without it.
 */
export function CustomerPage({ customerId }: CustomerPageProps): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasAnyRole } = useAuth();
  const { can } = useCan();
  const { requestAccess } = useAccessDialog();
  const isOrgAdmin = hasAnyRole([...ORG_ADMIN_ROLES]);
  const valid = isValidUuid(customerId);

  const canQuotes = can('quotes.view');
  const canProjects = can('projects.view');
  const canFollowups = can('followups.view');
  const canFinance = can('finance.view');
  const canService = can('service.view');

  // ── Data ────────────────────────────────────────────────────────────────
  const customerQuery = useCustomer(customerId, { enabled: valid });
  const customer = customerQuery.data;
  const ready = valid && Boolean(customer);

  // The sites are part of the customer, as on the old page: no permission of their own.
  const sitesQuery = useCustomerProperties(customerId, { enabled: ready });
  const sites = useMemo(() => sitesQuery.data ?? [], [sitesQuery.data]);
  const followupsQuery = useCustomerFollowups(customerId, {
    enabled: ready && canFollowups,
    limit: FOLLOWUPS_PER_READ,
  });
  /*
   * The list comes oldest first. A customer with more follow-ups than one read
   * holds would lose the newest: the open ones, and what was done last. Those
   * are then asked for by name (finished ones come newest first). Only then:
   * every other customer makes the one request.
   */
  const followupsCut =
    (followupsQuery.data?.meta?.total ?? 0) > (followupsQuery.data?.data.length ?? 0);
  const openFollowupsQuery = useCustomerFollowups(customerId, {
    enabled: ready && canFollowups && followupsCut,
    status: FollowupStatus.PENDING,
    limit: FOLLOWUPS_PER_READ,
  });
  const doneFollowupsQuery = useCustomerFollowups(customerId, {
    enabled: ready && canFollowups && followupsCut,
    status: FollowupStatus.COMPLETED,
    limit: FOLLOWUPS_PER_READ,
  });
  const followups = useMemo(() => {
    const first = followupsQuery.data?.data ?? [];
    const seen = new Set(first.map((followup) => followup.id));
    const extra = [
      ...(openFollowupsQuery.data?.data ?? []),
      ...(doneFollowupsQuery.data?.data ?? []),
    ].filter((followup) => !seen.has(followup.id));
    return extra.length > 0 ? [...first, ...extra] : first;
  }, [followupsQuery.data?.data, openFollowupsQuery.data?.data, doneFollowupsQuery.data?.data]);
  const projectsQuery = useCustomerProjects(customerId, { enabled: ready && canProjects });
  const quotesQuery = useCustomerQuotes(customerId, { enabled: ready && canQuotes, limit: 50 });
  const arQuery = useOrgCustomersAr({ enabled: ready && canFinance });
  const loansQuery = useCustomerLoans(customerId, { enabled: ready && canFinance });
  const receiptsQuery = useLedgerEntries(
    { customerId, direction: 'in', page: 1, limit: 100 },
    { enabled: ready && canFinance },
  );
  const ticketParams = useMemo(() => ({ customerId, limit: 50 }), [customerId]);
  const ticketsQuery = useServiceTickets(ticketParams, ready && canService);
  // The names come from the employee list: read only for a reseller's customer.
  const resellerNames = useResellerNames({ enabled: Boolean(customer?.resellerId) });
  const signals = useProjectSignals(canProjects ? projectsQuery.data : undefined, {
    finance: canFinance,
  });

  // ── The chosen site (`?site=`) ──────────────────────────────────────────
  const siteParam = searchParams.get('site') ?? searchParams.get('docProperty');
  const site = sites.find((candidate) => candidate.id === siteParam) ?? defaultSite(sites);
  const many = sites.length > 1;
  const chooseSite = useCallback((siteId: string): void => {
    const params = new URLSearchParams(window.location.search);
    params.set('site', siteId);
    params.delete('docProperty');
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);

  const projectId = site ? liveProjectIdOf(site) : null;
  const project = projectsQuery.data?.find((candidate) => candidate.id === projectId);
  /*
   * A cancelled project of the site. The site's own record names it, so this
   * does not wait for the projects list, and holds for a user who may not see
   * projects; the list only adds its number and name.
   */
  const pastProjectId = site && !projectId ? (site.projectId ?? site.project?.id ?? null) : null;
  const cancelledProject = pastProjectId
    ? projectsQuery.data?.find((candidate) => candidate.id === pastProjectId)
    : undefined;
  // Every quote of the chosen site, voided ones too; the Quote card reads the same list.
  const siteQuotesQuery = usePropertyQuotes(canQuotes && site ? site.id : '');
  const dealQuoteDetail = useQuoteDetail(site?.dealQuote?.id ?? '', {
    enabled: canQuotes && Boolean(site?.dealQuote),
  });
  const readiness = useSiteReadiness(site);

  // ── Page state ──────────────────────────────────────────────────────────
  // `siteId` is the site the new follow-up starts on; null is the customer as a whole.
  const [followupDrawer, setFollowupDrawer] = useState<{ siteId: string | null } | null>(null);
  const [siteSelectOpen, setSiteSelectOpen] = useState(false);
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [completeRequest, setCompleteRequest] = useState<string | null>(null);
  const [markingLost, setMarkingLost] = useState<{ id: string; name: string } | null>(null);
  const [reopening, setReopening] = useState<{ id: string; name: string } | null>(null);
  const { followupId, openFollowup, closeFollowup } = useFollowupDetailQuery();

  const deleteCustomer = useDeleteConfirmation({
    mutation: useDeleteCustomer(),
    getId: (item: { id: string }) => item.id,
    onSuccess: () => void router.push(ROUTES.CUSTOMERS.LIST),
  });
  const deleteSite = useDeleteConfirmation({
    mutation: useDeleteProperty(),
    getId: (item: { id: string }) => item.id,
    onSuccess: () => {
      // The customer's site count and delete rules change with it.
      void customerQuery.refetch();
      // The deleted site may be the one in the address: go back to the default.
      const params = new URLSearchParams(window.location.search);
      params.delete('site');
      const query = params.toString();
      window.history.replaceState(
        null,
        '',
        query ? `${window.location.pathname}?${query}` : window.location.pathname,
      );
    },
  });

  useEffect(() => {
    if (!customer || !user?.id) return;
    recordRecentView(user.id, {
      type: 'customer',
      id: customer.id,
      label: fullName(customer),
      href: buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: customer.id }),
    });
  }, [customer, user?.id]);

  // ── Old links: `?tab=finance` scrolls to the card that tab became ───────
  const scrollTo = useCallback(
    (cardId: string | string[], how: 'smooth' | 'jump' = 'smooth'): void => {
      const ids = Array.isArray(cardId) ? cardId : [cardId];
      let tries = 0;
      let lastY = Number.NaN;
      // The reader's own scrolling wins over ours.
      let stopped = false;
      const stop = (): void => {
        stopped = true;
      };
      for (const type of ['wheel', 'touchstart', 'keydown'] as const) {
        window.addEventListener(type, stop, { once: true, passive: true });
      }
      /*
       * The card may not be on the page yet (its site was just chosen), and the
       * cards above it get their height as their data arrives: one scroll lands
       * short. So look again for a few seconds, until the card sits at the top.
       */
      const look = (): void => {
        if (stopped) return;
        const target = ids.map((id) => document.getElementById(id)).find(Boolean);
        // A smooth scroll still on its way is left alone.
        const moving = window.scrollY !== lastY && tries > 0;
        lastY = window.scrollY;
        if (
          target &&
          !moving &&
          Math.abs(target.getBoundingClientRect().top - SCROLL_TOP_GAP) > 12
        ) {
          target.scrollIntoView({ behavior: how === 'jump' ? 'auto' : 'smooth', block: 'start' });
        }
        if (++tries < 12) window.setTimeout(look, 300);
      };
      window.setTimeout(look, 150);
    },
    [],
  );
  /*
   * An old link names a tab: go to the card that tab became, then drop the tab
   * from the address. Opening a follow-up also writes `tab=followups` next to
   * its id; that is the dialog's, not a link to follow, so it never scrolls.
   */
  const tabParam = searchParams.get('tab');
  const forFollowup = searchParams.has('followupId');
  const handledTab = useRef<string | null>(null);
  useEffect(() => {
    if (!tabParam) {
      handledTab.current = null;
      return;
    }
    if (forFollowup) {
      handledTab.current = `dialog:${tabParam}`;
      return;
    }
    // The cards above the target must have their height first, or the scroll lands short.
    if (!customer || sitesQuery.isLoading || projectsQuery.isLoading) return;
    if (handledTab.current === tabParam) return;
    const leftByDialog = handledTab.current === `dialog:${tabParam}`;
    handledTab.current = tabParam;
    const params = new URLSearchParams(window.location.search);
    params.delete('tab');
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
    );
    const target = leftByDialog ? null : legacyTabTarget(tabParam);
    // The page has just opened: go straight there, with no animation to wait for.
    if (target) scrollTo(target, 'jump');
  }, [customer, tabParam, forFollowup, sitesQuery.isLoading, projectsQuery.isLoading, scrollTo]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const inactive = customer?.status === CustomerStatus.INACTIVE;
  /** Run `action` when the user has `gate`; otherwise say which permission is missing. */
  const guard = (gate: Gate, subject: string, action: () => void): void => {
    if (can(gate)) action();
    else requestAccess(gate, subject);
  };

  const handleAddSite = (): void => {
    if (inactive) {
      showToast.error('Cannot perform this action: customer is inactive');
      return;
    }
    router.push(buildRoute(ROUTES.ONBOARDING.NEW, undefined, { customerId }));
  };
  const handleNewQuoteAnySite = (): void => {
    if (inactive) {
      showToast.error('Cannot perform this action: customer is inactive');
      return;
    }
    if (sites.length > 0) setSiteSelectOpen(true);
    else {
      showToast.info('Please add a property first before creating a quote');
      handleAddSite();
    }
  };
  // The Quote card offers this only when nothing blocks a new quote.
  const handleNewQuoteForSite = (siteId: string): void =>
    router.push(`${ROUTES.QUOTES.NEW}?propertyId=${siteId}&customerId=${customerId}`);
  const handleConvert = (siteId: string): void =>
    router.push(`${ROUTES.PROJECTS.NEW}?propertyId=${siteId}&customerId=${customerId}`);
  const handleEditSite = (siteId: string): void =>
    router.push(buildRoute(ROUTES.PROPERTIES.EDIT, { id: siteId }));
  /** A new follow-up starts on the named site, else on the chosen one while it is open. */
  const openFollowupDrawer = (siteId?: string): void =>
    setFollowupDrawer({ siteId: siteId ?? (site && !siteClosed(site) ? site.id : null) });
  /** Choose a site if it is not the chosen one, then go to one of its cards. */
  const goToSiteCard = (siteId: string | undefined, cardId: string | string[]): void => {
    if (siteId && siteId !== site?.id) chooseSite(siteId);
    scrollTo(cardId);
  };

  const act = (action: AttentionAction): void => {
    switch (action.kind) {
      case 'complete-followup':
        guard('followups.manage', 'Complete follow-up', () => {
          setCompleteRequest(action.followupId);
          scrollTo('followups');
        });
        break;
      case 'open-followups':
        scrollTo('followups');
        break;
      case 'plan-followup':
        guard('followups.manage', 'Schedule follow-up', () => openFollowupDrawer(action.siteId));
        break;
      case 'open-project':
        router.push(buildRoute(ROUTES.PROJECTS.DETAIL, { id: action.projectId }));
        break;
      case 'convert-to-project':
        if (inactive) showToast.error('Cannot perform this action: customer is inactive');
        else guard('projects.create', 'Convert to project', () => handleConvert(action.siteId));
        break;
      case 'assign-owner':
        guard('customers.assign', 'Assign customer', () => setOwnerOpen(true));
        break;
      case 'mark-visit-complete':
      case 'mark-survey-complete':
        // The button itself lives with the site: on another site, go there first.
        if (action.siteId !== site?.id) goToSiteCard(action.siteId, ['before-quote', 'site']);
        else if (action.kind === 'mark-visit-complete') readiness.markVisit.onGatedClick();
        else readiness.markSurvey.onGatedClick();
        break;
      case 'open-quote':
        router.push(buildRoute(ROUTES.QUOTES.DETAIL, { id: action.quoteId }));
        break;
      case 'open-site':
        goToSiteCard(action.siteId, 'site');
        break;
      case 'edit-site':
        guard('properties.edit', 'Edit site', () => handleEditSite(action.siteId));
        break;
      case 'open-service':
        scrollTo('service');
        break;
      case 'open-money':
        goToSiteCard(action.siteId, 'money');
        break;
      case 'open-approvals': {
        const target = projectsQuery.data?.find((candidate) => candidate.id === action.projectId);
        // The Approvals screen has a permission of its own.
        guard('finance.approvals.view', 'Open approvals', () =>
          router.push(
            target
              ? `${ROUTES.FINANCE.APPROVALS}?appr_search=${encodeURIComponent(target.projectNumber)}`
              : ROUTES.FINANCE.APPROVALS,
          ),
        );
        break;
      }
    }
  };

  // ── Not found / loading ─────────────────────────────────────────────────
  if (!valid || (!customerQuery.isLoading && !customer)) {
    return (
      <EmptyState
        iconColor="error"
        title="Customer not found"
        description="The customer you're looking for doesn't exist or has been deleted."
        action={{ label: 'Back to Customers', onClick: () => router.push(ROUTES.CUSTOMERS.LIST) }}
      />
    );
  }
  if (!customer) return <PageBones />;

  // ── Derived facts ───────────────────────────────────────────────────────
  const name = fullName(customer);
  const resellerName = customer.resellerId ? resellerNames.get(customer.resellerId) : undefined;
  const aging = canFinance ? arQuery.data?.find((row) => row.customerId === customerId) : undefined;
  const furthest = sites.reduce(
    (stage, candidate) => Math.max(stage, candidate.stageIndex ?? 0),
    0,
  );
  // "Lead" or "Prospect" on a customer whose site is already won.
  const statusBehind =
    furthest >= 4 &&
    (customer.status === CustomerStatus.LEAD || customer.status === CustomerStatus.PROSPECT);

  const openTickets = canService
    ? ticketsQuery.data?.items.filter((ticket) => LIVE_TICKET_STATUSES.includes(ticket.status))
        .length
    : undefined;
  const attention = buildAttention({
    customer,
    sites,
    sitesKnown: sitesQuery.isSuccess,
    followups: canFollowups && followupsQuery.data ? followups : undefined,
    aging,
    quotes: canQuotes
      ? quotesQuery.data?.data.map((quote) => ({
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          propertyId: quote.propertyId,
          status: quote.status,
          validUntil: quote.validUntil,
          voidedAt: quote.voidedAt,
        }))
      : undefined,
    projects: signals.projects,
    loans: canFinance ? loansQuery.data : undefined,
    openTickets,
  });
  // What the green "on time" line may claim: only what this user's list looked at.
  const attentionChecked = [
    canFollowups ? 'follow-ups' : null,
    canFinance ? 'money' : null,
    canProjects ? 'tasks' : null,
  ].filter((name): name is string => name !== null);
  const attentionLoading =
    sitesQuery.isLoading ||
    followupsQuery.isLoading ||
    projectsQuery.isLoading ||
    quotesQuery.isLoading ||
    arQuery.isLoading ||
    loansQuery.isLoading ||
    ticketsQuery.isLoading ||
    openFollowupsQuery.isLoading ||
    doneFollowupsQuery.isLoading ||
    signals.isLoading;
  // Every read the attention list is built from. One failure makes it incomplete.
  const attentionSources = [
    sitesQuery,
    followupsQuery,
    openFollowupsQuery,
    doneFollowupsQuery,
    projectsQuery,
    quotesQuery,
    arQuery,
    loansQuery,
    ticketsQuery,
  ];
  const attentionFailed = attentionSources.some((query) => query.isError) || signals.isError;
  const retryAttention = (): void => {
    for (const query of attentionSources) if (query.isError) void query.refetch();
    signals.refetch();
  };
  const historyIncomplete =
    attentionSources.some((query) => query.isError) ||
    receiptsQuery.isError ||
    siteQuotesQuery.isError;

  // One quote per site from the customer's list, plus every quote of the chosen site.
  const historyQuotes = (() => {
    const perSite = quotesQuery.data?.data ?? [];
    const seen = new Set(perSite.map((quote) => quote.id));
    return [
      ...perSite,
      ...(siteQuotesQuery.data?.data ?? []).filter((quote) => !seen.has(quote.id)),
    ];
  })();
  const history = buildHistory({
    customer,
    sites,
    followups: canFollowups ? followups : undefined,
    quotes: canQuotes ? historyQuotes : undefined,
    projects: canProjects ? projectsQuery.data : undefined,
    receipts: canFinance ? receiptsQuery.data?.data : undefined,
    loans: canFinance ? loansQuery.data : undefined,
    tickets: canService ? ticketsQuery.data?.items : undefined,
  });

  const stepDates: Array<string | null> = site
    ? [
        site.createdAt,
        site.siteSurveyCompletedAt ?? site.siteVisitCompletedAt ?? null,
        site.dealQuote?.quoteDate ?? null,
        // No record says when a quote was sent.
        null,
        dealQuoteDetail.data?.acceptedAt ?? null,
        project?.meterInstalledOn ?? null,
      ]
    : [];
  const summary = !site
    ? null
    : site.lost
      ? [site.journeyLostReason, site.lostAt ? `lost ${formatDate(site.lostAt)}` : null]
          .filter(Boolean)
          .join(' · ') || null
      : project?.meterInstalledOn
        ? `Meter in since ${formatDate(project.meterInstalledOn)}`
        : site.meterInstalled
          ? 'The meter is in'
          : null;

  const dealQuote = site?.dealQuote;
  const canConvert =
    Boolean(dealQuote) &&
    dealQuote?.status === QuoteStatus.ACCEPTED &&
    !dealQuote.voided &&
    Boolean(site) &&
    !siteClosed(site as CustomerPropertyResponse);
  // Before a deal exists the site has no money and no project: show the two steps to a quote.
  const early = Boolean(site) && !projectId && !canConvert && !pastProjectId;

  const customerDeleteReasons = getCustomerDeleteBlockReasons({
    propertyCount: customer.propertyCount ?? sites.length,
    deleteBlockReasons: customer.deleteBlockReasons,
  });
  const siteLoan = site ? loansQuery.data?.find((loan) => loan.propertyId === site.id) : undefined;
  const loanState = {
    isLoading: loansQuery.isLoading,
    isError: loansQuery.isError,
    retry: (): void => void loansQuery.refetch(),
  };
  // An early site has no money, but its loan may already be named or applied for.
  const earlyLoan = early && Boolean(siteLoan || site?.wantsLoan || site?.financingBank);
  // The newest payment of the customer, from the receipts the history already reads.
  // `undefined` while they load: "no payment yet" is said only once that is known.
  const lastReceiptDate = receiptsQuery.data
    ? receiptsQuery.data.data.reduce<string | null>(
        (last, entry) =>
          entry.entryType !== 'receipt' || entry.reversesId || (last && entry.valueDate <= last)
            ? last
            : entry.valueDate,
        null,
      )
    : undefined;
  const allSitesMoney =
    many && aging
      ? {
          totalOutstanding: aging.totalOutstanding,
          overdue: aging.bucket0to30 + aging.bucket31to60 + aging.bucket61to90 + aging.bucket90plus,
          openTermCount: aging.openTermCount,
          lastReceiptDate,
        }
      : undefined;
  const moneyCard = site ? (
    canFinance ? (
      <MoneyCard
        customerId={customerId}
        site={site}
        projectId={projectId}
        cancelledProject={
          pastProjectId
            ? { id: pastProjectId, projectNumber: cancelledProject?.projectNumber }
            : undefined
        }
        loan={siteLoan ?? null}
        loanState={loanState}
        allSites={allSitesMoney}
        delayMs={60}
      />
    ) : (
      <LockedCard id="money" title="Money" gate="finance.view" delayMs={60} />
    )
  ) : null;
  const siteDeleteReasons = site ? getPropertyDeleteBlockReasons(site, siteLoan) : [];

  return (
    <div className="@container pb-16">
      <nav aria-label="Breadcrumb" className="mb-3 text-[13px] text-foreground-tertiary">
        <NextLink href={ROUTES.CUSTOMERS.LIST} className="hover:underline">
          Customers
        </NextLink>
        {' / '}
        <span className="font-medium text-foreground-secondary">{name}</span>
      </nav>

      <PageHeader
        customer={customer}
        name={name}
        statusBehind={statusBehind}
        resellerName={resellerName}
        owner={<OwnerControl customer={customer} open={ownerOpen} onOpenChange={setOwnerOpen} />}
        onEdit={() => router.push(buildRoute(ROUTES.CUSTOMERS.EDIT, { id: customerId }))}
        onAddSite={handleAddSite}
        onNewQuote={handleNewQuoteAnySite}
        onLogFollowup={() => openFollowupDrawer()}
        onDelete={isOrgAdmin ? () => deleteCustomer.requestDelete(customer) : undefined}
        deleteBlockedBy={formatDeleteBlockTooltip(customerDeleteReasons)}
      />

      {many && site ? (
        <SiteSwitch
          sites={sites}
          chosenId={site.id}
          onChoose={chooseSite}
          onAddSite={handleAddSite}
        />
      ) : null}

      <section
        className={cn(
          'mb-3 grid overflow-hidden rounded-card-calm bg-surface shadow-calm @[980px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]',
        )}
      >
        {sitesQuery.isLoading ? (
          <div className="px-6 py-[22px]">
            <PageBones />
          </div>
        ) : sitesQuery.isError ? (
          <div className="px-6 py-[22px]">
            <CardError what="the sites" onRetry={() => void sitesQuery.refetch()} />
          </div>
        ) : (
          <Stands
            // A new site plays its own entrance.
            key={site?.id ?? 'none'}
            site={site}
            many={many}
            stepDates={stepDates}
            summary={summary}
            onAddSite={handleAddSite}
          />
        )}
        <AttentionBox
          lines={attention}
          isLoading={attentionLoading}
          failed={attentionFailed}
          onRetry={retryAttention}
          closedSite={Boolean(site && siteClosed(site))}
          checked={attentionChecked}
          onAct={act}
        />
      </section>

      {site ? (
        <div key={site.id} className="mb-3 grid items-start gap-3 @[980px]:grid-cols-3">
          {early ? (
            <BeforeQuoteCard site={site} readiness={readiness} delayMs={60} />
          ) : (
            <>
              {moneyCard}
              {canProjects ? (
                <ProjectCard
                  project={project}
                  cancelledProject={cancelledProject}
                  isLoading={projectsQuery.isLoading}
                  isError={projectsQuery.isError}
                  onRetry={() => void projectsQuery.refetch()}
                  canConvert={canConvert}
                  customerInactive={inactive}
                  onConvert={() => handleConvert(site.id)}
                  delayMs={120}
                />
              ) : (
                <LockedCard id="project" title="Project" gate="projects.view" delayMs={120} />
              )}
            </>
          )}
          {canQuotes ? (
            <QuoteCard
              site={site}
              customerInactive={inactive}
              onNewQuote={() => handleNewQuoteForSite(site.id)}
              delayMs={180}
            />
          ) : (
            <LockedCard id="quote" title="Quote" gate="quotes.view" delayMs={180} />
          )}
          {earlyLoan ? moneyCard : null}
        </div>
      ) : null}

      <div className="grid items-start gap-3 @[980px]:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          {canFollowups ? (
            <FollowupsCard
              followups={followups}
              isLoading={followupsQuery.isLoading}
              isError={
                followupsQuery.isError || openFollowupsQuery.isError || doneFollowupsQuery.isError
              }
              onRetry={() => {
                void followupsQuery.refetch();
                if (openFollowupsQuery.isError) void openFollowupsQuery.refetch();
                if (doneFollowupsQuery.isError) void doneFollowupsQuery.refetch();
              }}
              cut={followupsCut}
              onSchedule={() => openFollowupDrawer()}
              onView={openFollowup}
              completeRequest={completeRequest}
              onCompleteRequestHandled={() => setCompleteRequest(null)}
              delayMs={220}
            />
          ) : (
            <LockedCard id="followups" title="Follow-ups" gate="followups.view" delayMs={220} />
          )}
          <HistoryCard
            events={history}
            many={many}
            incomplete={historyIncomplete}
            onViewFollowup={openFollowup}
            delayMs={260}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          {site ? (
            <SiteCard
              key={`site-${site.id}`}
              site={site}
              many={many}
              early={early}
              readiness={readiness}
              onEditSite={() => handleEditSite(site.id)}
              onMarkLost={() => setMarkingLost({ id: site.id, name: getPropertyDisplayName(site) })}
              onReopen={() => setReopening({ id: site.id, name: getPropertyDisplayName(site) })}
              onDelete={isOrgAdmin ? () => deleteSite.requestDelete(site) : undefined}
              deleteBlockedBy={formatDeleteBlockTooltip(siteDeleteReasons)}
              delayMs={300}
            />
          ) : null}
          <DocumentsCard
            key={`documents-${site?.id ?? 'none'}`}
            site={site}
            sites={sites}
            delayMs={360}
          />
          {canService ? (
            <ServiceCard customerId={customerId} projectId={projectId} delayMs={420} />
          ) : (
            <LockedCard id="service" title="Service" gate="service.view" delayMs={420} />
          )}
          <ProfileCard
            customer={customer}
            resellerName={resellerName}
            onEdit={() => router.push(buildRoute(ROUTES.CUSTOMERS.EDIT, { id: customerId }))}
            delayMs={480}
          />
        </div>
      </div>

      <CancelSiteActivityDialog readiness={readiness} />
      <PropertySelectModal
        open={siteSelectOpen}
        onClose={() => setSiteSelectOpen(false)}
        customerId={customerId}
        properties={sites}
      />
      <FollowupDrawer
        open={followupDrawer !== null}
        onClose={() => setFollowupDrawer(null)}
        customerId={customerId}
        properties={sites}
        // Tied to a site, so that site's "needs a follow-up" clears; the picker can change it.
        initialPropertyId={followupDrawer?.siteId}
      />
      <FollowupDetailHost
        followupId={followupId}
        initialData={followups.find((row) => row.id === followupId)}
        onClose={closeFollowup}
        siblingRows={followups}
        scopeCustomerId={customerId}
        onMarkLost={(followup) => {
          if (!followup.propertyId) return;
          setMarkingLost({
            id: followup.propertyId,
            name: getPropertyDisplayName(followup.property as CustomerPropertyResponse),
          });
        }}
      />
      {markingLost ? (
        <MarkAsLostDialog
          open
          onClose={() => setMarkingLost(null)}
          propertyId={markingLost.id}
          propertyName={markingLost.name}
        />
      ) : null}
      {reopening ? (
        <ReopenPropertyDialog
          open
          onClose={() => setReopening(null)}
          propertyId={reopening.id}
          propertyName={reopening.name}
        />
      ) : null}
      <DeleteConfirmationDialog
        open={deleteCustomer.isOpen}
        title="Delete Customer"
        itemName={name}
        isPending={deleteCustomer.isPending}
        onCancel={deleteCustomer.cancel}
        onConfirm={() => void deleteCustomer.confirm()}
      />
      <DeleteConfirmationDialog
        open={deleteSite.isOpen}
        title="Delete Site"
        itemName={site ? getPropertyDisplayName(site) : 'this site'}
        isPending={deleteSite.isPending}
        onCancel={deleteSite.cancel}
        onConfirm={() => void deleteSite.confirm()}
      />
    </div>
  );
}
