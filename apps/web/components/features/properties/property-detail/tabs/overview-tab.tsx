'use client';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import TravelExploreOutlinedIcon from '@mui/icons-material/TravelExploreOutlined';
import { Box, Button, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import {
  ChangeRequestStatus,
  FollowupStatus,
  LeadTemperature,
  PropertyStatus,
  QuoteStatus,
  SiteStatus,
} from '@tejas96/shared/types';
import { useState, type JSX, type ReactNode } from 'react';

import {
  LEAD_TEMPERATURE_CONFIG,
  LEAD_TEMPERATURE_TONE,
  PROPERTY_TYPE_LABELS,
  type PropertyDetailTab,
} from '../../constants';
import {
  useCancelPropertySiteActivity,
  useCompletePropertySurvey,
  useCompletePropertyVisit,
  usePropertyFinanceSnapshot,
  usePropertyFollowups,
  usePropertyQuoteSummary,
  useUpdateProperty,
  type CustomerPropertyResponse,
} from '../../hooks';
import {
  getChangeRequestLabel,
  formatChangeRequestSummary,
} from '../../utils/change-request-display';
import { EditSiteDataModal } from '../components/edit-site-data-modal';

import { getSiteLifecycle, QUOTE_STATUS_TONE } from '@/components/features/customers/constants';
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
} from '@/components/features/customers/customer-detail/primitives';
import { SiteStageBar } from '@/components/features/customers/customer-detail/site-stage';
import { followupDueTone } from '@/components/features/followups';
import { showToast } from '@/components/ui';
import { useAccessDialog, useCan, useGatedAction } from '@/lib/rbac';
import { formatCurrency, formatDate, formatFollowupWhen, toTitleLabel } from '@/lib/utils';

export interface OverviewTabProps {
  /**
   * Enriched by the page with the `latestQuote*` fields — the single-site
   * endpoint omits them, and `SiteStageBar` reads them to place the site on
   * its rail.
   */
  property: CustomerPropertyResponse;
  enabled: boolean;
  onTabChange: (tab: PropertyDetailTab) => void;
  onLogFollowup: () => void;
  onCreateQuote: () => void;
  onGoToProject: () => void;
  isInactiveCustomer: boolean;
  quoteLocked: boolean;
  onViewFollowup: (followupId: string) => void;
}

const VIEW_ALL_SX = { fontSize: '0.75rem', minWidth: 0, px: 1 } as const;

/** Statuses where the site is still being worked, so temperature still means something. */
const IN_PLAY_STATUSES: readonly PropertyStatus[] = [
  PropertyStatus.ACTIVE,
  PropertyStatus.PENDING_VERIFICATION,
];

// ============================================================================
// Site profile
// ============================================================================

function LeadTemperatureControl({ property }: { property: CustomerPropertyResponse }): JSX.Element {
  const updateProperty = useUpdateProperty();
  // These chips look like a filter but each one PATCHes the property, so they
  // are an edit and need the edit permission.
  const { can } = useCan();
  const { requestAccess } = useAccessDialog();
  const canEdit = can('properties.edit');

  return (
    <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
      {(Object.keys(LEAD_TEMPERATURE_CONFIG) as LeadTemperature[]).map((temperature) => {
        const active = property.leadTemperature === temperature;
        const tone = LEAD_TEMPERATURE_TONE[temperature] ?? 'neutral';
        const { ink, tint } = TONE_INK[tone];
        return (
          <Box
            key={temperature}
            component="button"
            type="button"
            disabled={updateProperty.isPending}
            aria-disabled={!canEdit}
            onClick={() => {
              if (!canEdit) {
                requestAccess('properties.edit', 'Change lead temperature');
                return;
              }
              if (active || updateProperty.isPending) return;
              updateProperty.mutate({ id: property.id, data: { leadTemperature: temperature } });
            }}
            sx={{
              px: 1.25,
              height: 26,
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              font: 'inherit',
              fontSize: '0.75rem',
              fontWeight: active ? 700 : 500,
              cursor: updateProperty.isPending ? 'default' : 'pointer',
              bgcolor: active ? ink : tint,
              color: active ? 'var(--ds-primary-contrast)' : ink,
              transition: 'filter 120ms var(--ease-standard)',
              '&:hover:not(:disabled)': { filter: 'brightness(0.95)' },
              '&:focus-visible': { outline: '2px solid var(--ds-accent)', outlineOffset: 2 },
            }}
          >
            {LEAD_TEMPERATURE_CONFIG[temperature].label}
          </Box>
        );
      })}
    </Stack>
  );
}

