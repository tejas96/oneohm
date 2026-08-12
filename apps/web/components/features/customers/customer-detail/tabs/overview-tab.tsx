'use client';

import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import { Box, Button, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { FollowupStatus, PropertyStatus } from '@tejas96/shared/types';
import { type JSX, useMemo, useState } from 'react';

import {
  LEAD_SOURCE_LABELS,
  PROPERTY_STATUS_TONE,
  QUOTE_STATUS_TONE,
  type CustomerDetailTab,
} from '../../constants';
import {
  type Customer,
  type CustomerPropertyResponse,
  useAssignCustomer,
  useCustomerFollowups,
} from '../../hooks';
import {
  DetailCard,
  EmptyPane,
  Field,
  FieldGrid,
  IconCircle,
  Mono,
  SectionHeading,
  TonePill,
  TONE_INK,
  type DetailTone,
} from '../primitives';
import { SiteStageBar } from '../site-stage';
import { getBalanceTone, getOverdueAmount, isTabActive } from '../utils';

import { useEmployees } from '@/components/features/employees';
import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { MUIUserAssigneeSelector } from '@/components/ui';
import { useOrgCustomersAr } from '@/lib/hooks/resources';
import { formatCurrency, formatDate, formatSystemSize, toTitleLabel } from '@/lib/utils';

export interface OverviewTabProps {
  customer: Customer;
  properties: CustomerPropertyResponse[];
  customerId: string;
  activeTab: string;
  onTabChange: (tab: CustomerDetailTab) => void;
  onOpenProperty: (propertyId: string) => void;
  onLogFollowup: () => void;
  onAddProperty: () => void;
  isInactive: boolean;
}

const VIEW_ALL_SX = { fontSize: '0.75rem', minWidth: 0, px: 1 } as const;

// ============================================================================
// Assignment
// ============================================================================

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
      <Stack direction="row" alignItems="center" gap={0.5} sx={{ minWidth: 0 }}>
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
          startIcon={<EditOutlinedIcon sx={{ fontSize: 15 }} />}
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

// ============================================================================
// Profile
// ============================================================================

function ProfileCard({ customer }: { customer: Customer }): JSX.Element {
  const leadSourceLabel = customer.leadSource
    ? (LEAD_SOURCE_LABELS[customer.leadSource] ?? customer.leadSource)
    : null;

  const address =
    [customer.address, customer.city, customer.state, customer.pincode]
      .filter(Boolean)
      .join(', ') || '—';

  return (
    <DetailCard>
      <SectionHeading>Profile</SectionHeading>
      <FieldGrid
        fields={[
          { label: 'Phone', value: customer.phone || '—', mono: true },
          { label: 'Alternate phone', value: customer.alternatePhone || '—', mono: true },
          { label: 'Email', value: customer.email || '—', wide: true },
          { label: 'Billing address', value: address, wide: true },
          {
            label: 'Lead source',
            value: leadSourceLabel ? <TonePill label={leadSourceLabel} tone="accent" /> : '—',
          },
          { label: 'Referral code', value: customer.referralCode || '—', mono: true },
          {
            label: 'Customer group',
            value: customer.groupCode
              ? customer.groupName
                ? `${customer.groupName} (${customer.groupCode})`
                : customer.groupCode
              : '—',
            wide: true,
          },
          { label: 'Created by', value: customer.creatorName || 'Self' },
          { label: 'Customer since', value: formatDate(customer.createdAt) },
        ]}
      />

      <Box sx={{ mt: 2.25 }}>
        <Field label="Assigned to" value={<AssigneeField customer={customer} />} />
      </Box>
    </DetailCard>
  );
}

// ============================================================================
// Money
// ============================================================================

interface AgingSegment {
  label: string;
  amount: number;
  tone: DetailTone;
}

/**
 * Receivables, with the ageing profile drawn rather than listed.
 *
 * The card used to show a single "90+ days" figure next to the total, which
 * tells you there is old money but not how much of the debt is old. The bar
 * splits the whole balance across its four buckets, so a healthy balance and
 * a rotten one of the same size no longer look identical.
 */
function MoneyCard({
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

  const segments = useMemo((): AgingSegment[] => {
    if (!aging) return [];
    const buckets: AgingSegment[] = [
      { label: 'Not yet due', amount: aging.current, tone: 'success' },
      { label: '0–30 days', amount: aging.bucket0to30, tone: 'info' },
      { label: '31–60 days', amount: aging.bucket31to60, tone: 'warning' },
      { label: '61–90 days', amount: aging.bucket61to90, tone: 'warning' },
      { label: '90+ days', amount: aging.bucket90plus, tone: 'danger' },
    ];
    return buckets.filter((segment) => segment.amount > 0);
  }, [aging]);

  const segmentTotal = segments.reduce((sum, segment) => sum + segment.amount, 0);

  return (
    <DetailCard>
      <SectionHeading
        action={
          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={onViewFinance}
            sx={VIEW_ALL_SX}
          >
            Finance
          </Button>
        }
      >
        Receivables
      </SectionHeading>

      {isLoading ? (
        <Stack gap={1}>
          <Skeleton height={32} />
          <Skeleton height={24} />
        </Stack>
      ) : !aging ? (
        <EmptyPane
          title="Nothing outstanding"
          description="No open payment terms for this customer."
        />
      ) : (
        <>
          <Stack direction="row" alignItems="flex-end" justifyContent="space-between" gap={2}>
            <Box>
              <Typography
                sx={{
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  color: TONE_INK[getBalanceTone(aging)].ink,
                }}
              >
                {formatCurrency(aging.totalOutstanding)}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'var(--ds-text-secondary)', mt: 0.25 }}>
                across {aging.openTermCount} open term{aging.openTermCount === 1 ? '' : 's'}
                {getOverdueAmount(aging) > 0
                  ? ` · ${formatCurrency(getOverdueAmount(aging))} past due`
                  : ' · all on schedule'}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)' }}>
                Last receipt
              </Typography>
              <Mono>{aging.lastReceiptDate ? formatDate(aging.lastReceiptDate) : '—'}</Mono>
            </Box>
          </Stack>

          {segmentTotal > 0 && (
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" gap={0.375} sx={{ mb: 1 }}>
                {segments.map((segment) => (
                  <Tooltip
                    key={segment.label}
                    title={`${segment.label}: ${formatCurrency(segment.amount)}`}
                  >
                    <Box
                      sx={{
                        flexGrow: segment.amount / segmentTotal,
                        flexBasis: 0,
                        minWidth: 6,
                        height: 8,
                        borderRadius: 'var(--radius-pill)',
                        bgcolor: TONE_INK[segment.tone].ink,
                      }}
                    />
                  </Tooltip>
                ))}
              </Stack>
              <Stack direction="row" flexWrap="wrap" useFlexGap gap={1.25}>
                {segments.map((segment) => (
                  <Stack key={segment.label} direction="row" alignItems="center" gap={0.625}>
                    <Box
                      aria-hidden
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: TONE_INK[segment.tone].ink,
                      }}
                    />
                    <Typography sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-secondary)' }}>
                      {segment.label}
                    </Typography>
                    <Mono sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)' }}>
                      {formatCurrency(segment.amount)}
                    </Mono>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </>
      )}
    </DetailCard>
  );
}

