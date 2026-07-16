'use client';

import { ClipboardCheck, Clock, Home, Sun, FileText } from 'lucide-react';
import React, { useState } from 'react';

import { useProperty } from '@/components/features/properties/hooks';
import { EditSiteDataModal } from '@/components/features/properties/property-detail/components/edit-site-data-modal';
import { EmptyState } from '@/components/shared/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toTitleLabel } from '@/lib/utils';
import { formatDate } from '@/lib/utils/format';

interface ProjectSurveysTabProps {
  propertyId?: string;
}

function SurveyDataRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null | boolean;
}) {
  let displayValue: React.ReactNode = '—';
  if (value !== undefined && value !== null && value !== '') {
    if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    } else {
      displayValue = String(value);
    }
  }
  return (
    <div className="flex justify-between py-2 border-b border-border-light last:border-0">
      <span className="text-xs text-foreground-secondary">{label}</span>
      <span
        className={`text-xs font-medium ${displayValue === '—' ? 'text-foreground-muted/50' : 'text-foreground'}`}
      >
        {displayValue}
      </span>
    </div>
  );
}

export const ProjectSurveysTab = React.memo(
  ({ propertyId }: ProjectSurveysTabProps): React.JSX.Element => {
    const { data: property, isLoading } = useProperty(propertyId ?? '');
    const [editModalOpen, setEditModalOpen] = useState(false);

    if (isLoading) {
      return (
        <div className="space-y-4 p-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-40 w-full" />
        </div>
      );
    }

    // Display data dashboard if site visit or survey has been captured
    if (!property?.siteVisitDone && !property?.surveyDone) {
      return (
        <EmptyState
          icon={<ClipboardCheck className="w-full h-full" />}
          iconColor="muted"
          title="No site progress data captured yet"
          description="Site progress details (visit measurements and survey details) will be displayed once the visit or survey phase begins."
        />
      );
    }

    const data = property.surveyData;

    const getBadgeVariant = (
      siteStatus?: string,
    ): 'default' | 'success' | 'warning' | 'destructive' => {
      switch (siteStatus) {
        case 'completed':
          return 'success';
        case 'in_progress':
          return 'warning';
        case 'cancelled':
          return 'destructive';
        case undefined:
          return 'default';
        default:
          return 'default';
      }
    };

    return (
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="flex items-center justify-between bg-background-secondary p-4 rounded-lg border border-border-light shadow-2xs">
          <div>
            <span className="text-2xs font-semibold tracking-wider text-foreground-secondary uppercase">
              Property Code
            </span>
            <h3 className="text-sm font-bold text-foreground mt-0.5">{property.propertyCode}</h3>
          </div>
          <div className="flex items-center gap-3">
            {property.siteStatus !== 'cancelled' && (
              <button
                onClick={() => setEditModalOpen(true)}
                className="text-xs font-semibold text-primary border border-primary/20 hover:bg-primary/5 px-2.5 py-1 rounded transition mr-2"
              >
                Edit Data
              </button>
            )}
            <div className="text-right">
              <span className="text-2xs text-foreground-secondary">Last Updated</span>
              <p className="text-xs font-medium text-foreground">
                {formatDate(
                  property.siteSurveyCompletedAt ??
                    property.siteVisitCompletedAt ??
                    property.updatedAt,
                  'medium',
                )}
              </p>
            </div>
            <Badge variant={getBadgeVariant(property.siteStatus)} shape="pill" size="sm">
              {toTitleLabel(property.siteStatus || 'pending')}
            </Badge>
          </div>
        </div>

        {/* 2x2 Grid of visual panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Coordination & Timeline */}
          <div className="bg-background-secondary p-5 rounded-lg border border-border-light shadow-2xs hover:shadow-xs transition duration-200">
            <div className="flex items-center gap-2 mb-4 border-b border-border-light pb-2">
              <Clock className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-semibold text-foreground">Coordination & Timeline</h4>
            </div>
            <div className="space-y-0.5">
              <SurveyDataRow label="Site Visit Assignee" value={property.siteVisitAssigneeName} />
              <SurveyDataRow
                label="Site Visit Completed"
                value={
                  property.siteVisitCompletedAt
                    ? formatDate(property.siteVisitCompletedAt, 'medium')
                    : 'Pending'
                }
              />
              <SurveyDataRow label="Technical Surveyor" value={property.siteSurveyAssigneeName} />
              <SurveyDataRow
                label="Survey Completed"
                value={
                  property.siteSurveyCompletedAt
                    ? formatDate(property.siteSurveyCompletedAt, 'medium')
                    : 'Pending'
                }
              />
            </div>
          </div>

          {/* Card 2: Roof & Structural Parameters */}
          <div className="bg-background-secondary p-5 rounded-lg border border-border-light shadow-2xs hover:shadow-xs transition duration-200">
            <div className="flex items-center gap-2 mb-4 border-b border-border-light pb-2">
              <Home className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-semibold text-foreground">
                Roof & Structural Parameters
              </h4>
            </div>
            <div className="space-y-0.5">
              <SurveyDataRow
                label="Available Roof Area"
                value={
                  property.availableRoofAreaSqft != null
                    ? `${property.availableRoofAreaSqft} sqft`
                    : null
                }
              />
              <SurveyDataRow label="Roof Type" value={data?.roofType} />
              <SurveyDataRow
                label="Roof Condition"
                value={data?.roofCondition ? toTitleLabel(data.roofCondition) : null}
              />
              <SurveyDataRow
                label="Roof Orientation"
                value={data?.roofOrientation ? toTitleLabel(data.roofOrientation) : null}
              />
              <SurveyDataRow
                label="Material Unloading Area Safe"
                value={data?.isMaterialUnloadingAreaSafe}
              />
            </div>
          </div>

          {/* Card 3: Solar Shading Analysis */}
          <div className="bg-background-secondary p-5 rounded-lg border border-border-light shadow-2xs hover:shadow-xs transition duration-200">
            <div className="flex items-center gap-2 mb-4 border-b border-border-light pb-2">
              <Sun className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-semibold text-foreground">Solar Shading Analysis</h4>
            </div>
            <div className="space-y-0.5">
              <SurveyDataRow label="Has Shading" value={property.shadingAnalysis?.hasShading} />
              <SurveyDataRow
                label="Shading Percentage"
                value={
                  property.shadingAnalysis?.hasShading &&
                  property.shadingAnalysis.shadingPercentage != null
                    ? `${property.shadingAnalysis.shadingPercentage}%`
                    : null
                }
              />
              <SurveyDataRow
                label="Shading Analysis Notes"
                value={property.shadingAnalysis?.notes}
              />
            </div>
          </div>

          {/* Card 4: General Notes & Observations */}
          <div className="bg-background-secondary p-5 rounded-lg border border-border-light shadow-2xs hover:shadow-xs transition duration-200">
            <div className="flex items-center gap-2 mb-4 border-b border-border-light pb-2">
              <FileText className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-semibold text-foreground">Field Notes & Observations</h4>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-2xs font-semibold text-foreground-secondary block mb-1">
                  Site Visit Notes
                </span>
                <p className="text-xs text-foreground bg-background-main p-2.5 rounded border border-border-light min-h-[50px]">
                  {property.siteNotes || '—'}
                </p>
              </div>
              <div>
                <span className="text-2xs font-semibold text-foreground-secondary block mb-1">
                  Technical Survey Notes
                </span>
                <p className="text-xs text-foreground bg-background-main p-2.5 rounded border border-border-light min-h-[50px]">
                  {data?.notes || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <EditSiteDataModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          property={property}
        />
      </div>
    );
  },
);
