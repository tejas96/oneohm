'use client';

import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import {
  Box,
  Breadcrumbs,
  Link as MuiLink,
  Paper,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { CustomerStatus, FollowupStatus, PropertyStatus } from '@tejas96/shared/types';
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
import { CustomerAttentionPanel, type AttentionItem } from './attention-panel';
import { CustomerEditDrawer } from './customer-edit-drawer';
import { FollowupDrawer } from './followup-drawer';
import { CustomerDetailHeader } from './header';
import { CustomerDetailKpiStrip } from './kpi-strip';
import { PropertyDetailDrawer } from './property-detail-drawer';
import { PageSkeleton, TabSkeleton } from './tab-skeleton';
import { getCustomerDisplayName, isValidUuid } from './utils';
import { PropertySelectModal } from '../components/property-select-modal';

import {
  formatDeleteBlockTooltip,
  getCustomerDeleteBlockReasons,
  shouldShowCustomerDelete,
} from '@/components/features/properties/utils/delete-eligibility';
import { EmptyState } from '@/components/shared';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { showToast } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import { useOrgCustomersAr } from '@/lib/hooks/resources';
import { formatCurrency, formatDate, recordRecentView } from '@/lib/utils';
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
const ServiceTab = dynamic(() => import('./tabs/service-tab').then((m) => m.ServiceTab), {
  loading: () => <TabSkeleton />,
});
const ActivityTab = dynamic(() => import('./tabs/activity-tab').then((m) => m.ActivityTab), {
  loading: () => <TabSkeleton />,
});

const TAB_MODULE_PRELOADERS: Record<CustomerDetailTab, () => Promise<unknown>> = {
  overview: () => import('./tabs/overview-tab'),
  properties: () => import('./tabs/properties-tab'),
  quotes: () => import('./tabs/quotes-tab'),
  projects: () => import('./tabs/projects-tab'),
  documents: () => import('./tabs/documents-tab'),
  followups: () => import('./tabs/followups-tab'),
  finance: () => import('./tabs/finance-tab'),
  service: () => import('./tabs/service-tab'),
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
  const { user } = useAuth();
  const showCustomerDelete = shouldShowCustomerDelete();
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
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
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
  const { data: arRows, isLoading: arLoading } = useOrgCustomersAr(undefined, {
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

  const handleEdit = (): void => {
    setEditDrawerOpen(true);
  };

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

  const aging = useMemo(
    () => arRows?.find((row) => row.customerId === customerId),
    [arRows, customerId],
  );

  const pendingFollowups = followupsPreview?.data ?? [];
  const nextFollowup = useMemo(() => {
    const sorted = [...pendingFollowups].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
    return sorted[0];
  }, [pendingFollowups]);

  const overdueFollowups = pendingFollowups.filter(
    (f) => new Date(f.scheduledAt).getTime() < Date.now(),
  );

  const projectCount = useMemo(
    () => properties.filter((p) => p.projectId || p.status === PropertyStatus.CONVERTED).length,
    [properties],
  );

  const quotedCount = useMemo(
    () => properties.filter((p) => p.latestQuoteStatus).length,
    [properties],
  );

  const attentionItems = useMemo((): AttentionItem[] => {
    const items: AttentionItem[] = [];
    if (overdueFollowups.length > 0) {
      items.push({
        id: 'overdue-followups',
        label: `${overdueFollowups.length} overdue follow-up${overdueFollowups.length > 1 ? 's' : ''}`,
        tab: 'followups',
      });
    }
    if (aging && aging.totalOutstanding > 0) {
      items.push({
        id: 'outstanding',
        label: `${formatCurrency(aging.totalOutstanding)} outstanding`,
        tab: 'finance',
      });
    }
    return items;
  }, [overdueFollowups.length, aging]);

  const kpiItems = useMemo(
    () => [
      { label: 'Properties', value: String(properties.length) },
      { label: 'With Quotes', value: String(quotedCount) },
      { label: 'Projects', value: String(projectCount) },
      {
        label: 'Outstanding',
        value: arLoading ? '…' : formatCurrency(aging?.totalOutstanding ?? 0),
        tone: (aging?.totalOutstanding ?? 0) > 0 ? ('warning' as const) : ('default' as const),
        hint: 'from AR',
      },
      {
        label: 'Next Follow-up',
        value: nextFollowup ? formatDate(nextFollowup.scheduledAt) : '—',
      },
      {
        label: 'Open Terms',
        value: arLoading ? '…' : String(aging?.openTermCount ?? 0),
      },
    ],
    [properties.length, quotedCount, projectCount, arLoading, aging, nextFollowup],
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
      <Breadcrumbs aria-label="Breadcrumb" sx={{ mb: 2, fontSize: '0.75rem' }}>
        <MuiLink
          component={NextLink}
          href={ROUTES.CUSTOMERS.LIST}
          underline="hover"
          color="inherit"
        >
          Customers
        </MuiLink>
        <Typography color="text.primary" variant="caption">
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
        showDelete={showCustomerDelete}
        deleteDisabled={customerDeleteDisabled}
        deleteTooltip={customerDeleteTooltip}
        onDelete={() => deleteConfirmation.requestDelete(customer)}
      />

      <CustomerDetailKpiStrip items={kpiItems} />

      <CustomerAttentionPanel
        items={attentionItems}
        onViewAll={
          attentionItems.length > 0
            ? () =>
                handleTabChange({} as React.SyntheticEvent, attentionItems[0]?.tab ?? 'overview')
            : undefined
        }
      />

      <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Customer sections"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            minHeight: 42,
            bgcolor: 'background.paper',
            '& .MuiTab-root': {
              minHeight: 42,
              fontSize: '0.8125rem',
              fontWeight: 500,
              textTransform: 'none',
              color: 'text.secondary',
            },
            '& .Mui-selected': {
              color: 'primary.main',
              fontWeight: 600,
            },
          }}
        >
          {CUSTOMER_DETAIL_TABS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              id={`tab-${tab.value}`}
              onMouseEnter={() => prefetchTab(tab.value)}
            />
          ))}
        </Tabs>

        <Box role="tabpanel" aria-labelledby={`tab-${activeTab}`} aria-busy={isLoadingProperties}>
          <Suspense fallback={<TabSkeleton />}>
            {activeTab === 'overview' && (
              <OverviewTab
                customer={customer}
                properties={properties}
                customerId={customerId}
                activeTab={activeTab}
                onTabChange={(tab) => handleTabChange({} as React.SyntheticEvent, tab)}
                onOpenProperty={handleOpenProperty}
                onLogFollowup={() => setFollowupDrawerOpen(true)}
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
              <ServiceTab customerId={customerId} enabled={isTabEnabled('service')} />
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
      </Paper>

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

      <CustomerEditDrawer
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        customer={customer}
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
            slotProps={{ tooltip: { title: 'Add Property' } }}
            onClick={() => {
              setSpeedDialOpen(false);
              handleAddProperty();
            }}
          />
          <SpeedDialAction
            icon={<PostAddOutlinedIcon />}
            slotProps={{ tooltip: { title: 'Create Quote' } }}
            onClick={() => {
              setSpeedDialOpen(false);
              handleCreateQuote();
            }}
          />
          <SpeedDialAction
            icon={<EventNoteOutlinedIcon />}
            slotProps={{ tooltip: { title: 'Log Follow-up' } }}
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