// ============================================================================
// Sites
// ============================================================================

function SiteRow({
  property,
  onOpen,
}: {
  property: CustomerPropertyResponse;
  onOpen: () => void;
}): JSX.Element {
  const statusTone = PROPERTY_STATUS_TONE[property.status] ?? 'neutral';
  const quoteStatus = property.latestQuoteStatus;
  const quoteTone: DetailTone = quoteStatus
    ? (QUOTE_STATUS_TONE[quoteStatus] ?? 'neutral')
    : 'neutral';

  const meta = [
    property.city,
    toTitleLabel(property.propertyType),
    property.latestQuoteSystemSizeKw
      ? `${formatSystemSize(property.latestQuoteSystemSizeKw)} kW`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Box
      component="button"
      type="button"
      onClick={onOpen}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 160px' },
        alignItems: 'center',
        gap: { xs: 1.25, sm: 2 },
        width: '100%',
        textAlign: 'left',
        p: 1.25,
        border: 'none',
        borderRadius: 'var(--radius-rf-md)',
        bgcolor: 'transparent',
        cursor: 'pointer',
        font: 'inherit',
        transition: 'background-color 120ms var(--ease-standard)',
        '&:hover': { bgcolor: 'var(--ds-canvas-sunken)' },
        '&:focus-visible': { outline: '2px solid var(--ds-accent)', outlineOffset: -2 },
      }}
    >
      <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0 }}>
        <IconCircle tone={statusTone}>
          <HomeWorkOutlinedIcon />
        </IconCircle>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={0.75} sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--ds-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {getPropertyDisplayName(property)}
            </Typography>
            {property.isPrimary && <TonePill label="Primary" tone="accent" />}
          </Stack>
          <Typography
            sx={{
              fontSize: '0.6875rem',
              color: 'var(--ds-text-tertiary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {meta || '—'}
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ minWidth: 0 }}>
        <SiteStageBar property={property} />
        {quoteStatus && (
          <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 0.625 }}>
            <TonePill label={toTitleLabel(quoteStatus)} tone={quoteTone} />
            {property.latestQuoteFinalPrice ? (
              <Mono sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-secondary)' }}>
                {formatCurrency(property.latestQuoteFinalPrice)}
              </Mono>
            ) : null}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function SitesCard({
  properties,
  onOpenProperty,
  onViewAll,
  onAddProperty,
  isInactive,
}: {
  properties: CustomerPropertyResponse[];
  onOpenProperty: (propertyId: string) => void;
  onViewAll: () => void;
  onAddProperty: () => void;
  isInactive: boolean;
}): JSX.Element {
  /** Sites in play first — a converted site needs no attention on an overview. */
  const ordered = useMemo(() => {
    return [...properties].sort((a, b) => {
      const aDone = a.status === PropertyStatus.CONVERTED ? 1 : 0;
      const bDone = b.status === PropertyStatus.CONVERTED ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return Number(b.isPrimary) - Number(a.isPrimary);
    });
  }, [properties]);

  const visible = ordered.slice(0, 4);

  return (
    <DetailCard>
      <SectionHeading
        count={properties.length}
        action={
          properties.length > visible.length ? (
            <Button size="small" onClick={onViewAll} sx={VIEW_ALL_SX}>
              View all
            </Button>
          ) : undefined
        }
      >
        Sites
      </SectionHeading>

      {visible.length === 0 ? (
        <EmptyPane
          icon={<HomeWorkOutlinedIcon />}
          title="No sites yet"
          description="Add the first installation site to start this customer's pipeline."
          action={
            <Button
              size="small"
              variant="contained"
              startIcon={<AddBusinessOutlinedIcon />}
              onClick={onAddProperty}
              disabled={isInactive}
            >
              Add site
            </Button>
          }
        />
      ) : (
        <Stack gap={0.25} sx={{ mx: -1.25 }}>
          {visible.map((property) => (
            <SiteRow
              key={property.id}
              property={property}
              onOpen={() => onOpenProperty(property.id)}
            />
          ))}
        </Stack>
      )}
    </DetailCard>
  );
}

