'use client';

import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  ChangeRequestStatus,
  type LeadTemperature,
  PropertyStatus,
  RE_ARRANGEMENT_TYPE_LABELS,
  SiteStatus,
} from '@tejas96/shared/types';
import { type JSX, useState } from 'react';

import type { CustomerPropertyResponse } from '../hooks';
import { liveProjectIdOf, siteClosed } from './build-attention';
import {
  EYEBROW,
  Kv,
  type KvRow,
  Missing,
  PageCard,
  PillButton,
  SubHeading,
  TEXT_ACTION,
} from './parts';

import { EditSiteDataModal } from '@/components/features/properties/components/edit-site-data-modal';
import {
  LEAD_TEMPERATURE_CONFIG,
  LEAD_TEMPERATURE_TONE,
  PROPERTY_TYPE_LABELS,
} from '@/components/features/properties/constants';
import {
  useCancelPropertySiteActivity,
  useCompletePropertySurvey,
  useCompletePropertyVisit,
  useUpdateProperty,
} from '@/components/features/properties/hooks';
import {
  formatChangeRequestSummary,
  getChangeRequestLabel,
} from '@/components/features/properties/utils/change-request-display';
import { QuietPill } from '@/components/shared/calm-list';
import type { CrmTone } from '@/components/shared/crm-table';
import { showToast } from '@/components/ui';
import { useAccessDialog, useCan, useGatedAction } from '@/lib/rbac';
import { color } from '@/lib/theme/tokens';
import { cn, formatDate, toTitleLabel } from '@/lib/utils';

/** The chip colours, in the tones the lead temperature already has everywhere else. */
const TEMPERATURE_INK: Record<CrmTone, { ink: string; bg: string }> = {
  neutral: { ink: color.neutral, bg: color['neutral-bg'] },
  accent: { ink: color['accent-ink'], bg: color['accent-subtle'] },
  success: { ink: color.success, bg: color['success-bg'] },
  info: { ink: color.info, bg: color['info-bg'] },
  warning: { ink: color.warning, bg: color['warning-bg'] },
  danger: { ink: color.danger, bg: color['danger-bg'] },
};

/** A site can be marked lost only while it is still being chased. */
const LOSABLE_STATUSES: PropertyStatus[] = [
  PropertyStatus.ACTIVE,
  PropertyStatus.PENDING_VERIFICATION,
];

/**
 * The visit and survey actions of one site. One hook so the "Before the quote"
 * card, the Site card and the attention list all press the same buttons.
 */
export function useSiteReadiness(site: CustomerPropertyResponse | undefined): {
  busy: boolean;
  editOpen: boolean;
  closeEdit: () => void;
  editSiteData: ReturnType<typeof useGatedAction>;
  markVisit: ReturnType<typeof useGatedAction>;
  markSurvey: ReturnType<typeof useGatedAction>;
  cancelActivity: ReturnType<typeof useGatedAction>;
  /** The "are you sure" step of Cancel site activity: it cannot be undone. */
  cancelConfirm: { open: boolean; close: () => void; confirm: () => void };
} {
  const completeVisit = useCompletePropertyVisit();
  const completeSurvey = useCompletePropertySurvey();
  const cancelSiteActivity = useCancelPropertySiteActivity();
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const siteId = site?.id;

  const editSiteData = useGatedAction('properties.edit', () => setEditOpen(true), 'Edit site data');
  const markVisit = useGatedAction(
    'properties.edit',
    () => {
      if (siteId) completeVisit.mutate(siteId);
    },
    'Mark visit complete',
  );
  const markSurvey = useGatedAction(
    'properties.edit',
    () => {
      if (!site) return;
      // The survey is the record of the roof: it cannot close without one. A
      // ground-mount-only site has no roof to describe (the server's own rule).
      const groundOnly = Number(site.groundCapacityKw) > 0 && !(Number(site.rooftopCapacityKw) > 0);
      if (!groundOnly && (!site.surveyData?.roofType || !site.surveyData.roofCondition)) {
        showToast.error(
          'Add roof type and roof condition under "Edit site data" before completing the survey.',
        );
        return;
      }
      completeSurvey.mutate(site.id);
    },
    'Mark survey complete',
  );
  const cancelActivity = useGatedAction(
    'properties.edit',
    () => setCancelOpen(true),
    'Cancel site activity',
  );

  return {
    busy: completeVisit.isPending || completeSurvey.isPending || cancelSiteActivity.isPending,
    editOpen,
    closeEdit: () => setEditOpen(false),
    editSiteData,
    markVisit,
    markSurvey,
    cancelActivity,
    cancelConfirm: {
      open: cancelOpen,
      close: () => setCancelOpen(false),
      confirm: () => {
        setCancelOpen(false);
        if (siteId) cancelSiteActivity.mutate(siteId);
      },
    },
  };
}