function SiteProfileCard({ property }: { property: CustomerPropertyResponse }): JSX.Element {
  const address =
    [property.address, property.city, property.state, property.pincode]
      .filter(Boolean)
      .join(', ') || '—';
  const isInPlay = IN_PLAY_STATUSES.includes(property.status);
  // The site's own status stops at "Converted" for life; once a project
  // exists, its state is what this site is actually doing.
  const siteLifecycle = getSiteLifecycle(property);

  return (
    <DetailCard>
      <SectionHeading>Site profile</SectionHeading>
      <FieldGrid
        fields={[
          { label: 'Site name', value: property.propertyName || '—' },
          { label: 'Site code', value: property.propertyCode || '—', mono: true },
          {
            label: 'Type',
            value:
              PROPERTY_TYPE_LABELS[property.propertyType] ?? toTitleLabel(property.propertyType),
          },
          {
            label: 'Status',
            value: <TonePill label={siteLifecycle.label} tone={siteLifecycle.tone} dot />,
          },
          { label: 'Address', value: address, wide: true },
          { label: 'Added by', value: property.creatorName || '—' },
          { label: 'Added on', value: formatDate(property.createdAt) },
          ...(property.notes ? [{ label: 'Notes', value: property.notes, wide: true }] : []),
        ]}
      />

      {/*
       * Temperature is an editable control, not a read-only field — it is the
       * one property attribute a rep changes from this page daily. It is
       * hidden once the site is converted or lost, where it means nothing.
       */}
      {isInPlay && (
        <Box sx={{ mt: 2.25 }}>
          <Field label="Lead temperature" value={<LeadTemperatureControl property={property} />} />
        </Box>
      )}
    </DetailCard>
  );
}

// ============================================================================
// Electricity connection
// ============================================================================