// ============================================================================
// Follow-ups
// ============================================================================

function FollowupsCard({
  customerId,
  enabled,
  onLogFollowup,
  onViewAll,
}: {
  customerId: string;
  enabled: boolean;
  onLogFollowup: () => void;
  onViewAll: () => void;
}): JSX.Element {
  const { data, isLoading } = useCustomerFollowups(customerId, {
    enabled,
    status: FollowupStatus.PENDING,
    limit: 5,
  });
  const followups = data?.data ?? [];

  return (
    <DetailCard>
      <SectionHeading
        count={followups.length || undefined}
        action={
          <Button
            size="small"
            startIcon={<EventNoteOutlinedIcon sx={{ fontSize: 15 }} />}
            onClick={onLogFollowup}
            sx={VIEW_ALL_SX}
          >
            Schedule
          </Button>
        }
      >
        Upcoming follow-ups
      </SectionHeading>

      {isLoading ? (
        <Stack gap={1}>
          <Skeleton height={34} />
          <Skeleton height={34} />
        </Stack>
      ) : followups.length === 0 ? (
        <EmptyPane
          icon={<EventNoteOutlinedIcon />}
          title="Nothing scheduled"
          description="Book the next conversation so this customer doesn't go quiet."
        />
      ) : (
        <Stack gap={1.5}>
          {followups.map((followup) => {
            const isOverdue = new Date(followup.scheduledAt).getTime() < Date.now();
            const scope = followup.property
              ? getPropertyDisplayName(followup.property as CustomerPropertyResponse)
              : 'Customer-level';
            return (
              <Stack key={followup.id} direction="row" gap={1.25} sx={{ minWidth: 0 }}>
                <IconCircle tone={isOverdue ? 'danger' : 'info'} size={28}>
                  <EventNoteOutlinedIcon />
                </IconCircle>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      color: 'var(--ds-text-primary)',
                      lineHeight: 1.35,
                    }}
                  >
                    {followup.subject}
                  </Typography>
                  <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap" useFlexGap>
                    <Mono
                      sx={{
                        fontSize: '0.6875rem',
                        color: isOverdue ? TONE_INK.danger.ink : 'var(--ds-text-tertiary)',
                        fontWeight: isOverdue ? 600 : 400,
                      }}
                    >
                      {formatDate(followup.scheduledAt)}
                    </Mono>
                    <Typography sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)' }}>
                      {toTitleLabel(followup.type)} · {scope}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            );
          })}
          <Button size="small" onClick={onViewAll} sx={{ alignSelf: 'flex-start', ...VIEW_ALL_SX }}>
            View all follow-ups
          </Button>
        </Stack>
      )}
    </DetailCard>
  );
}