export type SiteReadiness = ReturnType<typeof useSiteReadiness>;

/**
 * Asked before site activity is cancelled. Nothing in the app sets it back, and
 * a cancelled site can never have its visit or survey completed.
 */
export function CancelSiteActivityDialog({ readiness }: { readiness: SiteReadiness }): JSX.Element {
  const { open, close, confirm } = readiness.cancelConfirm;
  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>Cancel site activity?</DialogTitle>
      <DialogContent>
        No site visit or survey will be expected for this site. This cannot be undone.
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Keep it</Button>
        <Button color="error" variant="contained" onClick={confirm}>
          Cancel site activity
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Hot / Warm / Cold, changeable in place. Only while the site is still in play. */
export function TemperatureChips({ site }: { site: CustomerPropertyResponse }): JSX.Element {
  const updateProperty = useUpdateProperty();
  const { can } = useCan();
  const { requestAccess } = useAccessDialog();
  const canEdit = can('properties.edit');

  return (
    <span className="inline-flex gap-1" role="group" aria-label="Lead temperature">
      {(Object.keys(LEAD_TEMPERATURE_CONFIG) as LeadTemperature[]).map((temperature) => {
        const active = site.leadTemperature === temperature;
        const tone = LEAD_TEMPERATURE_TONE[temperature] ?? 'neutral';
        return (
          <button
            key={temperature}
            type="button"
            aria-pressed={active}
            aria-disabled={!canEdit}
            disabled={updateProperty.isPending}
            onClick={() => {
              if (!canEdit) {
                requestAccess('properties.edit', 'Change lead temperature');
                return;
              }
              if (active) return;
              updateProperty.mutate({ id: site.id, data: { leadTemperature: temperature } });
            }}
            className="rounded-pill px-2.5 py-0.5 text-[11px] font-medium normal-case tracking-normal"
            style={
              active
                ? { color: TEMPERATURE_INK[tone].ink, backgroundColor: TEMPERATURE_INK[tone].bg }
                : { color: color.neutral, backgroundColor: color['neutral-bg'], opacity: 0.7 }
            }
          >
            {LEAD_TEMPERATURE_CONFIG[temperature].label}
          </button>
        );
      })}
    </span>
  );
}

function StepBox({
  order,
  name,
  done,
  facts,
  children,
}: {
  order: number;
  name: string;
  done: boolean;
  facts: string;
  children?: JSX.Element | null;
}): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[14px] px-4 py-3.5',
        done ? 'bg-[var(--ds-success-bg)]' : 'bg-background-tertiary',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <b className="font-semibold">
          {order}. {name}
        </b>
        <QuietPill label={done ? 'Done' : 'Not done'} tone={done ? 'success' : 'neutral'} whole />
      </div>
      <p className="m-0 mt-1 text-[13px] text-foreground-secondary">{facts}</p>
      {children ? <div className="mt-2.5 flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

const SURVEY_CLOSES_VISIT = 'The site visit is still open. Completing the survey closes it too.';

const visitFacts = (site: CustomerPropertyResponse): string =>
  [
    site.siteVisitDone
      ? site.siteVisitCompletedAt
        ? formatDate(site.siteVisitCompletedAt)
        : 'Done, no date recorded'
      : 'Not done yet',
    site.siteVisitAssigneeName ?? 'Nobody assigned',
  ].join(' · ');

const surveyFacts = (site: CustomerPropertyResponse): string =>
  [
    site.surveyDone
      ? site.siteSurveyCompletedAt
        ? formatDate(site.siteSurveyCompletedAt)
        : 'Done, no date recorded'
      : 'Not done yet',
    site.siteSurveyAssigneeName ?? 'No surveyor assigned',
  ].join(' · ');

/**
 * The two steps before a quote. Shown in place of Money and Project while the
 * site has neither — three empty cards would say nothing.
 */
export function BeforeQuoteCard({
  site,
  readiness,
  delayMs,
}: {
  site: CustomerPropertyResponse;
  readiness: SiteReadiness;
  delayMs?: number;
}): JSX.Element {
  // As on the old site page: only a cancelled site activity takes the buttons away.
  const closed = site.siteStatus === SiteStatus.CANCELLED;
  const { markVisit, markSurvey, cancelActivity, editSiteData, busy } = readiness;

  return (
    <PageCard
      id="before-quote"
      title="Before the quote"
      delayMs={delayMs}
      className="@[980px]:col-span-2"
    >
      {site.siteStatus === SiteStatus.CANCELLED ? (
        <p className="-mt-1 mb-3 text-[13px] text-foreground-secondary">
          Site activity was cancelled. No visit or survey is expected.
        </p>
      ) : null}
      <div className="grid gap-3 @[560px]:grid-cols-2">
        <StepBox order={1} name="Site visit" done={site.siteVisitDone} facts={visitFacts(site)}>
          {!site.siteVisitDone && !closed ? (
            <PillButton
              variant="dark"
              disabled={busy}
              ariaDisabled={!markVisit.allowed}
              onClick={markVisit.onGatedClick}
            >
              Mark visit complete
            </PillButton>
          ) : null}
        </StepBox>
        <StepBox order={2} name="Technical survey" done={site.surveyDone} facts={surveyFacts(site)}>
          {!site.surveyDone && !closed ? (
            <PillButton
              // The server closes an open visit with the survey: two people can do them.
              variant={site.siteVisitDone ? 'dark' : 'plain'}
              disabled={busy}
              ariaDisabled={!markSurvey.allowed}
              title={site.siteVisitDone ? undefined : SURVEY_CLOSES_VISIT}
              onClick={markSurvey.onGatedClick}
            >
              Mark survey complete
            </PillButton>
          ) : null}
        </StepBox>
      </div>
      {closed ? null : (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <button
            type="button"
            className={TEXT_ACTION}
            aria-disabled={!editSiteData.allowed}
            onClick={editSiteData.onGatedClick}
          >
            Edit site data
          </button>
          {site.siteStatus !== SiteStatus.COMPLETED ? (
            <button
              type="button"
              disabled={busy}
              aria-disabled={!cancelActivity.allowed}
              onClick={cancelActivity.onGatedClick}
              className="text-[13px] font-medium text-foreground-secondary hover:underline aria-disabled:opacity-50"
            >
              Cancel site activity
            </button>
          ) : null}
        </div>
      )}
    </PageCard>
  );
}

export interface SiteCardProps {
  site: CustomerPropertyResponse;
  /** The customer has more than one site: the card names the one it shows. */
  many: boolean;
  /** False once the site has a quote: visit and survey move into this card. */
  early: boolean;
  readiness: SiteReadiness;
  onEditSite: () => void;
  onMarkLost: () => void;
  onReopen: () => void;
  /** Org admins only; undefined hides the item. */
  onDelete?: () => void;
  deleteBlockedBy?: string;
  delayMs?: number;
}

/** Everything about the roof and its electricity connection. */
export function SiteCard({
  site,
  many,
  early,
  readiness,
  onEditSite,
  onMarkLost,
  onReopen,
  onDelete,
  deleteBlockedBy,
  delayMs,
}: SiteCardProps): JSX.Element {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const editSite = useGatedAction('properties.edit', onEditSite, 'Edit site');
  const canMarkLost = LOSABLE_STATUSES.includes(site.status);
  const canReopen = site.status === PropertyStatus.LOST;
  const activityCancelled = site.siteStatus === SiteStatus.CANCELLED;
  // Only while the visit and survey still matter: not on a won or a closed site.
  const canCancelActivity =
    !activityCancelled &&
    site.siteStatus !== SiteStatus.COMPLETED &&
    !liveProjectIdOf(site) &&
    (site.stageIndex ?? 0) < 4 &&
    !siteClosed(site);
  const closeMenu = (): void => setMenuAnchor(null);

  const address = [site.address, site.city, site.state, site.pincode].filter(Boolean).join(', ');
  // GPS beats the typed address when we have it: a pin drops on the roof.
  const mapHref =
    site.gpsCoordinates?.latitude != null && site.gpsCoordinates.longitude != null
      ? `https://maps.google.com/?q=${site.gpsCoordinates.latitude},${site.gpsCoordinates.longitude}`
      : address
        ? `https://maps.google.com/?q=${encodeURIComponent(address)}`
        : undefined;

  /** "+ Add" for one missing fact; `what` tells a screen reader which one. */
  const addAction = (what: string): JSX.Element => (
    <button
      type="button"
      className={TEXT_ACTION}
      aria-label={`Add ${what}`}
      aria-disabled={!editSite.allowed}
      onClick={editSite.onGatedClick}
    >
      + Add
    </button>
  );
  const editDataAction = (
    <button
      type="button"
      className={TEXT_ACTION}
      aria-label="Add roof data"
      aria-disabled={!readiness.editSiteData.allowed}
      onClick={readiness.editSiteData.onGatedClick}
    >
      + Add
    </button>
  );
  const fill = (value: string | undefined | null, what: string): JSX.Element | string =>
    value ? value : <Missing action={addAction(what)} />;

  const survey = site.surveyData;
  const roof = [
    survey?.roofType,
    survey?.roofCondition ? toTitleLabel(survey.roofCondition) : null,
    survey?.roofOrientation ? `faces ${toTitleLabel(survey.roofOrientation).toLowerCase()}` : null,
    site.availableRoofAreaSqft != null ? `${site.availableRoofAreaSqft} sq ft` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const mounting = [
    site.rooftopCapacityKw ? `Rooftop ${site.rooftopCapacityKw} kW` : null,
    site.groundCapacityKw ? `Ground ${site.groundCapacityKw} kW` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const shading = site.shadingAnalysis;
  const connection = [
    site.connectionType ? toTitleLabel(site.connectionType) : null,
    site.sanctionedLoad != null ? `sanctioned ${site.sanctionedLoad} kW` : null,
    site.currentLoad ? `current load ${site.currentLoad}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const rows: KvRow[] = [
    {
      label: 'Address',
      value: address ? (
        <>
          {address}
          {mapHref ? (
            <>
              {' · '}
              <a href={mapHref} target="_blank" rel="noreferrer" className={TEXT_ACTION}>
                Map
              </a>
            </>
          ) : null}
        </>
      ) : (
        <Missing action={addAction('the address')} />
      ),
    },
    {
      label: 'Type',
      value: PROPERTY_TYPE_LABELS[site.propertyType] ?? toTitleLabel(site.propertyType),
    },
    { label: 'Roof', value: roof || <Missing action={editDataAction} /> },
    ...(mounting ? [{ label: 'Mounting', value: mounting }] : []),
    ...(shading?.hasShading !== undefined
      ? [
          {
            label: 'Shading',
            value: shading.hasShading ? `Yes · ${shading.shadingPercentage ?? 0}%` : 'None',
          },
        ]
      : []),
    ...(survey?.isMaterialUnloadingAreaSafe !== undefined
      ? [
          {
            label: 'Unloading area',
            value: survey.isMaterialUnloadingAreaSafe ? 'Safe' : 'Not safe',
          },
        ]
      : []),
    ...(site.siteNotes ? [{ label: 'Visit note', value: site.siteNotes }] : []),
    ...(survey?.notes ? [{ label: 'Survey note', value: survey.notes }] : []),
    {
      label: 'Connection',
      value: connection || <Missing action={addAction('the connection type')} />,
    },
    {
      label: 'RE arrangement',
      value: site.reArrangementType ? RE_ARRANGEMENT_TYPE_LABELS[site.reArrangementType] : '—',
    },
    { label: 'Consumer no.', value: fill(site.consumerNumber, 'the consumer number') },
    { label: 'Consumer name', value: fill(site.consumerName, 'the consumer name') },
    { label: 'DISCOM', value: fill(site.discom?.label, 'the DISCOM') },
    { label: 'Meter no.', value: fill(site.meterNumber, 'the meter number') },
    // Before a quote these two have a card of their own, with their buttons.
    ...(early
      ? []
      : [
          {
            label: 'Site visit',
            value: site.siteVisitDone ? (
              `Done · ${visitFacts(site)}`
            ) : (
              <Missing
                text={`Not done · ${site.siteVisitAssigneeName ?? 'nobody assigned'}`}
                action={
                  activityCancelled ? undefined : (
                    <button
                      type="button"
                      className={TEXT_ACTION}
                      aria-label="Mark site visit complete"
                      aria-disabled={!readiness.markVisit.allowed}
                      onClick={readiness.markVisit.onGatedClick}
                    >
                      Mark complete
                    </button>
                  )
                }
              />
            ),
          },
          {
            label: 'Survey',
            value: site.surveyDone ? (
              `Done · ${surveyFacts(site)}`
            ) : (
              <Missing
                text={`Not done · ${site.siteSurveyAssigneeName ?? 'no surveyor assigned'}`}
                action={
                  activityCancelled ? undefined : (
                    <button
                      type="button"
                      className={TEXT_ACTION}
                      aria-label="Mark survey complete"
                      title={site.siteVisitDone ? undefined : SURVEY_CLOSES_VISIT}
                      aria-disabled={!readiness.markSurvey.allowed}
                      onClick={readiness.markSurvey.onGatedClick}
                    >
                      Mark complete
                    </button>
                  )
                }
              />
            ),
          },
        ]),
    ...(site.notes ? [{ label: 'Notes', value: site.notes }] : []),
  ];

  const pendingRequests = (site.changeRequests ?? []).filter(
    (request) => request.status === ChangeRequestStatus.PENDING,
  );

  return (
    <PageCard
      id="site"
      delayMs={delayMs}
      title={
        <span className="flex items-center gap-2">
          Site{site.propertyName ? ` · ${site.propertyName}` : many ? ' · this site' : ''}
          {site.isPrimary ? <QuietPill label="Primary" tone="neutral" whole /> : null}
        </span>
      }
      action={
        <>
          <button
            type="button"
            className={TEXT_ACTION}
            aria-disabled={!editSite.allowed}
            onClick={editSite.onGatedClick}
          >
            Edit site
          </button>
          <button
            type="button"
            aria-label="Site actions"
            aria-haspopup="menu"
            aria-expanded={Boolean(menuAnchor)}
            onClick={(event) => setMenuAnchor(event.currentTarget)}
            className="-mr-1.5 grid size-7 place-items-center rounded-full text-foreground-secondary hover:bg-background-tertiary"
          >
            <MoreVertOutlinedIcon sx={{ fontSize: 18 }} />
          </button>
        </>
      }
    >
      <Kv rows={rows} />
      {activityCancelled && !early ? (
        <p className="m-0 mt-2 text-[13px] text-foreground-secondary">
          Site activity was cancelled. No visit or survey is expected.
        </p>
      ) : null}

      {pendingRequests.length > 0 ? (
        <>
          <SubHeading>Pending DISCOM requests · {pendingRequests.length}</SubHeading>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {pendingRequests.map((request, index) => (
              <li
                key={`${request.type}-${index}`}
                className="flex items-baseline gap-2 text-[13px] text-foreground-secondary"
              >
                <QuietPill label={getChangeRequestLabel(request.type)} tone="warning" whole />
                <span className="min-w-0">{formatChangeRequestSummary(request)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className={cn(EYEBROW, 'mt-3 normal-case tracking-normal')}>
        Added {formatDate(site.createdAt)}
        {site.creatorName ? ` by ${site.creatorName}` : ''}
        {site.propertyCode ? ` · ${site.propertyCode}` : ''}
      </p>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            closeMenu();
            readiness.editSiteData.onGatedClick();
          }}
        >
          Edit site data
        </MenuItem>
        {canMarkLost ? (
          <MenuItem
            onClick={() => {
              closeMenu();
              onMarkLost();
            }}
          >
            Mark as lost
          </MenuItem>
        ) : null}
        {canReopen ? (
          <MenuItem
            onClick={() => {
              closeMenu();
              onReopen();
            }}
          >
            Reopen
          </MenuItem>
        ) : null}
        {canCancelActivity ? (
          <MenuItem
            disabled={readiness.busy}
            onClick={() => {
              closeMenu();
              readiness.cancelActivity.onGatedClick();
            }}
          >
            Cancel site activity
          </MenuItem>
        ) : null}
        {onDelete ? (
          // Blocked, it stays reachable by keyboard so its reason can be read.
          <MenuItem
            aria-disabled={Boolean(deleteBlockedBy)}
            onClick={() => {
              if (deleteBlockedBy) return;
              closeMenu();
              onDelete();
            }}
            sx={{ display: 'block', maxWidth: 280, whiteSpace: 'normal' }}
          >
            <span className={deleteBlockedBy ? 'text-foreground-tertiary' : 'text-error'}>
              Delete site
            </span>
            {deleteBlockedBy ? (
              <span className="block text-[12px] text-foreground-tertiary">{deleteBlockedBy}</span>
            ) : null}
          </MenuItem>
        ) : null}
      </Menu>

      {readiness.editOpen ? (
        <EditSiteDataModal open onClose={readiness.closeEdit} property={site} />
      ) : null}
    </PageCard>
  );
}