function ConnectionCard({ property }: { property: CustomerPropertyResponse }): JSX.Element {
  const pendingChangeRequests = (property.changeRequests ?? []).filter(
    (request) => request.status === ChangeRequestStatus.PENDING,
  );

  return (
    <DetailCard>
      <SectionHeading>Electricity connection</SectionHeading>
      <FieldGrid
        fields={[
          { label: 'DISCOM', value: property.discom?.label || '—', wide: true },
          { label: 'Consumer number', value: property.consumerNumber || '—', mono: true },
          { label: 'Consumer name', value: property.consumerName || '—' },
          {
            label: 'Connection',
            value: property.connectionType ? toTitleLabel(property.connectionType) : '—',
          },
          {
            label: 'Sanctioned load',
            value: property.sanctionedLoad != null ? `${property.sanctionedLoad} kW` : '—',
            mono: true,
          },
          { label: 'Current load', value: property.currentLoad || '—', mono: true },
          { label: 'Meter number', value: property.meterNumber || '—', mono: true },
        ]}
      />

      {/*
       * Pending DISCOM change requests were captured at onboarding and then
       * never shown anywhere on this page — yet a pending load change is
       * exactly what blocks a connection from being commissioned.
       */}
      {pendingChangeRequests.length > 0 && (
        <Box sx={{ mt: 2.25 }}>
          <Field
            label={`Pending DISCOM requests (${pendingChangeRequests.length})`}
            value={
              <Stack gap={0.75} sx={{ width: '100%' }}>
                {pendingChangeRequests.map((request, index) => (
                  <Stack
                    key={`${request.type}-${index}`}
                    direction="row"
                    alignItems="center"
                    gap={0.75}
                    sx={{ minWidth: 0 }}
                  >
                    <TonePill label={getChangeRequestLabel(request.type)} tone="warning" dot />
                    <Typography
                      sx={{ fontSize: '0.75rem', color: 'var(--ds-text-secondary)', minWidth: 0 }}
                    >
                      {formatChangeRequestSummary(request)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            }
          />
        </Box>
      )}
    </DetailCard>
  );
}

// ============================================================================
// Journey
// ============================================================================

interface Milestone {
  label: string;
  detail: string;
  done: boolean;
  tone: DetailTone;
}

/**
 * Where the site has got to, and what closes the next gap.
 *
 * Replaces the chip chain that used to live here, which spent a full row of
 * width announcing what had *not* happened ("No quote → No project yet") and,
 * because it read `latestQuoteStatus` — a field the single-site endpoint never
 * returns — said "No quote" on sites holding an accepted one.
 */
function JourneyCard({
  property,
  quoteSummary,
  onCreateQuote,
  onGoToProject,
  onViewQuotes,
  isInactiveCustomer,
  quoteLocked,
}: {
  property: CustomerPropertyResponse;
  quoteSummary: ReturnType<typeof usePropertyQuoteSummary>;
  onCreateQuote: () => void;
  onGoToProject: () => void;
  onViewQuotes: () => void;
  isInactiveCustomer: boolean;
  quoteLocked: boolean;
}): JSX.Element {
  const headline = quoteSummary.headline;
  const hasProject = Boolean(property.project?.id ?? property.projectId);
  const isLost = property.status === PropertyStatus.LOST;

  const milestones: Milestone[] = [
    {
      label: 'Site captured',
      detail: formatDate(property.createdAt),
      done: true,
      tone: 'success',
    },
    {
      label: 'Site visit',
      detail: property.siteVisitDone
        ? property.siteVisitCompletedAt
          ? formatDate(property.siteVisitCompletedAt)
          : 'Completed'
        : 'Not done',
      done: property.siteVisitDone,
      tone: property.siteVisitDone ? 'success' : 'neutral',
    },
    {
      label: 'Technical survey',
      detail: property.surveyDone
        ? property.siteSurveyCompletedAt
          ? formatDate(property.siteSurveyCompletedAt)
          : 'Completed'
        : 'Not done',
      done: property.surveyDone,
      tone: property.surveyDone ? 'success' : 'neutral',
    },
    {
      label: 'Quote',
      detail: headline
        ? `${headline.quoteNumber} · ${toTitleLabel(headline.status)}`
        : 'None raised',
      done: Boolean(headline),
      tone: headline ? (QUOTE_STATUS_TONE[headline.status] ?? 'neutral') : 'neutral',
    },
    {
      label: 'Project',
      detail: hasProject ? (property.project?.name ?? 'Linked') : 'Not converted',
      done: hasProject,
      tone: hasProject ? 'success' : 'neutral',
    },
  ];

  /** The single next thing to do, rather than five chips of state. */
  const nextAction = ((): { label: string; onClick: () => void; disabled?: boolean } | null => {
    if (isLost || hasProject) return null;
    if (!headline) {
      return {
        label: 'Create the first quote',
        onClick: onCreateQuote,
        disabled: isInactiveCustomer || quoteLocked,
      };
    }
    if (headline.status === QuoteStatus.ACCEPTED) {
      return { label: 'Convert to project', onClick: onGoToProject };
    }
    return { label: 'Review quotes', onClick: onViewQuotes };
  })();

  return (
    <DetailCard>
      <SectionHeading>Journey</SectionHeading>

      <SiteStageBar property={property} />

      <Box
        sx={{
          mt: 2.25,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(150px, 1fr))' },
          gap: 1.5,
        }}
      >
        {milestones.map((milestone) => (
          <Stack key={milestone.label} direction="row" gap={1} sx={{ minWidth: 0 }}>
            <IconCircle tone={milestone.tone} size={28}>
              {milestone.done ? <CheckCircleOutlinedIcon /> : <RadioButtonUncheckedIcon />}
            </IconCircle>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)', lineHeight: 1.4 }}
              >
                {milestone.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: milestone.done ? 600 : 400,
                  color: milestone.done ? 'var(--ds-text-primary)' : 'var(--ds-text-tertiary)',
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={milestone.detail}
              >
                {milestone.detail}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Box>

      {nextAction && (
        <Button
          size="small"
          variant="outlined"
          endIcon={<ArrowForwardIcon />}
          onClick={nextAction.onClick}
          disabled={nextAction.disabled}
          sx={{ mt: 2.25 }}
        >
          {nextAction.label}
        </Button>
      )}
    </DetailCard>
  );
}

// ============================================================================
// Money
// ============================================================================

function MoneyCard({
  projectId,
  enabled,
  onViewFinance,
}: {
  projectId: string | null;
  enabled: boolean;
  onViewFinance: () => void;
}): JSX.Element {
  const { snapshot, isLoading, hasProject } = usePropertyFinanceSnapshot(projectId, { enabled });

  const tone: DetailTone =
    snapshot.maxDaysOverdue > 90
      ? 'danger'
      : snapshot.overdueAmount > 0
        ? 'warning'
        : snapshot.totalOutstanding > 0
          ? 'neutral'
          : 'success';

  return (
    <DetailCard>
      <SectionHeading
        action={
          hasProject ? (
            <Button
              size="small"
              endIcon={<ArrowForwardIcon />}
              onClick={onViewFinance}
              sx={VIEW_ALL_SX}
            >
              Finance
            </Button>
          ) : undefined
        }
      >
        Money
      </SectionHeading>

      {!hasProject ? (
        <EmptyPane
          title="No receivables yet"
          description="Payment terms are created when this site is converted to a project."
        />
      ) : isLoading ? (
        <Stack gap={1}>
          <Skeleton height={32} />
          <Skeleton height={24} />
        </Stack>
      ) : (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          gap={{ xs: 2, sm: 3 }}
          justifyContent="space-between"
        >
          <Box>
            <Typography
              sx={{
                fontFamily: 'var(--font-mono)',
                fontVariantNumeric: 'tabular-nums',
                fontSize: '1.5rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                color: TONE_INK[tone].ink,
              }}
            >
              {formatCurrency(snapshot.totalOutstanding)}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'var(--ds-text-secondary)', mt: 0.25 }}>
              outstanding across {snapshot.openTermCount} open term
              {snapshot.openTermCount === 1 ? '' : 's'}
            </Typography>
            {snapshot.overdueAmount > 0 && (
              <Typography
                sx={{ fontSize: '0.75rem', fontWeight: 600, color: TONE_INK[tone].ink, mt: 0.5 }}
              >
                {formatCurrency(snapshot.overdueAmount)} past due · {snapshot.maxDaysOverdue}d
              </Typography>
            )}
          </Box>

          <Stack gap={1.5} sx={{ flexShrink: 0 }}>
            <Field
              label="Received"
              value={<Mono emphasis>{formatCurrency(snapshot.receivedAmount)}</Mono>}
            />
            <Field
              label="Last receipt"
              value={
                <Mono>{snapshot.lastReceiptDate ? formatDate(snapshot.lastReceiptDate) : '—'}</Mono>
              }
            />
          </Stack>
        </Stack>
      )}
    </DetailCard>
  );
}

// ============================================================================
// Site readiness
// ============================================================================

function ReadinessStep({
  index,
  title,
  done,
  disabled,
  facts,
  action,
}: {
  index: number;
  title: string;
  done: boolean;
  disabled?: boolean;
  facts: { label: string; value: string }[];
  action?: ReactNode;
}): JSX.Element {
  const tone: DetailTone = done ? 'success' : disabled ? 'neutral' : 'info';

  return (
    <Stack direction="row" gap={1.25} sx={{ minWidth: 0 }}>
      <IconCircle tone={tone} size={32}>
        {done ? (
          <CheckCircleOutlinedIcon />
        ) : index === 1 ? (
          <TravelExploreOutlinedIcon />
        ) : (
          <FactCheckOutlinedIcon />
        )}
      </IconCircle>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" useFlexGap>
          <Typography
            sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ds-text-primary)' }}
          >
            {index}. {title}
          </Typography>
          <TonePill label={done ? 'Done' : 'Pending'} tone={tone} dot />
        </Stack>
        {facts.length > 0 && (
          <Box
            sx={{
              mt: 1,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              columnGap: 2,
              rowGap: 1,
            }}
          >
            {facts.map((fact) => (
              <Field key={fact.label} label={fact.label} value={fact.value} />
            ))}
          </Box>
        )}
        {action && <Box sx={{ mt: 1.25 }}>{action}</Box>}
      </Box>
    </Stack>
  );
}

function ReadinessCard({ property }: { property: CustomerPropertyResponse }): JSX.Element {
  const completeVisit = useCompletePropertyVisit();
  const completeSurvey = useCompletePropertySurvey();
  const cancelActivity = useCancelPropertySiteActivity();
  const [editOpen, setEditOpen] = useState(false);

  const isPending = completeVisit.isPending || completeSurvey.isPending || cancelActivity.isPending;
  const isCancelled = property.siteStatus === SiteStatus.CANCELLED;
  // Site readiness actions all change the property record.
  const editSite = useGatedAction('properties.edit', () => setEditOpen(true), 'Edit site data');
  const markVisit = useGatedAction(
    'properties.edit',
    () => completeVisit.mutate(property.id),
    'Mark visit complete',
  );
  const markSurvey = useGatedAction(
    'properties.edit',
    () => handleCompleteSurvey(),
    'Mark survey complete',
  );
  const cancelSite = useGatedAction(
    'properties.edit',
    () => cancelActivity.mutate(property.id),
    'Cancel site activity',
  );
  const siteStatusTone: DetailTone = isCancelled
    ? 'danger'
    : property.siteStatus === SiteStatus.COMPLETED
      ? 'success'
      : property.siteStatus === SiteStatus.IN_PROGRESS
        ? 'warning'
        : 'neutral';

  const handleCompleteSurvey = (): void => {
    if (!property.surveyData?.roofType || !property.surveyData.roofCondition) {
      showToast.error(
        'Add roof type and roof condition under "Edit site data" before completing the survey.',
      );
      return;
    }
    completeSurvey.mutate(property.id);
  };

  const visitFacts = [
    ...(property.siteVisitCompletedAt
      ? [{ label: 'Completed', value: formatDate(property.siteVisitCompletedAt) }]
      : []),
    { label: 'Assignee', value: property.siteVisitAssigneeName || 'Unassigned' },
    ...(property.availableRoofAreaSqft != null
      ? [{ label: 'Roof area', value: `${property.availableRoofAreaSqft} sqft` }]
      : []),
    ...(property.siteNotes ? [{ label: 'Notes', value: property.siteNotes }] : []),
  ];

  const survey = property.surveyData;
  const shading = property.shadingAnalysis;
  const surveyFacts = [
    ...(property.siteSurveyCompletedAt
      ? [{ label: 'Completed', value: formatDate(property.siteSurveyCompletedAt) }]
      : []),
    { label: 'Surveyor', value: property.siteSurveyAssigneeName || 'Unassigned' },
    ...(survey?.roofType ? [{ label: 'Roof type', value: survey.roofType }] : []),
    ...(survey?.roofCondition
      ? [{ label: 'Roof condition', value: toTitleLabel(survey.roofCondition) }]
      : []),
    ...(survey?.roofOrientation
      ? [{ label: 'Orientation', value: toTitleLabel(survey.roofOrientation) }]
      : []),
    ...(survey?.isMaterialUnloadingAreaSafe !== undefined
      ? [
          {
            label: 'Unloading area safe',
            value: survey.isMaterialUnloadingAreaSafe ? 'Yes' : 'No',
          },
        ]
      : []),
    ...(shading?.hasShading !== undefined
      ? [
          {
            label: 'Shading',
            value: shading.hasShading ? `Yes (${shading.shadingPercentage ?? 0}%)` : 'None',
          },
        ]
      : []),
    ...(survey?.notes ? [{ label: 'Notes', value: survey.notes }] : []),
  ];

  return (
    <DetailCard>
      <SectionHeading
        action={
          !isCancelled ? (
            <Button
              size="small"
              onClick={editSite.onGatedClick}
              aria-disabled={!editSite.allowed}
              sx={VIEW_ALL_SX}
            >
              Edit site data
            </Button>
          ) : undefined
        }
      >
        Site readiness
      </SectionHeading>

      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
        <TonePill
          label={toTitleLabel(property.siteStatus || SiteStatus.PENDING)}
          tone={siteStatusTone}
          dot
        />
        {isCancelled && (
          <Typography sx={{ fontSize: '0.75rem', color: 'var(--ds-text-tertiary)' }}>
            Site activity was cancelled — no visit or survey is expected.
          </Typography>
        )}
      </Stack>

      <Stack gap={2.5}>
        <ReadinessStep
          index={1}
          title="Site visit"
          done={property.siteVisitDone}
          disabled={isCancelled}
          facts={visitFacts}
          action={
            !property.siteVisitDone && !isCancelled ? (
              <Button
                size="small"
                variant="outlined"
                onClick={markVisit.onGatedClick}
                aria-disabled={!markVisit.allowed}
                disabled={isPending}
              >
                Mark visit complete
              </Button>
            ) : undefined
          }
        />

        <ReadinessStep
          index={2}
          title="Technical survey"
          done={property.surveyDone}
          disabled={isCancelled || !property.siteVisitDone}
          facts={surveyFacts}
          action={
            !property.surveyDone && !isCancelled ? (
              <Tooltip
                title={property.siteVisitDone ? '' : 'Complete the site visit first'}
                placement="top"
              >
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={markSurvey.onGatedClick}
                    aria-disabled={!markSurvey.allowed}
                    disabled={isPending || !property.siteVisitDone}
                  >
                    Mark survey complete
                  </Button>
                </span>
              </Tooltip>
            ) : undefined
          }
        />
      </Stack>

      {property.siteStatus !== SiteStatus.COMPLETED && !isCancelled && (
        <Button
          size="small"
          color="error"
          onClick={cancelSite.onGatedClick}
          aria-disabled={!cancelSite.allowed}
          disabled={isPending}
          sx={{ mt: 2, ...VIEW_ALL_SX }}
        >
          Cancel site activity
        </Button>
      )}

      <EditSiteDataModal open={editOpen} onClose={() => setEditOpen(false)} property={property} />
    </DetailCard>
  );
}

// ============================================================================
// Follow-ups
// ============================================================================

function FollowupsCard({
  propertyId,
  enabled,
  onLogFollowup,
  onViewAll,
  onViewFollowup,
}: {
  propertyId: string;
  enabled: boolean;
  onLogFollowup: () => void;
  onViewAll: () => void;
  onViewFollowup: (followupId: string) => void;
}): JSX.Element {
  const { data, isLoading } = usePropertyFollowups(propertyId, {
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
          description="Book the next conversation so this site doesn't go quiet."
        />
      ) : (
        <Stack gap={1.5}>
          {followups.map((followup) => {
            const dueTone = followupDueTone(followup.scheduledAt);
            const isOverdue = dueTone === 'danger';
            const isLateToday = dueTone === 'warning';
            return (
              <Stack
                key={followup.id}
                direction="row"
                gap={1.25}
                sx={{ minWidth: 0, cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                onClick={() => onViewFollowup(followup.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onViewFollowup(followup.id);
                  }
                }}
              >
                <IconCircle
                  tone={isOverdue ? 'danger' : isLateToday ? 'warning' : 'info'}
                  size={28}
                >
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
                        color: isOverdue
                          ? TONE_INK.danger.ink
                          : isLateToday
                            ? TONE_INK.warning.ink
                            : 'var(--ds-text-tertiary)',
                        fontWeight: isOverdue || isLateToday ? 600 : 400,
                      }}
                    >
                      {formatFollowupWhen(followup.scheduledAt)}
                    </Mono>
                    <Typography sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)' }}>
                      {toTitleLabel(followup.type)}
                      {followup.assignedToUser
                        ? ` · ${[followup.assignedToUser.firstName, followup.assignedToUser.lastName].filter(Boolean).join(' ')}`
                        : ''}
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
  property,
  enabled,
  onTabChange,
  onLogFollowup,
  onCreateQuote,
  onGoToProject,
  isInactiveCustomer,
  quoteLocked,
  onViewFollowup,
}: OverviewTabProps): JSX.Element {
  const quoteSummary = usePropertyQuoteSummary(property.id, { enabled });
  const projectId = property.project?.id ?? property.projectId ?? null;

  return (
    <Box
      sx={{
        display: 'grid',
        /*
         * Splits at `md`, not `lg`: at 1200 a 1130px laptop still got the
         * stacked layout, which pushed the journey and the money below a tall
         * reference card.
         */
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 320px) minmax(0, 1fr)' },
        gap: 2,
        alignItems: 'start',
      }}
    >
      {/* Reference material drops to the bottom when the layout stacks. */}
      <Stack gap={2} sx={{ minWidth: 0, order: { xs: 2, md: 1 } }}>
        <SiteProfileCard property={property} />
        <ConnectionCard property={property} />
      </Stack>

      <Stack gap={2} sx={{ minWidth: 0, order: { xs: 1, md: 2 } }}>
        <JourneyCard
          property={property}
          quoteSummary={quoteSummary}
          onCreateQuote={onCreateQuote}
          onGoToProject={onGoToProject}
          onViewQuotes={() => onTabChange('quotes')}
          isInactiveCustomer={isInactiveCustomer}
          quoteLocked={quoteLocked}
        />
        <MoneyCard
          projectId={projectId}
          enabled={enabled}
          onViewFinance={() => onTabChange('finance')}
        />
        <ReadinessCard property={property} />
        <FollowupsCard
          propertyId={property.id}
          enabled={enabled}
          onLogFollowup={onLogFollowup}
          onViewAll={() => onTabChange('followups')}
          onViewFollowup={onViewFollowup}
        />
      </Stack>
    </Box>
  );
}
