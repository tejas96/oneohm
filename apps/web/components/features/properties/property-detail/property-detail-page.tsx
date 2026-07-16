'use client';

import AddTaskOutlinedIcon from '@mui/icons-material/AddTaskOutlined';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import {
  Box,
  Breadcrumbs,
  Button,
  Divider,
  IconButton,
  Link as MuiLink,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { CustomerStatus, FollowupStatus } from '@tejas96/shared/types';
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
} from '../hooks';
import { FollowupDrawer } from './followup-drawer';
import { MarkAsLostDialog } from './mark-as-lost-dialog';
import { useDeleteProperty } from '../hooks/use-properties';
import { getPropertyDisplayName } from '../utils';
import { PageSkeleton, TabSkeleton } from './tab-skeleton';
import {
  formatDeleteBlockTooltip,
  getPropertyDeleteBlockReasons,
  ORG_ADMIN_ROLES,
} from '../utils/delete-eligibility';

import {
  CustomerAttentionPanel,
  CustomerDetailKpiStrip,
} from '@/components/features/customers/customer-detail';
import { stickyHeaderPaperSx } from '@/components/features/customers/customer-detail/styles';
import { useCustomer } from '@/components/features/customers/hooks';
import { usePropertyLockStatus } from '@/components/features/quotes/hooks/use-quotes';
import { EmptyState } from '@/components/shared';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { showToast, WhatsAppIcon } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import {
  formatCurrency,
  formatDate,
  formatPhoneForWhatsApp,
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

const TAB_MODULE_PRELOADERS: Record<PropertyDetailTab, () => Promise<unknown>> = {
  overview: () => import('./tabs/overview-tab'),
  quotes: () => import('./tabs/quotes-tab'),
  documents: () => import('./tabs/documents-tab'),
  finance: () => import('./tabs/finance-tab'),
  project: () => import('./tabs/project-tab'),
  followups: () => import('./tabs/followups-tab'),
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

export function PropertyDetailPage({ propertyId }: PropertyDetailPageProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, hasAnyRole } = useAuth();
  const isOrgAdmin = hasAnyRole([...ORG_ADMIN_ROLES]);
  const deletePropertyMutation = useDeleteProperty();
  const deleteConfirmation = useDeleteConfirmation({
    mutation: deletePropertyMutation,
    getId: (item: { id: string }) => item.id,
    onSuccess: () => {
      void router.push(ROUTES.PROPERTIES.LIST);
    },
  });

  const rawTab = searchParams.get('tab');
  const activeTab: PropertyDetailTab = isValidTab(rawTab) ? rawTab : PROPERTY_DETAIL_DEFAULT_TAB;

  const [followupDrawerOpen, setFollowupDrawerOpen] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [markLostOpen, setMarkLostOpen] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);

  const isPropertyIdValid = isValidUuid(propertyId);
  const {
    data: property,
    isLoading: isLoadingProperty,
    error: propertyError,
  } = useProperty(propertyId);

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

  useEffect(() => {
    if (rawTab && !isValidTab(rawTab)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', PROPERTY_DETAIL_DEFAULT_TAB);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [rawTab, pathname, router, searchParams]);

  useEffect(() => {
    if (property && user?.id) {
      const label = getPropertyDisplayName(property);
      recordRecentView(user.id, {
        type: 'property',
        id: property.id,
        label,
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

  const prefetchTab = useCallback((tab: PropertyDetailTab) => {
    void TAB_MODULE_PRELOADERS[tab]?.();
  }, []);

  const handleCreateQuote = (): void => {
    if (customer?.status === CustomerStatus.INACTIVE) {
      showToast.error('Cannot create quote: customer is inactive.');
      return;
    }
    if (lockStatus?.locked) {
      showToast.info('Quote creation is locked for this property.');
      return;
    }
    if (!property) return;
    router.push(`${ROUTES.QUOTES.NEW}?propertyId=${property.id}&customerId=${property.customerId}`);
  };

  const handleGoToProject = (): void => {
    if (!property) return;
    const targetProjectId = property.project?.id ?? property.projectId;
    if (targetProjectId) {
      router.push(buildRoute(ROUTES.PROJECTS.DETAIL, { id: targetProjectId }));
      return;
    }
    router.push(
      `${ROUTES.PROJECTS.NEW}?propertyId=${property.id}&customerId=${property.customerId}`,
    );
  };

  const isInactiveCustomer = customer?.status === CustomerStatus.INACTIVE;
  const pendingFollowups = followupsData?.data ?? [];
  const overdueFollowups = pendingFollowups.filter(
    (f) => new Date(f.scheduledAt).getTime() < Date.now(),
  );
  const nextFollowup = [...pendingFollowups].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  )[0];
  const attentionItems = useMemo(() => {
    const items: { id: string; label: string; tab?: string }[] = [];
    if (overdueFollowups.length > 0) {
      items.push({
        id: 'overdue-followups',
        label: `${overdueFollowups.length} overdue follow-up${overdueFollowups.length > 1 ? 's' : ''}`,
        tab: 'followups',
      });
    }
    if (hasLinkedProject && financeSnapshot.totalOutstanding > 0) {
      items.push({
        id: 'outstanding',
        label: `${formatCurrency(financeSnapshot.totalOutstanding)} outstanding`,
        tab: 'finance',
      });
    }
    return items;
  }, [financeSnapshot.totalOutstanding, hasLinkedProject, overdueFollowups.length]);

  if (!isPropertyIdValid) {
    return (
      <EmptyState
        iconColor="error"
        title="Property not found"
        description="The property ID is invalid."
        action={{ label: 'Back to Properties', onClick: () => router.push(ROUTES.PROPERTIES.LIST) }}
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
        title="Property not found"
        description="The property you're looking for doesn't exist or has been deleted."
        action={{ label: 'Back to Properties', onClick: () => router.push(ROUTES.PROPERTIES.LIST) }}
      />
    );
  }

  const customerName =
    customer?.firstName || customer?.lastName
      ? [customer?.firstName, customer?.lastName].filter(Boolean).join(' ')
      : property.customerName || 'Customer';
  const propertyName = getPropertyDisplayName(property);
  const propertyDeleteReasons = getPropertyDeleteBlockReasons(property, propertyLoan);
  const propertyDeleteDisabled = propertyDeleteReasons.length > 0;
  const propertyDeleteTooltip = formatDeleteBlockTooltip(propertyDeleteReasons);
  const phoneForWhatsApp = customer?.phone ? formatPhoneForWhatsApp(customer.phone) : '';
  const kpiItems = [
    { label: 'Temperature', value: toTitleLabel(property.leadTemperature) },
    {
      label: 'Quote Value',
      value: property.latestQuoteFinalPrice ? formatCurrency(property.latestQuoteFinalPrice) : '—',
    },
    {
      label: 'System Size',
      value: property.latestQuoteSystemSizeKw ? `${property.latestQuoteSystemSizeKw} kW` : '—',
    },
    {
      label: 'Outstanding',
      value: financeLoading
        ? '…'
        : hasLinkedProject
          ? formatCurrency(financeSnapshot.totalOutstanding)
          : '—',
      tone:
        hasLinkedProject && financeSnapshot.totalOutstanding > 0
          ? ('warning' as const)
          : ('default' as const),
    },
    {
      label: 'Next Follow-up',
      value: nextFollowup ? formatDate(nextFollowup.scheduledAt) : '—',
    },
    {
      label: 'Project',
      value: property.project?.name || (property.projectId ? 'Linked' : 'Not linked'),
    },
  ];

  return (
    <Box sx={{ pb: 10 }}>
      <Breadcrumbs aria-label="Breadcrumb" sx={{ mb: 2, fontSize: '0.75rem' }}>
        <MuiLink
          component={NextLink}
          href={ROUTES.PROPERTIES.LIST}
          underline="hover"
          color="inherit"
        >
          Properties
        </MuiLink>
        <Typography color="text.primary" variant="caption">
          {propertyName}
        </Typography>
      </Breadcrumbs>

      <Paper elevation={0} sx={stickyHeaderPaperSx}>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={2}
          alignItems={{ lg: 'center' }}
          justifyContent="space-between"
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="subtitle1" fontWeight={600}>
                {propertyName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {property.propertyCode}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {toTitleLabel(property.status)}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block">
              {[property.address, property.city, property.state, property.pincode]
                .filter(Boolean)
                .join(', ')}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {customerName}
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
            {customer?.phone && (
              <Tooltip title="Call customer">
                <IconButton component="a" href={`tel:${customer.phone}`} size="small">
                  <CallOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {phoneForWhatsApp && (
              <Tooltip title="WhatsApp">
                <IconButton
                  component="a"
                  href={`https://wa.me/${phoneForWhatsApp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                >
                  <WhatsAppIcon className="size-4" />
                </IconButton>
              </Tooltip>
            )}
            {customer?.email && (
              <Tooltip title="Email customer">
                <IconButton component="a" href={`mailto:${customer.email}`} size="small">
                  <EmailOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditOutlinedIcon />}
              onClick={() => router.push(buildRoute(ROUTES.PROPERTIES.EDIT, { id: property.id }))}
            >
              Edit
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddTaskOutlinedIcon />}
              onClick={handleCreateQuote}
              disabled={isInactiveCustomer || lockStatus?.locked}
            >
              Create Quote
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FolderOpenOutlinedIcon />}
              onClick={handleGoToProject}
            >
              {property.project?.id || property.projectId ? 'Go to Project' : 'Convert to Project'}
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<EventNoteOutlinedIcon />}
              onClick={() => setFollowupDrawerOpen(true)}
            >
              Log Follow-up
            </Button>
            <IconButton size="small" onClick={(event) => setMoreAnchor(event.currentTarget)}>
              <MoreVertOutlinedIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

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
          aria-label="Property sections"
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
            '& .Mui-selected': { color: 'primary.main', fontWeight: 600 },
          }}
        >
          {PROPERTY_DETAIL_TABS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              id={`tab-${tab.value}`}
              onMouseEnter={() => prefetchTab(tab.value)}
            />
          ))}
        </Tabs>

        <Box role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
          <Suspense fallback={<TabSkeleton />}>
            {activeTab === 'overview' && (
              <OverviewTab
                property={property}
                customer={customer ?? null}
                financeSnapshot={financeSnapshot}
                financeLoading={financeLoading}
                onLogFollowup={() => setFollowupDrawerOpen(true)}
              />
            )}

            {activeTab === 'quotes' && (
              <QuotesTab
                propertyId={property.id}
                enabled={activeTab === 'quotes'}
                isInactiveCustomer={isInactiveCustomer}
                onCreateQuote={handleCreateQuote}
              />
            )}
            {activeTab === 'documents' && <DocumentsTab propertyId={property.id} />}
            {activeTab === 'finance' && (
              <FinanceTab
                propertyId={property.id}
                projectId={linkedProjectId}
                enabled={activeTab === 'finance'}
              />
            )}
            {activeTab === 'project' && (
              <ProjectTab property={property} enabled={activeTab === 'project'} />
            )}
            {activeTab === 'followups' && (
              <FollowupsTab
                propertyId={property.id}
                enabled={activeTab === 'followups'}
                onLogFollowup={() => setFollowupDrawerOpen(true)}
              />
            )}
            {activeTab === 'activity' && (
              <ActivityTab property={property} enabled={activeTab === 'activity'} />
            )}
          </Suspense>
        </Box>
      </Paper>

      <FollowupDrawer
        open={followupDrawerOpen}
        onClose={() => setFollowupDrawerOpen(false)}
        property={property}
        customerId={property.customerId}
      />
      <MarkAsLostDialog
        open={markLostOpen}
        onClose={() => setMarkLostOpen(false)}
        propertyName={propertyName}
      />

      <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMoreAnchor(null);
            setMarkLostOpen(true);
          }}
        >
          Mark as Lost
        </MenuItem>
        {isOrgAdmin && <Divider />}
        {isOrgAdmin && (
          <Tooltip title={propertyDeleteTooltip ?? ''}>
            <span>
              <MenuItem
                disabled={propertyDeleteDisabled}
                onClick={() => {
                  if (propertyDeleteDisabled) return;
                  setMoreAnchor(null);
                  deleteConfirmation.requestDelete(property);
                }}
                sx={{ color: 'error.main' }}
              >
                <ListItemIcon>
                  <DeleteOutlinedIcon fontSize="small" sx={{ color: 'error.main' }} />
                </ListItemIcon>
                Delete Property
              </MenuItem>
            </span>
          </Tooltip>
        )}
      </Menu>

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        title="Delete Property"
        itemName={propertyName}
        isPending={deleteConfirmation.isPending}
        onCancel={deleteConfirmation.cancel}
        onConfirm={() => void deleteConfirmation.confirm()}
      />

      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <SpeedDial
          ariaLabel="Property actions"
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
              router.push(buildRoute(ROUTES.PROPERTIES.EDIT, { id: property.id }));
            }}
          />
          <SpeedDialAction
            icon={<AddTaskOutlinedIcon />}
            slotProps={{ tooltip: { title: 'Create Quote' } }}
            onClick={() => {
              setSpeedDialOpen(false);
              handleCreateQuote();
            }}
          />
          <SpeedDialAction
            icon={<FolderOpenOutlinedIcon />}
            slotProps={{ tooltip: { title: 'Project' } }}
            onClick={() => {
              setSpeedDialOpen(false);
              handleGoToProject();
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
    </Box>
  );
}
