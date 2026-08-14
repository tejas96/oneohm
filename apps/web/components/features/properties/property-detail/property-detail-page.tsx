'use client';

import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import {
  Box,
  Breadcrumbs,
  Link as MuiLink,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Typography,
} from '@mui/material';
import { CustomerStatus, FollowupStatus, QuoteStatus } from '@tejas96/shared/types';
import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState, type JSX } from 'react';

import {
  PROPERTY_DETAIL_DEFAULT_TAB,
  PROPERTY_DETAIL_TABS,
  type PropertyDetailTab,
} from '../constants';
import {
  useProperty,
  usePropertyFinanceSnapshot,
  usePropertyFollowups,
  usePropertyLoan,
  usePropertyQuoteSummary,
} from '../hooks';
import { PropertyDetailHeader, type PropertyHeaderSignal } from './header';
import { MarkAsLostDialog } from './mark-as-lost-dialog';
import { PropertyTabRail } from './tab-rail';
import { PageSkeleton, TabSkeleton } from './tab-skeleton';
import { useDeleteProperty } from '../hooks/use-properties';
import { getPropertyDisplayName } from '../utils';
import {
  formatDeleteBlockTooltip,
  getPropertyDeleteBlockReasons,
  ORG_ADMIN_ROLES,
} from '../utils/delete-eligibility';

import { useCustomer } from '@/components/features/customers/hooks';
import { FollowupDrawer } from '@/components/features/followups';
import { usePropertyLockStatus } from '@/components/features/quotes/hooks/use-quotes';
import { EmptyState } from '@/components/shared';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import type { MetricTileProps } from '@/components/shared/inventory/metric-tile';
import { showToast } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import { AccessDeniedContent, ALWAYS_OPEN, useCan } from '@/lib/rbac';
import {
  formatCurrency,
  formatDate,
  formatSystemSize,
  recordRecentView,
  toTitleLabel,
} from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const OverviewTab = dynamic(() => import('./tabs/overview-tab').then((m) => m.OverviewTab), {
  loading: () => <TabSkeleton />,
});
const QuotesTab = dynamic(() => import('./tabs/quotes-tab').then((m) => m.QuotesTab), {
  loading: () => <TabSkeleton />,
});
const DocumentsTab = dynamic(() => import('./tabs/documents-tab').then((m) => m.DocumentsTab), {
  loading: () => <TabSkeleton />,
});
const FinanceTab = dynamic(() => import('./tabs/finance-tab').then((m) => m.FinanceTab), {
  loading: () => <TabSkeleton />,
});
const ProjectTab = dynamic(() => import('./tabs/project-tab').then((m) => m.ProjectTab), {
  loading: () => <TabSkeleton />,
});
const FollowupsTab = dynamic(() => import('./tabs/followups-tab').then((m) => m.FollowupsTab), {
  loading: () => <TabSkeleton />,
});
const ActivityTab = dynamic(() => import('./tabs/activity-tab').then((m) => m.ActivityTab), {
  loading: () => <TabSkeleton />,
});
const ServiceTicketsTab = dynamic(
  () => import('@/components/features/service-tickets').then((m) => m.EntityServiceTicketsTab),
  { loading: () => <TabSkeleton />, ssr: false },
);

const TAB_MODULE_PRELOADERS: Record<PropertyDetailTab, () => Promise<unknown>> = {
  overview: () => import('./tabs/overview-tab'),
  quotes: () => import('./tabs/quotes-tab'),
  documents: () => import('./tabs/documents-tab'),
  finance: () => import('./tabs/finance-tab'),
  project: () => import('./tabs/project-tab'),
  followups: () => import('./tabs/followups-tab'),
  service: () => import('@/components/features/service-tickets'),
  activity: () => import('./tabs/activity-tab'),
};

