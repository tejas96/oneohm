'use client';

import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
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
import { CustomerStatus, FollowupStatus, PropertyStatus, QuoteStatus } from '@tejas96/shared/types';
import dynamic from 'next/dynamic';
import NextLink from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type JSX, Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import {
  CUSTOMER_DETAIL_DEFAULT_TAB,
  CUSTOMER_DETAIL_TABS,
  type CustomerDetailTab,
} from '../constants';
import {
  useCustomer,
  useCustomerFollowups,
  useCustomerProperties,
  useDeleteCustomer,
} from '../hooks';
import { CustomerDetailHeader, type HeaderSignal } from './header';
import { PropertyDetailDrawer } from './property-detail-drawer';
import { CustomerTabRail } from './tab-rail';
import { PageSkeleton, TabSkeleton } from './tab-skeleton';
import { getBalanceTone, getCustomerDisplayName, getOverdueAmount, isValidUuid } from './utils';
import { PropertySelectModal } from '../components/property-select-modal';

import { FollowupDrawer } from '@/components/features/followups';
import {
  formatDeleteBlockTooltip,
  getCustomerDeleteBlockReasons,
  ORG_ADMIN_ROLES,
} from '@/components/features/properties/utils/delete-eligibility';
import { EmptyState } from '@/components/shared';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import type { MetricTileProps } from '@/components/shared/inventory/metric-tile';
import { showToast } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import { useOrgCustomersAr } from '@/lib/hooks/resources';
import { useLedgerEntries, lastReceiptValueDate } from '@/lib/hooks/resources/ledger';
import { formatCurrency, formatDate, formatNumber, formatSystemSize, recordRecentView } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const OverviewTab = dynamic(() => import('./tabs/overview-tab').then((m) => m.OverviewTab), {
  loading: () => <TabSkeleton />,
});
const PropertiesTab = dynamic(() => import('./tabs/properties-tab').then((m) => m.PropertiesTab), {
  loading: () => <TabSkeleton />,
});
const QuotesTab = dynamic(() => import('./tabs/quotes-tab').then((m) => m.QuotesTab), {
  loading: () => <TabSkeleton />,
});
const ProjectsTab = dynamic(() => import('./tabs/projects-tab').then((m) => m.ProjectsTab), {
  loading: () => <TabSkeleton />,
});
const DocumentsTab = dynamic(() => import('./tabs/documents-tab').then((m) => m.DocumentsTab), {
  loading: () => <TabSkeleton />,
});
const FollowupsTab = dynamic(() => import('./tabs/followups-tab').then((m) => m.FollowupsTab), {
  loading: () => <TabSkeleton />,
});
const FinanceTab = dynamic(() => import('./tabs/finance-tab').then((m) => m.FinanceTab), {
  loading: () => <TabSkeleton />,
});
const ActivityTab = dynamic(() => import('./tabs/activity-tab').then((m) => m.ActivityTab), {
  loading: () => <TabSkeleton />,
});
const ServiceTicketsTab = dynamic(
  () => import('@/components/features/service-tickets').then((m) => m.EntityServiceTicketsTab),
  { loading: () => <TabSkeleton />, ssr: false },
);

const TAB_MODULE_PRELOADERS: Record<CustomerDetailTab, () => Promise<unknown>> = {
  overview: () => import('./tabs/overview-tab'),
  properties: () => import('./tabs/properties-tab'),
  quotes: () => import('./tabs/quotes-tab'),
  projects: () => import('./tabs/projects-tab'),
  documents: () => import('./tabs/documents-tab'),
  followups: () => import('./tabs/followups-tab'),
  finance: () => import('./tabs/finance-tab'),
  service: () => import('@/components/features/service-tickets'),
  activity: () => import('./tabs/activity-tab'),
};

interface CustomerDetailPageProps {
  customerId: string;
}

function isValidTab(value: string | null): value is CustomerDetailTab {
  return CUSTOMER_DETAIL_TABS.some((tab) => tab.value === value);
}

