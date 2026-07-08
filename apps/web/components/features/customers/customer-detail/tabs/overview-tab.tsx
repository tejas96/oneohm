'use client';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Link as MuiLink,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { FollowupStatus, ServiceRequestStatus } from '@tejas96/shared/types';
import { type JSX, useMemo, useState } from 'react';

import { LEAD_SOURCE_LABELS, type CustomerDetailTab } from '../../constants';
import {
  type Customer,
  type CustomerPropertyResponse,
  useAssignCustomer,
  useCustomerFollowups,
  useCustomerServiceRequests,
} from '../../hooks';
import { isTabActive } from '../utils';

import { useEmployees } from '@/components/features/employees';
import { PropertyPipelineStrip } from '@/components/features/properties/property-detail/pipeline-strip';
import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { MUIUserAssigneeSelector } from '@/components/ui';
import { useOrgCustomersAr } from '@/lib/hooks/resources';
import { formatCurrency, formatDate, toTitleLabel } from '@/lib/utils';

const OPEN_SERVICE_STATUSES: ServiceRequestStatus[] = [
  ServiceRequestStatus.OPEN,
  ServiceRequestStatus.ASSIGNED,
  ServiceRequestStatus.IN_PROGRESS,
  ServiceRequestStatus.ON_HOLD,
];