interface PropertyDetailPageProps {
  propertyId: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function isValidTab(value: string | null): value is PropertyDetailTab {
  return PROPERTY_DETAIL_TABS.some((tab) => tab.value === value);
}

/** Quote states that still carry a live expiry clock. */
const LIVE_QUOTE_STATUSES: readonly QuoteStatus[] = [
  QuoteStatus.DRAFT,
  QuoteStatus.SENT,
  QuoteStatus.VIEWED,
];
const DAY_MS = 1000 * 60 * 60 * 24;

export function PropertyDetailPage({ propertyId }: PropertyDetailPageProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, hasAnyRole } = useAuth();
  const isOrgAdmin = hasAnyRole([...ORG_ADMIN_ROLES]);
  const deletePropertyMutation = useDeleteProperty();

  const rawTab = searchParams.get('tab');
  const activeTab: PropertyDetailTab = isValidTab(rawTab) ? rawTab : PROPERTY_DETAIL_DEFAULT_TAB;

  const [followupDrawerOpen, setFollowupDrawerOpen] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [markLostOpen, setMarkLostOpen] = useState(false);

  const isPropertyIdValid = isValidUuid(propertyId);
  const {
    data: property,
    isLoading: isLoadingProperty,
    error: propertyError,
  } = useProperty(propertyId);

