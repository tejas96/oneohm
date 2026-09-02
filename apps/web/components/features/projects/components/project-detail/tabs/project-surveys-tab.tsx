'use client';

import { ClipboardCheck, Clock, Home, PencilLine, Sun } from 'lucide-react';
import React, { useState } from 'react';

import { DetailCard, EmptyPane, Mono, TonePill, type Tone } from '../primitives';

import { useProperty } from '@/components/features/properties/hooks';
import { EditSiteDataModal } from '@/components/features/properties/property-detail/components/edit-site-data-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { useGatedAction } from '@/lib/rbac';
import { cn, formatDate, toTitleLabel } from '@/lib/utils';

interface ProjectSurveysTabProps {
  propertyId?: string;
}

const SITE_STATUS_TONE: Record<string, Tone> = {
  completed: 'success',
  in_progress: 'warning',
  cancelled: 'danger',
  pending: 'neutral',
};

/**
 * One measured fact from the site visit.
 *
 * A missing value renders as an em dash in the muted tone rather than being
 * hidden: on a survey form, "nobody recorded this" is itself information, and
 * dropping the row would make the sheet look complete when it is not.
 */
function Fact({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | number | boolean | null;
  mono?: boolean;
}): React.JSX.Element {
  let text: string | null = null;
  if (typeof value === 'boolean') text = value ? 'Yes' : 'No';
  else if (value !== undefined && value !== null && String(value).trim() !== '') {
    text = String(value);
  }

  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="shrink-0 text-[11.5px] text-foreground-tertiary">{label}</span>
      {text ? (
        <span
          className={cn(
            'min-w-0 text-right text-[12.5px] font-medium text-foreground [overflow-wrap:anywhere]',
            mono && 'font-mono tabular-nums',
          )}
        >
          {text}
        </span>
      ) : (
        <span className="text-[12.5px] text-foreground-muted">—</span>
      )}
    </div>
  );
}

function NoteBlock({ label, text }: { label: string; text?: string | null }): React.JSX.Element {
  return (
    <div>
      <span className="block text-[11px] font-medium text-foreground-tertiary">{label}</span>
      <p
        className="mt-1 min-h-[52px] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed text-foreground"
        style={{ background: 'var(--ds-canvas-sunken)' }}
      >
        {text?.trim() ? text : <span className="text-foreground-muted">Nothing written down</span>}
      </p>
    </div>
  );
}

/**
 * What the surveyor measured on the roof.
 *
 * Read-only reference, drawn from the PROPERTY rather than the project — the
 * survey belongs to the site and outlives any one job on it. Editing opens the
 * property's own modal so the two screens can never write different shapes.
 */