// ============================================================================
// Tab
// ============================================================================

export function OverviewTab({
  customer,
  properties,
  customerId,
  activeTab,
  onTabChange,
  onOpenProperty,
  onLogFollowup,
  onAddProperty,
  isInactive,
}: OverviewTabProps): JSX.Element {
  const isOverviewActive = isTabActive(activeTab, 'overview');

  return (
    <Box
      sx={{
        display: 'grid',
        /*
         * Splits at `md`, not `lg`. At 1200 a 1130px-wide laptop still got the
         * stacked layout, which put a tall contact card above the money and the
         * sites — the two things this tab exists to show.
         */
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 320px) minmax(0, 1fr)' },
        gap: 2,
        alignItems: 'start',
      }}
    >
      {/*
       * And when it does stack, the profile drops to the bottom. A phone number
       * is reference material; what someone opens this tab for is what is owed
       * and what is in flight.
       */}
      <Box sx={{ minWidth: 0, order: { xs: 2, md: 1 } }}>
        <ProfileCard customer={customer} />
      </Box>

      <Stack gap={2} sx={{ minWidth: 0, order: { xs: 1, md: 2 } }}>
        <MoneyCard
          customerId={customerId}
          enabled={isOverviewActive}
          onViewFinance={() => onTabChange('finance')}
        />
        <SitesCard
          properties={properties}
          onOpenProperty={onOpenProperty}
          onViewAll={() => onTabChange('properties')}
          onAddProperty={onAddProperty}
          isInactive={isInactive}
        />
        <FollowupsCard
          customerId={customerId}
          enabled={isOverviewActive}
          onLogFollowup={onLogFollowup}
          onViewAll={() => onTabChange('followups')}
        />
      </Stack>
    </Box>
  );
}