  const deleteConfirmation = useDeleteConfirmation({
    mutation: deletePropertyMutation,
    getId: (item: { id: string }) => item.id,
    onSuccess: () => {
      void router.push(
        property?.customerId
          ? buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: property.customerId })
          : ROUTES.CUSTOMERS.LIST,
      );
    },
  });

  const propertyReady = isPropertyIdValid && !!property;
  const { data: customer } = useCustomer(property?.customerId ?? '', { enabled: propertyReady });
  const { data: lockStatus } = usePropertyLockStatus(property?.id);
  const { data: followupsData } = usePropertyFollowups(property?.id ?? '', {
    enabled: propertyReady,
    status: FollowupStatus.PENDING,
    limit: 20,
  });
  const linkedProjectId = property?.project?.id ?? property?.projectId ?? null;
  const { data: propertyLoan } = usePropertyLoan(property?.id ?? '', { enabled: propertyReady });
  const {
    snapshot: financeSnapshot,
    isLoading: financeLoading,
    hasProject: hasLinkedProject,
  } = usePropertyFinanceSnapshot(linkedProjectId, { enabled: propertyReady });

  /*
   * The commercial facts. `GET /customer-properties/:id` carries none of the
   * `latestQuote*` enrichment the list endpoint adds, so the tiles that read
   * them printed "—" for a site with an accepted ₹1.88L quote. They come from
   * the quotes endpoint now — the same one the Quotes tab renders, so the two
   * can never disagree and it costs no extra request.
   */
  const quoteSummary = usePropertyQuoteSummary(propertyId, { enabled: propertyReady });
  const headlineQuote = quoteSummary.headline;

  /**
   * The property record with those fields put back on it.
   *
   * Shared components — `SiteStageBar` above all — read `latestQuoteId` and
   * `latestQuoteStatus` to decide how far a site has travelled. Handed the raw
   * detail payload they saw neither, so a site with an accepted quote and a
   * live project sat on "Lead captured". Enriching once here means every tab
   * below gets the same, complete record.
   */
  const enrichedProperty = useMemo(() => {
    if (!property || !headlineQuote) return property;
    return {
      ...property,
      latestQuoteId: headlineQuote.id,
      latestQuoteNumber: headlineQuote.quoteNumber,
      latestQuoteStatus: headlineQuote.status,
      latestQuoteDate: headlineQuote.quoteDate,
      latestQuoteFinalPrice: headlineQuote.finalPrice,
      latestQuoteSystemSizeKw: headlineQuote.actualSystemSizeKw ?? headlineQuote.systemSizeKw,
    };
  }, [property, headlineQuote]);

  useEffect(() => {
    if (rawTab && !isValidTab(rawTab)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', PROPERTY_DETAIL_DEFAULT_TAB);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [rawTab, pathname, router, searchParams]);

  useEffect(() => {
    if (property && user?.id) {
      recordRecentView(user.id, {
        type: 'property',
        id: property.id,
        label: getPropertyDisplayName(property),
        href: buildRoute(ROUTES.PROPERTIES.DETAIL, { id: property.id }),
      });
    }
  }, [property, user?.id]);

  const handleTabChange = useCallback(
    (_: React.SyntheticEvent, tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const goToTab = useCallback(
    (tab: PropertyDetailTab) => {
      handleTabChange({} as React.SyntheticEvent, tab);
    },
    [handleTabChange],
  );

  const prefetchTab = useCallback((tab: PropertyDetailTab) => {
    void TAB_MODULE_PRELOADERS[tab]?.();
  }, []);

  const isInactiveCustomer = customer?.status === CustomerStatus.INACTIVE;

  const handleEdit = useCallback((): void => {
    router.push(buildRoute(ROUTES.PROPERTIES.EDIT, { id: propertyId }));
  }, [router, propertyId]);

  const handleCreateQuote = useCallback((): void => {
    if (isInactiveCustomer) {
      showToast.error('Cannot create quote: customer is inactive.');
      return;
    }
    if (lockStatus?.locked) {
      showToast.info('Quote creation is locked for this property.');
      return;
    }
    if (!property) return;
    router.push(`${ROUTES.QUOTES.NEW}?propertyId=${property.id}&customerId=${property.customerId}`);
  }, [isInactiveCustomer, lockStatus?.locked, property, router]);

  const handleGoToProject = useCallback((): void => {
    if (!property) return;
    if (linkedProjectId) {
      router.push(buildRoute(ROUTES.PROJECTS.DETAIL, { id: linkedProjectId }));
      return;
    }
    router.push(
      `${ROUTES.PROJECTS.NEW}?propertyId=${property.id}&customerId=${property.customerId}`,
    );
  }, [property, linkedProjectId, router]);

  const pendingFollowups = useMemo(() => followupsData?.data ?? [], [followupsData?.data]);
  const overdueFollowupCount = useMemo(
    () => pendingFollowups.filter((f) => new Date(f.scheduledAt).getTime() < Date.now()).length,
    [pendingFollowups],
  );
  const nextFollowup = useMemo(
    () =>
      [...pendingFollowups].sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      )[0],
    [pendingFollowups],
  );

  const signals = useMemo((): PropertyHeaderSignal[] => {
    const items: PropertyHeaderSignal[] = [];

    if (overdueFollowupCount > 0) {
      items.push({
        id: 'overdue-followups',
        label: `${overdueFollowupCount} overdue follow-up${overdueFollowupCount > 1 ? 's' : ''}`,
        tone: 'danger',
        onClick: () => goToTab('followups'),
      });
    } else if (!nextFollowup && property?.needsFollowup) {
      /*
       * An open lead with nothing pending is the state the follow-up feature
       * exists to prevent. Driven by the server-computed `needsFollowup` flag
       * (shared predicate) rather than re-deriving "closed" from status here —
       * a re-derived condition drifts from the chip the rest of the app shows.
       */
      items.push({
        id: 'no-followup',
        label: 'No follow-up scheduled',
        tone: 'warning',
        onClick: () => setFollowupDrawerOpen(true),
      });
    }

    /*
     * Only *late* money belongs in the attention row. A balance that is owed
     * but not yet due needs no action today; the full balance is one row down
     * in the Outstanding tile regardless.
     */
    if (financeSnapshot.overdueAmount > 0) {
      items.push({
        id: 'overdue-money',
        label: `${formatCurrency(financeSnapshot.overdueAmount)} overdue · ${financeSnapshot.maxDaysOverdue}d`,
        tone: financeSnapshot.maxDaysOverdue > 90 ? 'danger' : 'warning',
        onClick: () => goToTab('finance'),
      });
    }

    /*
     * A quote that lapses stops being a price. `validUntil` was on the payload
     * all along and had never been surfaced anywhere on this page.
     */
    if (headlineQuote?.validUntil && LIVE_QUOTE_STATUSES.includes(headlineQuote.status)) {
      const daysLeft = Math.ceil(
        (new Date(headlineQuote.validUntil).getTime() - Date.now()) / DAY_MS,
      );
      if (daysLeft < 0) {
        items.push({
          id: 'quote-expired',
          label: `Quote expired ${formatDate(headlineQuote.validUntil)}`,
          tone: 'danger',
          onClick: () => goToTab('quotes'),
        });
      } else if (daysLeft <= 7) {
        items.push({
          id: 'quote-expiring',
          label: daysLeft === 0 ? 'Quote expires today' : `Quote expires in ${daysLeft}d`,
          tone: 'warning',
          onClick: () => goToTab('quotes'),
        });
      }
    }

    return items;
  }, [
    overdueFollowupCount,
    nextFollowup,
    property?.needsFollowup,
    financeSnapshot.overdueAmount,
    financeSnapshot.maxDaysOverdue,
    headlineQuote,
    goToTab,
  ]);

  const kpiTiles = useMemo((): Array<MetricTileProps & { id: string }> => {
    const sizeKw = headlineQuote?.actualSystemSizeKw ?? headlineQuote?.systemSizeKw;
    const hasSubsidy = Boolean(headlineQuote?.subsidyAmount && headlineQuote.subsidyAmount > 0);

    return [
      {
        id: 'system',
        label: 'System size',
        value: sizeKw ? `${formatSystemSize(sizeKw)} kW` : '—',
        isLoading: quoteSummary.isLoading,
        secondary: headlineQuote
          ? [
              headlineQuote.systemType ? toTitleLabel(headlineQuote.systemType) : null,
              headlineQuote.totalWattageWp ? `${headlineQuote.totalWattageWp} Wp` : null,
            ]
              .filter(Boolean)
              .join(' · ') || undefined
          : 'No quote yet',
        onClick: () => goToTab('quotes'),
      },
      {
        id: 'quote-value',
        label: 'Quote value',
        value: headlineQuote?.finalPrice ? formatCurrency(headlineQuote.finalPrice) : '—',
        isLoading: quoteSummary.isLoading,
        intent: headlineQuote?.status === QuoteStatus.ACCEPTED ? 'success' : 'neutral',
        secondary: !headlineQuote
          ? 'Nothing quoted yet'
          : hasSubsidy && headlineQuote.effectivePrice != null
            ? `${formatCurrency(headlineQuote.effectivePrice)} after subsidy`
            : `${headlineQuote.quoteNumber} · ${toTitleLabel(headlineQuote.status)}`,
        onClick: () => goToTab('quotes'),
      },
      {
        id: 'outstanding',
        label: 'Outstanding',
        value: hasLinkedProject ? formatCurrency(financeSnapshot.totalOutstanding) : '—',
        isLoading: financeLoading,
        intent: !hasLinkedProject
          ? 'neutral'
          : financeSnapshot.maxDaysOverdue > 90
            ? 'danger'
            : financeSnapshot.overdueAmount > 0
              ? 'warning'
              : financeSnapshot.totalOutstanding > 0
                ? 'neutral'
                : 'success',
        secondary: !hasLinkedProject
          ? 'Starts after project conversion'
          : financeSnapshot.totalOutstanding === 0
            ? 'Fully collected'
            : financeSnapshot.overdueAmount > 0
              ? `${formatCurrency(financeSnapshot.overdueAmount)} past due`
              : `${financeSnapshot.openTermCount} open term${
                  financeSnapshot.openTermCount === 1 ? '' : 's'
                } · on schedule`,
        onClick: () => goToTab('finance'),
      },
      {
        id: 'next-followup',
        label: 'Next follow-up',
        value: nextFollowup ? formatDate(nextFollowup.scheduledAt) : '—',
        intent: overdueFollowupCount > 0 ? 'danger' : 'neutral',
        secondary:
          overdueFollowupCount > 0
            ? `${overdueFollowupCount} overdue`
            : (nextFollowup?.subject ?? 'Nothing scheduled'),
        onClick: () => goToTab('followups'),
      },
    ];
  }, [
    headlineQuote,
    quoteSummary.isLoading,
    hasLinkedProject,
    financeSnapshot,
    financeLoading,
    nextFollowup,
    overdueFollowupCount,
    goToTab,
  ]);

  const tabCounts = useMemo(
    () => ({
      quotes: quoteSummary.count,
      followups: pendingFollowups.length,
    }),
    [quoteSummary.count, pendingFollowups.length],
  );

  // Above the early returns below. A hook that runs only on some renders
  // changes the hook count between renders and React throws.
  const { can } = useCan();

  if (!isPropertyIdValid) {
    return (
      <EmptyState
        iconColor="error"
        title="Site not found"
        description="The site ID is invalid."
        action={{ label: 'Back to customers', onClick: () => router.push(ROUTES.CUSTOMERS.LIST) }}
      />
    );
  }

  if (isLoadingProperty) {
    return <PageSkeleton />;
  }

  if (propertyError || !property) {
    return (
      <EmptyState
        iconColor="error"
        title="Site not found"
        description="The site you're looking for doesn't exist or has been deleted."
        action={{ label: 'Back to customers', onClick: () => router.push(ROUTES.CUSTOMERS.LIST) }}
      />
    );
  }

  /* Defined whenever `property` is — the memo returns it untouched when there is no quote. */
  const site = enrichedProperty ?? property;
  const customerName =
    customer?.firstName || customer?.lastName
      ? [customer.firstName, customer.lastName].filter(Boolean).join(' ')
      : (property.customerName ?? 'Customer');
  const customerPhone = customer?.phone ?? property.customerPhone;
  const propertyName = getPropertyDisplayName(property);
  /*
   * Delete eligibility is gated on `latestQuoteId`, which this page never had
   * — so a site holding quotes offered a Delete that the API would refuse.
   * The enriched record carries it.
   */
  const propertyDeleteReasons = getPropertyDeleteBlockReasons(site, propertyLoan);
  const activeTabGate =
    PROPERTY_DETAIL_TABS.find((t) => t.value === activeTab)?.permission ?? ALWAYS_OPEN;

  const isTabEnabled = (tab: PropertyDetailTab): boolean => activeTab === tab;

  return (
    <Box sx={{ pb: 10 }}>
      {/*
       * The customer sits between the list and the site. The old trail jumped
       * straight from "Customers" to the site name, which hid whose site this
       * is and cost a step to get back to the person.
       */}
      <Breadcrumbs
        aria-label="Breadcrumb"
        separator="/"
        sx={{
          mb: 1.5,
          fontSize: '0.75rem',
          '& .MuiBreadcrumbs-separator': { color: 'var(--ds-text-tertiary)', mx: 0.75 },
        }}
      >
        <MuiLink
          component={NextLink}
          href={ROUTES.CUSTOMERS.LIST}
          underline="hover"
          sx={{ color: 'var(--ds-text-secondary)', fontSize: '0.75rem' }}
        >
          Customers
        </MuiLink>
        <MuiLink
          component={NextLink}
          href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: property.customerId })}
          underline="hover"
          sx={{ color: 'var(--ds-text-secondary)', fontSize: '0.75rem' }}
        >
          {customerName}
        </MuiLink>
        <Typography sx={{ color: 'var(--ds-text-primary)', fontSize: '0.75rem', fontWeight: 500 }}>
          {propertyName}
        </Typography>
      </Breadcrumbs>

      <PropertyDetailHeader
        property={site}
        customerId={property.customerId}
        customerName={customerName}
        customerPhone={customerPhone}
        isInactiveCustomer={isInactiveCustomer}
        quoteLocked={Boolean(lockStatus?.locked)}
        lockedQuoteNumber={lockStatus?.acceptedQuoteNumber}
        hasProject={Boolean(linkedProjectId)}
        onEdit={handleEdit}
        onCreateQuote={handleCreateQuote}
        onGoToProject={handleGoToProject}
        onLogFollowup={() => setFollowupDrawerOpen(true)}
        onMarkLost={() => setMarkLostOpen(true)}
        showDelete={isOrgAdmin}
        deleteDisabled={propertyDeleteReasons.length > 0}
        deleteTooltip={formatDeleteBlockTooltip(propertyDeleteReasons)}
        onDelete={() => deleteConfirmation.requestDelete(property)}
        signals={signals}
      />

      <KpiStripe className="mb-1" columns={4} tiles={kpiTiles} />

      <PropertyTabRail
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onPrefetch={prefetchTab}
        counts={tabCounts}
      />

      {/* Guarded here, not per tab: the active tab can come from URL

          state, so blocking only the trigger would let a hand-typed

          ?tab= slip straight through into the content. */}

      {!can(activeTabGate) ? (
        <Box role="tabpanel" className="py-12">
          <AccessDeniedContent gate={activeTabGate} />
        </Box>
      ) : (
        <Box role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
          <Suspense fallback={<TabSkeleton />}>
            {activeTab === 'overview' && (
              <OverviewTab
                property={site}
                enabled={isTabEnabled('overview')}
                onTabChange={goToTab}
                onLogFollowup={() => setFollowupDrawerOpen(true)}
                onCreateQuote={handleCreateQuote}
                onGoToProject={handleGoToProject}
                isInactiveCustomer={isInactiveCustomer}
                quoteLocked={Boolean(lockStatus?.locked)}
              />
            )}
            {activeTab === 'quotes' && (
              <QuotesTab
                propertyId={property.id}
                enabled={isTabEnabled('quotes')}
                isInactiveCustomer={isInactiveCustomer}
                onCreateQuote={handleCreateQuote}
              />
            )}
            {activeTab === 'documents' && <DocumentsTab propertyId={property.id} />}
            {activeTab === 'finance' && (
              <FinanceTab
                propertyId={property.id}
                projectId={linkedProjectId}
                enabled={isTabEnabled('finance')}
                onGoToProject={handleGoToProject}
              />
            )}
            {activeTab === 'project' && (
              <ProjectTab
                property={site}
                enabled={isTabEnabled('project')}
                onGoToProject={handleGoToProject}
                isInactiveCustomer={isInactiveCustomer}
              />
            )}
            {activeTab === 'followups' && (
              <FollowupsTab
                propertyId={property.id}
                enabled={isTabEnabled('followups')}
                onLogFollowup={() => setFollowupDrawerOpen(true)}
                onMarkLost={() => setMarkLostOpen(true)}
              />
            )}
            {activeTab === 'service' && (
              <ServiceTicketsTab
                scope="property"
                id={propertyId}
                customerId={property.customerId}
                projectId={linkedProjectId ?? undefined}
                enabled={isTabEnabled('service')}
              />
            )}
            {activeTab === 'activity' && (
              <ActivityTab property={site} enabled={isTabEnabled('activity')} />
            )}
          </Suspense>
        </Box>
      )}

      <FollowupDrawer
        open={followupDrawerOpen}
        onClose={() => setFollowupDrawerOpen(false)}
        customerId={property.customerId}
        propertyId={property.id}
        leadTemperature={property.leadTemperature}
      />
      <MarkAsLostDialog
        open={markLostOpen}
        onClose={() => setMarkLostOpen(false)}
        propertyId={property.id}
        propertyName={propertyName}
      />

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        title="Delete site"
        itemName={propertyName}
        isPending={deleteConfirmation.isPending}
        onCancel={deleteConfirmation.cancel}
        onConfirm={() => void deleteConfirmation.confirm()}
      />

      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <SpeedDial
          ariaLabel="Site actions"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
          open={speedDialOpen}
          onClose={() => setSpeedDialOpen(false)}
          onOpen={() => setSpeedDialOpen(true)}
        >
          <SpeedDialAction
            icon={<EditOutlinedIcon />}
            slotProps={{ tooltip: { title: 'Edit' } }}
            onClick={() => {
              setSpeedDialOpen(false);
              handleEdit();
            }}
          />
          <SpeedDialAction
            icon={<PostAddOutlinedIcon />}
            slotProps={{ tooltip: { title: 'New quote' } }}
            onClick={() => {
              setSpeedDialOpen(false);
              handleCreateQuote();
            }}
          />
          <SpeedDialAction
            icon={<FolderOpenOutlinedIcon />}
            slotProps={{ tooltip: { title: linkedProjectId ? 'Open project' : 'Convert' } }}
            onClick={() => {
              setSpeedDialOpen(false);
              handleGoToProject();
            }}
          />
          <SpeedDialAction
            icon={<EventNoteOutlinedIcon />}
            slotProps={{ tooltip: { title: 'Log follow-up' } }}
            onClick={() => {
              setSpeedDialOpen(false);
              setFollowupDrawerOpen(true);
            }}
          />
        </SpeedDial>
      </Box>
    </Box>
  );
}
