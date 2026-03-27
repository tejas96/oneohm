'use client';

import { ClipboardCheck } from 'lucide-react';
import React from 'react';

import { useSiteActivityByProperty } from '@/components/features/site-activities/hooks';
import { EmptyState } from '@/components/shared/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils/format';

interface ProjectSurveysTabProps {
  propertyId?: string;
}

function SurveyDataRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-xs text-foreground-secondary">{label}</span>
      <span className="text-xs font-medium text-foreground">{String(value)}</span>
    </div>
  );
}

export const ProjectSurveysTab = React.memo(
  ({ propertyId }: ProjectSurveysTabProps): React.JSX.Element => {
    const { data: activity, isLoading } = useSiteActivityByProperty(propertyId);

    if (isLoading) {
      return (
        <div className="space-y-4 p-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-40 w-full" />
        </div>
      );
    }

    if (!activity?.isSiteSurveyDone) {
      return (
        <EmptyState
          icon={<ClipboardCheck className="w-full h-full" />}
          iconColor="muted"
          title="No site survey completed"
          description="A site survey will be available once the visit and survey phases are completed."
        />
      );
    }

    const data = activity.surveyData;
    const statusVariant = activity.isSiteSurveyDone ? 'success' : 'warning';

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Site Survey</h3>
        </div>

        <div className="rounded-lg border border-border-light bg-background-secondary p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-xs font-semibold text-foreground">{activity.activityNumber}</h4>
              <p className="text-2xs text-foreground-secondary">
                {formatDate(activity.completedAt ?? activity.updatedAt, 'medium')}
              </p>
            </div>
            <Badge variant={statusVariant} shape="pill" size="sm">
              {activity.isSiteSurveyDone ? 'Completed' : 'Pending'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
            <div className="divide-y divide-border-light">
              <SurveyDataRow label="Roof Type" value={data?.roofType} />
              <SurveyDataRow label="Roof Condition" value={data?.roofCondition} />
              <SurveyDataRow label="Roof Orientation" value={data?.roofOrientation} />
              <SurveyDataRow
                label="Tilt Angle"
                value={data?.roofTiltAngle != null ? `${data.roofTiltAngle}°` : undefined}
              />
              <SurveyDataRow
                label="Available Area"
                value={data?.availableAreaSqm != null ? `${data.availableAreaSqm} sqm` : undefined}
              />
            </div>
            <div className="divide-y divide-border-light">
              <SurveyDataRow label="Structural Assessment" value={data?.structuralAssessment} />
              <SurveyDataRow label="Site Access" value={data?.siteAccess} />
              <SurveyDataRow label="Safety Concerns" value={data?.safetyConcerns} />
            </div>
          </div>

          {data?.recommendations && (
            <div className="mt-4 pt-3 border-t border-border-light">
              <p className="text-xs font-medium text-foreground-secondary mb-1">Recommendations</p>
              <p className="text-xs text-foreground">{data.recommendations}</p>
            </div>
          )}

          {data?.notes && (
            <div className="mt-3 pt-3 border-t border-border-light">
              <p className="text-xs font-medium text-foreground-secondary mb-1">Notes</p>
              <p className="text-xs text-foreground">{data.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  },
);