export interface OverviewTabProps {
  customer: Customer;
  properties: CustomerPropertyResponse[];
  customerId: string;
  activeTab: string;
  onTabChange: (tab: CustomerDetailTab) => void;
  onOpenProperty: (propertyId: string) => void;
  onLogFollowup: () => void;
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Card variant="outlined" sx={{ borderRadius: 1, height: '100%' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Typography variant="subtitle2" fontWeight={600}>
            {title}
          </Typography>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function AssigneeField({ customer }: { customer: Customer }): JSX.Element {
  const [pickerActive, setPickerActive] = useState(false);
  const assignMutation = useAssignCustomer();
  const { data: employees = [], isLoading } = useEmployees({ enabled: pickerActive });

  const options = employees.map((employee) => ({
    id: employee.userId,
    displayName: [employee.user?.firstName, employee.user?.lastName].filter(Boolean).join(' '),
  }));

  if (!pickerActive) {
    return (
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <MUIUserAssigneeSelector
          value={customer.assigneeId ?? null}
          readOnly
          placeholder="Unassigned"
          triggerMinWidth={0}
          options={
            customer.assigneeId && customer.assigneeName
              ? [{ id: customer.assigneeId, displayName: customer.assigneeName }]
              : []
          }
        />
        <Button
          size="small"
          variant="text"
          startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={() => setPickerActive(true)}
          sx={{ minWidth: 0, px: 0.5, fontSize: '0.75rem' }}
        >
          Change
        </Button>
      </Stack>
    );
  }

  return (
    <MUIUserAssigneeSelector
      value={customer.assigneeId ?? null}
      onChange={(assigneeId) => {
        assignMutation.mutate({ id: customer.id, assigneeId });
      }}
      options={options}
      optionsLoading={isLoading}
      loading={assignMutation.isPending}
      allowUnassign
      placeholder="Unassigned"
      triggerMinWidth={0}
    />
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  const isPlainText = typeof value === 'string' || typeof value === 'number';

  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.625rem' }}
      >
        {label}
      </Typography>
      {isPlainText ? (
        <Typography variant="body2" sx={{ mt: 0.25 }}>
          {value}
        </Typography>
      ) : (
        <Box sx={{ mt: 0.25, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
          {value}
        </Box>
      )}
    </Box>
  );
}

function ContactCard({ customer }: { customer: Customer }): JSX.Element {
  const leadSourceLabel = customer.leadSource
    ? (LEAD_SOURCE_LABELS[customer.leadSource] ?? customer.leadSource)
    : 'Not specified';

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: 'Phone', value: customer.phone || '—' },
    { label: 'Email', value: customer.email || '—' },
    { label: 'Alternate Phone', value: customer.alternatePhone || '—' },
    {
      label: 'Billing Address',
      value: customer.address || '—',
    },
    {
      label: 'City / State / PIN',
      value: [customer.city, customer.state, customer.pincode].filter(Boolean).join(', ') || '—',
    },
    {
      label: 'Lead Source',
      value: <Chip label={leadSourceLabel} size="small" color="primary" />,
    },
    ...(customer.referralCode ? [{ label: 'Referral Code', value: customer.referralCode }] : []),
    ...(customer.groupCode
      ? [
          {
            label: 'Customer Group',
            value: customer.groupName
              ? `${customer.groupName} (${customer.groupCode})`
              : customer.groupCode,
          },
        ]
      : []),
    { label: 'Created By', value: customer.creatorName || 'Self' },
    { label: 'Status', value: toTitleLabel(customer.status) },
    { label: 'Customer Since', value: formatDate(customer.createdAt) },
  ];

  return (
    <SectionCard title="Contact & Profile">
      <Stack spacing={1.25} divider={<Divider flexItem />}>
        {fields.map((field) => (
          <FieldRow key={field.label} label={field.label} value={field.value} />
        ))}
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.625rem' }}
          >
            Assigned To
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <AssigneeField customer={customer} />
          </Box>
        </Box>
      </Stack>
    </SectionCard>
  );
}

function FinancialSnapshot({
  customerId,
  enabled,
  onViewFinance,
}: {
  customerId: string;
  enabled: boolean;
  onViewFinance: () => void;
}): JSX.Element {
  const { data: arRows, isLoading } = useOrgCustomersAr(undefined, { enabled });
  const aging = useMemo(
    () => arRows?.find((row) => row.customerId === customerId),
    [arRows, customerId],
  );

  return (
    <SectionCard
      title="Financial Snapshot"
      action={
        <Button size="small" endIcon={<ArrowForwardIcon />} onClick={onViewFinance}>
          Finance
        </Button>
      }
    >
      {isLoading ? (
        <Stack spacing={1}>
          <Skeleton height={28} />
          <Skeleton height={28} />
        </Stack>
      ) : !aging ? (
        <Typography variant="body2" color="text.secondary">
          No outstanding receivables on record.
        </Typography>
      ) : (
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Total Outstanding
            </Typography>
            <Typography variant="body1" fontWeight={600} color="warning.dark">
              {formatCurrency(aging.totalOutstanding)}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Open Terms
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              {aging.openTermCount}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Last Receipt
            </Typography>
            <Typography variant="body2">
              {aging.lastReceiptDate ? formatDate(aging.lastReceiptDate) : '—'}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="caption" color="text.secondary">
              90+ Days
            </Typography>
            <Typography
              variant="body2"
              color={aging.bucket90plus > 0 ? 'error.main' : 'text.primary'}
            >
              {formatCurrency(aging.bucket90plus)}
            </Typography>
          </Grid>
        </Grid>
      )}
    </SectionCard>
  );
}

export function OverviewTab({
  customer,
  properties,
  customerId,
  activeTab,
  onTabChange,
  onOpenProperty,
  onLogFollowup,
}: OverviewTabProps): JSX.Element {
  const isOverviewActive = isTabActive(activeTab, 'overview');
  const topProperties = properties.slice(0, 3);

  const { data: followupsData, isLoading: followupsLoading } = useCustomerFollowups(customerId, {
    enabled: isOverviewActive,
    status: FollowupStatus.PENDING,
    limit: 5,
  });
  const pendingFollowups = followupsData?.data ?? [];

  const { data: serviceRequests, isLoading: serviceLoading } = useCustomerServiceRequests(
    customerId,
    { enabled: isOverviewActive },
  );
  const openTickets = useMemo(
    () =>
      (serviceRequests ?? []).filter((request) => OPEN_SERVICE_STATUSES.includes(request.status)),
    [serviceRequests],
  );

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <ContactCard customer={customer} />
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2}>
            <FinancialSnapshot
              customerId={customerId}
              enabled={isOverviewActive}
              onViewFinance={() => onTabChange('finance')}
            />

            <SectionCard
              title="Property Pipeline"
              action={
                properties.length > 3 ? (
                  <Button size="small" onClick={() => onTabChange('properties')}>
                    View all
                  </Button>
                ) : undefined
              }
            >
              {topProperties.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No properties yet. Add a property to start the pipeline.
                </Typography>
              ) : (
                <Stack spacing={1.5} divider={<Divider flexItem />}>
                  {topProperties.map((property) => (
                    <Box
                      key={property.id}
                      onClick={() => onOpenProperty(property.id)}
                      sx={{ cursor: 'pointer', '&:hover': { opacity: 0.85 } }}
                    >
                      <PropertyPipelineStrip property={property} />
                    </Box>
                  ))}
                </Stack>
              )}
            </SectionCard>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, lg: 6 }}>
                <SectionCard
                  title="Upcoming Follow-ups"
                  action={
                    <Button
                      size="small"
                      startIcon={<EventNoteOutlinedIcon />}
                      onClick={onLogFollowup}
                    >
                      Schedule
                    </Button>
                  }
                >
                  {followupsLoading ? (
                    <Stack spacing={1}>
                      <Skeleton height={36} />
                      <Skeleton height={36} />
                    </Stack>
                  ) : pendingFollowups.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No pending follow-ups.
                    </Typography>
                  ) : (
                    <Stack spacing={1} divider={<Divider flexItem />}>
                      {pendingFollowups.map((followup) => (
                        <Box key={followup.id}>
                          <Typography variant="body2" fontWeight={500}>
                            {followup.subject}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(followup.scheduledAt)} · {toTitleLabel(followup.type)}
                            {followup.property
                              ? ` · ${getPropertyDisplayName(followup.property as CustomerPropertyResponse)}`
                              : ' · Customer-level'}
                          </Typography>
                        </Box>
                      ))}
                      <Button size="small" onClick={() => onTabChange('followups')}>
                        View all follow-ups
                      </Button>
                    </Stack>
                  )}
                </SectionCard>
              </Grid>

              <Grid size={{ xs: 12, lg: 6 }}>
                <SectionCard
                  title="Open Service Tickets"
                  action={
                    <Button size="small" onClick={() => onTabChange('service')}>
                      View service
                    </Button>
                  }
                >
                  {serviceLoading ? (
                    <Stack spacing={1}>
                      <Skeleton height={36} />
                      <Skeleton height={36} />
                    </Stack>
                  ) : openTickets.length === 0 ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <SupportAgentOutlinedIcon fontSize="small" color="disabled" />
                      <Typography variant="body2" color="text.secondary">
                        No open service tickets.
                      </Typography>
                    </Stack>
                  ) : (
                    <Stack spacing={1} divider={<Divider flexItem />}>
                      {openTickets.slice(0, 5).map((ticket) => (
                        <Box key={ticket.id}>
                          <Typography variant="body2" fontWeight={500}>
                            {ticket.issueTitle}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {ticket.requestNumber} · {toTitleLabel(ticket.status)} ·{' '}
                            {toTitleLabel(ticket.priority)}
                          </Typography>
                        </Box>
                      ))}
                      {openTickets.length > 5 && (
                        <MuiLink
                          component="button"
                          variant="body2"
                          onClick={() => onTabChange('service')}
                          sx={{ textAlign: 'left' }}
                        >
                          +{openTickets.length - 5} more open tickets
                        </MuiLink>
                      )}
                    </Stack>
                  )}
                </SectionCard>
              </Grid>
            </Grid>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