export const ProjectSurveysTab = React.memo(
  ({ propertyId }: ProjectSurveysTabProps): React.JSX.Element => {
    const { data: property, isLoading, isError, refetch } = useProperty(propertyId ?? '');
    const [editModalOpen, setEditModalOpen] = useState(false);
    const editSurvey = useGatedAction(
      'properties.edit',
      () => setEditModalOpen(true),
      'Edit survey data',
    );

    if (isLoading) {
      return (
        <div className="grid grid-cols-12 gap-4">
          <Skeleton className="col-span-12 h-24 rounded-3xl" />
          <Skeleton className="col-span-12 h-56 rounded-3xl md:col-span-6" />
          <Skeleton className="col-span-12 h-56 rounded-3xl md:col-span-6" />
        </div>
      );
    }

    if (isError || !property) {
      return (
        <DetailCard
          label="Survey"
          isError={isError}
          onRetry={() => {
            void refetch();
          }}
        >
          <EmptyPane
            size="page"
            icon={<ClipboardCheck className="size-4" strokeWidth={2} />}
            title="No site on this project"
            description="A survey is recorded against the installation site. This project has none linked."
          />
        </DetailCard>
      );
    }

    if (!property.siteVisitDone && !property.surveyDone) {
      return (
        <DetailCard label="Survey">
          <EmptyPane
            size="page"
            icon={<ClipboardCheck className="size-4" strokeWidth={2} />}
            title="Nothing measured yet"
            description="Roof measurements and shading appear here once the site visit or the technical survey is done."
          />
        </DetailCard>
      );
    }

    const data = property.surveyData;
    const statusKey = property.siteStatus ?? 'pending';
    const lastUpdated =
      property.siteSurveyCompletedAt ?? property.siteVisitCompletedAt ?? property.updatedAt;

    const editButton =
      property.siteStatus !== 'cancelled' ? (
        <button
          type="button"
          onClick={editSurvey.onGatedClick}
          aria-disabled={!editSurvey.allowed}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-pill bg-background-tertiary px-3.5 text-[12.5px] font-medium text-foreground-secondary transition-colors duration-fast hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            !editSurvey.allowed && 'opacity-50',
          )}
        >
          <PencilLine className="size-3.5" strokeWidth={2} aria-hidden />
          Edit
        </button>
      ) : null;

    return (
      <>
        <div className="grid grid-cols-12 gap-4">
          <DetailCard
            label="Survey"
            aside={property.propertyCode ?? undefined}
            action={
              <div className="flex items-center gap-2">
                <TonePill
                  label={toTitleLabel(statusKey)}
                  tone={SITE_STATUS_TONE[statusKey] ?? 'neutral'}
                  dot
                />
                {editButton}
              </div>
            }
            className="col-span-12"
          >
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-[12.5px] text-foreground-secondary">
              <span>
                Site visit{' '}
                {property.siteVisitCompletedAt ? (
                  <Mono className="font-medium text-foreground">
                    {formatDate(property.siteVisitCompletedAt)}
                  </Mono>
                ) : (
                  <span className="text-foreground-muted">not done</span>
                )}
                {property.siteVisitAssigneeName ? ` · ${property.siteVisitAssigneeName}` : ''}
              </span>
              <span>
                Technical survey{' '}
                {property.siteSurveyCompletedAt ? (
                  <Mono className="font-medium text-foreground">
                    {formatDate(property.siteSurveyCompletedAt)}
                  </Mono>
                ) : (
                  <span className="text-foreground-muted">not done</span>
                )}
                {property.siteSurveyAssigneeName ? ` · ${property.siteSurveyAssigneeName}` : ''}
              </span>
              {lastUpdated ? (
                <span className="ml-auto text-foreground-tertiary">
                  Updated <Mono>{formatDate(lastUpdated)}</Mono>
                </span>
              ) : null}
            </div>
          </DetailCard>

          <DetailCard
            label="Roof"
            action={
              <Home className="size-4 text-foreground-tertiary" strokeWidth={1.75} aria-hidden />
            }
            className="col-span-12 md:col-span-6"
          >
            <Fact
              label="Available area"
              value={
                property.availableRoofAreaSqft != null
                  ? `${property.availableRoofAreaSqft} sq ft`
                  : null
              }
              mono
            />
            <Fact label="Roof type" value={data?.roofType} />
            <Fact
              label="Condition"
              value={data?.roofCondition ? toTitleLabel(data.roofCondition) : null}
            />
            <Fact
              label="Orientation"
              value={data?.roofOrientation ? toTitleLabel(data.roofOrientation) : null}
            />
            <Fact label="Unloading area safe" value={data?.isMaterialUnloadingAreaSafe} />
          </DetailCard>

          <DetailCard
            label="Shading"
            action={
              <Sun className="size-4 text-foreground-tertiary" strokeWidth={1.75} aria-hidden />
            }
            className="col-span-12 md:col-span-6"
          >
            <Fact label="Any shading" value={property.shadingAnalysis?.hasShading} />
            <Fact
              label="Shaded share"
              value={
                property.shadingAnalysis?.hasShading &&
                property.shadingAnalysis.shadingPercentage != null
                  ? `${property.shadingAnalysis.shadingPercentage}%`
                  : null
              }
              mono
            />
            <div className="pt-2">
              <NoteBlock label="Shading notes" text={property.shadingAnalysis?.notes} />
            </div>
          </DetailCard>

          <DetailCard
            label="Field notes"
            action={
              <Clock className="size-4 text-foreground-tertiary" strokeWidth={1.75} aria-hidden />
            }
            className="col-span-12"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <NoteBlock label="Site visit" text={property.siteNotes} />
              <NoteBlock label="Technical survey" text={data?.notes} />
            </div>
          </DetailCard>
        </div>

        <EditSiteDataModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          property={property}
        />
      </>
    );
  },
);

ProjectSurveysTab.displayName = 'ProjectSurveysTab';