export function CustomerDetailPage({ customerId }: CustomerDetailPageProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, hasAnyRole } = useAuth();
  const isOrgAdmin = hasAnyRole([...ORG_ADMIN_ROLES]);
  const deleteCustomerMutation = useDeleteCustomer();
  const deleteConfirmation = useDeleteConfirmation({
    mutation: deleteCustomerMutation,
    getId: (item: { id: string }) => item.id,
    onSuccess: () => {
      void router.push(ROUTES.CUSTOMERS.LIST);
    },
  });

  const rawTab = searchParams.get('tab');
  const activeTab: CustomerDetailTab = isValidTab(rawTab) ? rawTab : CUSTOMER_DETAIL_DEFAULT_TAB;
  const rawPropertyFilter = searchParams.get('docProperty') || 'all';

  const [propertySelectOpen, setPropertySelectOpen] = useState(false);
  const [followupDrawerOpen, setFollowupDrawerOpen] = useState(false);
  const [propertyDrawerId, setPropertyDrawerId] = useState<string | null>(null);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  const isCustomerIdValid = isValidUuid(customerId);

  const {
    data: customer,
    isLoading: isLoadingCustomer,
    error: customerError,
  } = useCustomer(customerId, { enabled: isCustomerIdValid });

  const customerReady = isCustomerIdValid && !!customer;

  const { data: properties = [], isLoading: isLoadingProperties } = useCustomerProperties(
    customerId,
    { enabled: customerReady },
  );

  const defaultPropertyId = useMemo(() => {
    if (!properties || properties.length === 0) return '';
    return properties.find((p) => p.isPrimary)?.id ?? properties[0]?.id ?? '';
  }, [properties]);

  const propertyFilter = useMemo(() => {
    if (!rawPropertyFilter || rawPropertyFilter === 'all') return defaultPropertyId;
    const isValid = properties.some((p) => p.id === rawPropertyFilter);
    return isValid ? rawPropertyFilter : defaultPropertyId;
  }, [rawPropertyFilter, defaultPropertyId, properties]);

  const { data: followupsPreview } = useCustomerFollowups(customerId, {
    status: FollowupStatus.PENDING,
    limit: 10,
    enabled: customerReady,
  });
  const { data: arRows, isLoading: arLoading } = useOrgCustomersAr({
    enabled: customerReady,
  });

  useEffect(() => {
    if (rawTab && !isValidTab(rawTab)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', CUSTOMER_DETAIL_DEFAULT_TAB);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [rawTab, pathname, router, searchParams]);

  useEffect(() => {
    if (customer && user?.id) {
      const fullName = getCustomerDisplayName(customer);
      recordRecentView(user.id, {
        type: 'customer',
        id: customer.id,
        label: fullName,
        href: buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: customer.id }),
      });
    }
  }, [customer, user?.id]);

  const handleTabChange = useCallback(
    (_: React.SyntheticEvent, tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const goToTab = useCallback(
    (tab: CustomerDetailTab) => {
      handleTabChange({} as React.SyntheticEvent, tab);
    },
    [handleTabChange],
  );

  const setPropertyFilterParam = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'all') {
        params.delete('docProperty');
      } else {
        params.set('docProperty', value);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  /*
   * Editing is a full page, not a drawer. The wizard at
   * `/customers/[id]/edit` is the same flow that creates a customer, so it
   * owns validation, the availability check and the multi-step layout; the
   * drawer was a second, thinner editor for the same record.
   */
  const handleEdit = useCallback((): void => {
    router.push(buildRoute(ROUTES.CUSTOMERS.EDIT, { id: customerId }));
  }, [router, customerId]);

  const prefetchTab = useCallback((tab: CustomerDetailTab) => {
    void TAB_MODULE_PRELOADERS[tab]?.();
  }, []);

  const handleAddProperty = (): void => {
    if (customer?.status === CustomerStatus.INACTIVE) {
      showToast.error('Cannot perform this action: customer is inactive');
      return;
    }
    router.push(buildRoute(ROUTES.ONBOARDING.NEW, undefined, { customerId }));
  };

  const handleCreateQuote = (): void => {
    if (customer?.status === CustomerStatus.INACTIVE) {
      showToast.error('Cannot perform this action: customer is inactive');
      return;
    }
    if (properties.length > 0) {
      setPropertySelectOpen(true);
    } else {
      showToast.info('Please add a property first before creating a quote');
      handleAddProperty();
    }
  };

  const handleOpenProperty = useCallback((propertyId: string) => {
    setPropertyDrawerId(propertyId);
  }, []);

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === propertyDrawerId) ?? null,
    [properties, propertyDrawerId],
  );

  const ledgerReceiptsQ = useLedgerEntries(
    { customerId, direction: 'in', page: 1, limit: 100 },
    { enabled: customerReady },
  );
  const lastReceiptFromLedger = useMemo(
    () => lastReceiptValueDate(ledgerReceiptsQ.data?.data ?? []),
    [ledgerReceiptsQ.data?.data],
  );
  const aging = useMemo(
    () => arRows?.find((row) => row.customerId === customerId),
    [arRows, customerId],
  );

  const pendingFollowups = useMemo(() => followupsPreview?.data ?? [], [followupsPreview?.data]);
  const nextFollowup = useMemo(() => {
    const sorted = [...pendingFollowups].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
    return sorted[0];
  }, [pendingFollowups]);

  const overdueFollowupCount = useMemo(
    () => pendingFollowups.filter((f) => new Date(f.scheduledAt).getTime() < Date.now()).length,
    [pendingFollowups],
  );

  /**
   * Site roll-up.
   *
   * `sitePortfolio` is a list-response field only — a single-customer read
   * omits it — so the same figures are derived here from the properties the
   * page already loaded rather than by firing another request.
   */
  const portfolio = useMemo(() => {
    let converted = 0;
    let quotedSites = 0;
    let quotedKw = 0;
    let pipelineValue = 0;
    let pipelineSites = 0;
    for (const property of properties) {
      if (property.status === PropertyStatus.CONVERTED) converted += 1;
      if (property.latestQuoteId) {
        quotedSites += 1;
        quotedKw += property.latestQuoteSystemSizeKw ?? 0;
      }
      /*
       * Pipeline counts only quotes that are actually sitting with the
       * customer. Summing every latest quote — which is what a "Quoted value"
       * tile would do — silently folds in rejected and expired quotes plus
       * sites already converted to projects, producing a number that is a
       * total of nothing in particular.
       */
      if (
        property.latestQuoteStatus === QuoteStatus.SENT ||
        property.latestQuoteStatus === QuoteStatus.VIEWED
      ) {
        pipelineSites += 1;
        pipelineValue += property.latestQuoteFinalPrice ?? 0;
      }
    }
    return { converted, quotedSites, quotedKw, pipelineValue, pipelineSites };
  }, [properties]);

  const activeTicketCount = customer?.activeTicketCount ?? 0;

  const signals = useMemo((): HeaderSignal[] => {
    const items: HeaderSignal[] = [];
    if (overdueFollowupCount > 0) {
      items.push({
        id: 'overdue-followups',
        label: `${overdueFollowupCount} overdue follow-up${overdueFollowupCount > 1 ? 's' : ''}`,
        tone: 'danger',
        onClick: () => goToTab('followups'),
      });
    }
    /*
     * Only *late* money belongs in the attention row. A balance that is owed
     * but not yet due needs no action today, and flagging it amber next to a
     * genuine overdue follow-up devalues both. The exact balance is one row
     * down in the Outstanding tile regardless.
     */
    const overdueAmount = getOverdueAmount(aging);
    if (overdueAmount > 0) {
      items.push({
        id: 'overdue-money',
        label: `${formatCurrency(overdueAmount)} overdue`,
        tone: (aging?.bucket90plus ?? 0) > 0 ? 'danger' : 'warning',
        onClick: () => goToTab('finance'),
      });
    }
    if (activeTicketCount > 0) {
      items.push({
        id: 'tickets',
        label: `${activeTicketCount} open service ticket${activeTicketCount > 1 ? 's' : ''}`,
        tone: 'info',
        onClick: () => goToTab('service'),
      });
    }
    return items;
  }, [overdueFollowupCount, aging, activeTicketCount, goToTab]);

  const kpiTiles = useMemo((): Array<MetricTileProps & { id: string }> => {
    const outstanding = aging?.totalOutstanding ?? 0;
    const over90 = aging?.bucket90plus ?? 0;

    const overdueAmount = getOverdueAmount(aging);
    const outstandingSecondary = ((): string => {
      if (over90 > 0) return `${formatCurrency(over90)} over 90 days`;
      if (overdueAmount > 0) return `${formatCurrency(overdueAmount)} overdue`;
      if (outstanding > 0) return 'All on schedule';
      if (lastReceiptFromLedger) return `Last receipt ${formatDate(lastReceiptFromLedger)}`;
      return 'Nothing outstanding';
    })();

    return [
      {
        id: 'sites',
        label: 'Sites',
        value: formatNumber(properties.length),
        isLoading: isLoadingProperties,
        secondary:
          properties.length === 0
            ? 'No sites yet'
            : `${portfolio.converted} converted · ${formatSystemSize(portfolio.quotedKw)} kW quoted`,
        onClick: () => goToTab('properties'),
      },
      {
        id: 'open-pipeline',
        label: 'Open pipeline',
        value: formatCurrency(portfolio.pipelineValue),
        isLoading: isLoadingProperties,
        secondary:
          portfolio.pipelineSites === 0
            ? `${portfolio.quotedSites} of ${properties.length} site${
                properties.length === 1 ? '' : 's'
              } quoted`
            : `${portfolio.pipelineSites} quote${
                portfolio.pipelineSites === 1 ? '' : 's'
              } awaiting a decision`,
        onClick: () => goToTab('quotes'),
      },
      {
        id: 'outstanding',
        label: 'Outstanding',
        value: formatCurrency(outstanding),
        isLoading: arLoading,
        intent: getBalanceTone(aging),
        secondary: outstandingSecondary,
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
    aging,
    properties.length,
    portfolio,
    isLoadingProperties,
    arLoading,
    nextFollowup,
    overdueFollowupCount,
    lastReceiptFromLedger,
    goToTab,
  ]);

  const tabCounts = useMemo(
    () => ({
      properties: properties.length,
      followups: pendingFollowups.length,
      service: activeTicketCount,
    }),
    [properties.length, pendingFollowups.length, activeTicketCount],
  );

  if (!isCustomerIdValid) {
    return (
      <EmptyState
        iconColor="error"
        title="Customer not found"
        description="The customer you're looking for doesn't exist or has been deleted."
        action={{
          label: 'Back to Customers',
          onClick: () => router.push(ROUTES.CUSTOMERS.LIST),
        }}
      />
    );
  }

  if (isLoadingCustomer) {
    return <PageSkeleton />;
  }

  if (customerError || !customer) {
    return (
      <EmptyState
        iconColor="error"
        title="Customer not found"
        description="The customer you're looking for doesn't exist or has been deleted."
        action={{
          label: 'Back to Customers',
          onClick: () => router.push(ROUTES.CUSTOMERS.LIST),
        }}
      />
    );
  }

  const isInactive = customer.status === CustomerStatus.INACTIVE;
  const customerName = getCustomerDisplayName(customer);
  const customerDeleteReasons = getCustomerDeleteBlockReasons({
    propertyCount: customer.propertyCount ?? properties.length,
    deleteBlockReasons: customer.deleteBlockReasons,
  });
  const customerDeleteDisabled = customerDeleteReasons.length > 0;
  const customerDeleteTooltip = formatDeleteBlockTooltip(customerDeleteReasons);
  const isTabEnabled = (tab: CustomerDetailTab): boolean => activeTab === tab;

  return (
    <Box sx={{ pb: 10 }}>
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
        <Typography sx={{ color: 'var(--ds-text-primary)', fontSize: '0.75rem', fontWeight: 500 }}>
          {customerName}
        </Typography>
      </Breadcrumbs>

      <CustomerDetailHeader
        customer={customer}
        assigneeName={customer.assigneeName}
        isInactive={isInactive}
        onEdit={handleEdit}
        onAddProperty={handleAddProperty}
        onCreateQuote={handleCreateQuote}
        onLogFollowup={() => setFollowupDrawerOpen(true)}
        showDelete={isOrgAdmin}
        deleteDisabled={customerDeleteDisabled}
        deleteTooltip={customerDeleteTooltip}
        onDelete={() => deleteConfirmation.requestDelete(customer)}
        signals={signals}
      />

      <KpiStripe className="mb-1" columns={4} tiles={kpiTiles} />

      <CustomerTabRail
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onPrefetch={prefetchTab}
        counts={tabCounts}
      />

      <Box role="tabpanel" aria-labelledby={`tab-${activeTab}`} aria-busy={isLoadingProperties}>
        <Suspense fallback={<TabSkeleton />}>
          {activeTab === 'overview' && (
            <OverviewTab
              customer={customer}
              properties={properties}
              customerId={customerId}
              activeTab={activeTab}
              onTabChange={goToTab}
              onOpenProperty={handleOpenProperty}
              onLogFollowup={() => setFollowupDrawerOpen(true)}
              onAddProperty={handleAddProperty}
              isInactive={isInactive}
            />
          )}
          {activeTab === 'properties' && (
            <PropertiesTab
              customerId={customerId}
              properties={properties}
              isLoading={isLoadingProperties}
              isInactive={isInactive}
              onAddProperty={handleAddProperty}
              onOpenProperty={handleOpenProperty}
            />
          )}
          {activeTab === 'quotes' && (
            <QuotesTab
              customerId={customerId}
              enabled={isTabEnabled('quotes')}
              isInactive={isInactive}
              onCreateQuote={handleCreateQuote}
            />
          )}
          {activeTab === 'projects' && (
            <ProjectsTab customerId={customerId} enabled={isTabEnabled('projects')} />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab
              properties={properties}
              propertyFilter={propertyFilter}
              onPropertyFilterChange={setPropertyFilterParam}
            />
          )}
          {activeTab === 'followups' && (
            <FollowupsTab
              customerId={customerId}
              enabled={isTabEnabled('followups')}
              onSchedule={() => setFollowupDrawerOpen(true)}
            />
          )}
          {activeTab === 'finance' && (
            <FinanceTab
              customerId={customerId}
              customerName={customerName}
              enabled={isTabEnabled('finance')}
            />
          )}
          {activeTab === 'service' && (
            <ServiceTicketsTab scope="customer" id={customerId} enabled={isTabEnabled('service')} />
          )}
          {activeTab === 'activity' && (
            <ActivityTab
              customerId={customerId}
              properties={properties}
              enabled={isTabEnabled('activity')}
            />
          )}
        </Suspense>
      </Box>

      <PropertySelectModal
        open={propertySelectOpen}
        onClose={() => setPropertySelectOpen(false)}
        customerId={customerId}
        properties={properties}
      />

      <PropertyDetailDrawer
        open={propertyDrawerId !== null}
        onClose={() => setPropertyDrawerId(null)}
        property={selectedProperty}
        customerId={customerId}
      />

      <FollowupDrawer
        open={followupDrawerOpen}
        onClose={() => setFollowupDrawerOpen(false)}
        customerId={customerId}
        properties={properties}
      />

      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <SpeedDial
          ariaLabel="Customer actions"
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
            icon={<AddBusinessOutlinedIcon />}
            slotProps={{ tooltip: { title: 'Add site' } }}
            onClick={() => {
              setSpeedDialOpen(false);
              handleAddProperty();
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
            icon={<EventNoteOutlinedIcon />}
            slotProps={{ tooltip: { title: 'Log follow-up' } }}
            onClick={() => {
              setSpeedDialOpen(false);
              setFollowupDrawerOpen(true);
            }}
          />
        </SpeedDial>
      </Box>

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        title="Delete Customer"
        itemName={customerName}
        isPending={deleteConfirmation.isPending}
        onCancel={deleteConfirmation.cancel}
        onConfirm={() => void deleteConfirmation.confirm()}
      />
    </Box>
  );
}
