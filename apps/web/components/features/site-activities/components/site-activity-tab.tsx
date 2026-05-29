'use client';

import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import LockIcon from '@mui/icons-material/Lock';
import StraightenIcon from '@mui/icons-material/Straighten';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Skeleton,
  Typography,
} from '@mui/material';
import { DocumentEntityType, SiteActivityStatus } from '@oneohm-epc/shared/types';
import { useCallback, useState, type JSX } from 'react';

import { useSiteActivityByProperty, useCompleteVisit, useCompleteSurvey } from '../hooks';

import { DocumentManager } from '@/components/shared/document-manager';
import { EmptyState } from '@/components/shared/feedback/empty-state';
import {
  MUIDialog,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIDialogDescription,
  MUIDialogBody,
  MUIDialogFooter,
  showToast,
} from '@/components/ui';
import type { SiteActivity } from '@/lib/api/site-activities';
import { formatDate } from '@/lib/utils';

interface SiteActivityTabProps {
  propertyId: string;
}

const STATUS_CONFIG: Record<
  SiteActivityStatus,
  { label: string; color: 'default' | 'warning' | 'success' | 'error' }
> = {
  [SiteActivityStatus.PENDING]: { label: 'Pending', color: 'warning' },
  [SiteActivityStatus.IN_PROGRESS]: { label: 'In Progress', color: 'default' },
  [SiteActivityStatus.COMPLETED]: { label: 'Completed', color: 'success' },
  [SiteActivityStatus.CANCELLED]: { label: 'Cancelled', color: 'error' },
};

export function SiteActivityTab({ propertyId }: SiteActivityTabProps): JSX.Element {
  const { data: activity, isLoading } = useSiteActivityByProperty(propertyId);
  const completeVisitMutation = useCompleteVisit();
  const completeSurveyMutation = useCompleteSurvey();
  const [confirmAction, setConfirmAction] = useState<'visit' | 'survey' | null>(null);

  const handleConfirmAction = useCallback(async () => {
    if (!activity || !confirmAction) return;
    try {
      if (confirmAction === 'visit') {
        await completeVisitMutation.mutateAsync(activity.id);
        showToast.success('Site visit completed');
      } else {
        await completeSurveyMutation.mutateAsync(activity.id);
        showToast.success('Site survey completed');
      }
    } catch {
      showToast.error(
        confirmAction === 'visit'
          ? 'Cannot complete visit. Ensure GPS coordinates and roof area are captured.'
          : 'Cannot complete survey. Ensure survey data (roof type & condition) is filled.',
      );
    } finally {
      setConfirmAction(null);
    }
  }, [activity, confirmAction, completeVisitMutation, completeSurveyMutation]);

  if (isLoading) {
    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Skeleton variant="text" width={200} height={24} />
        <Skeleton variant="rectangular" height={128} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={128} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  if (!activity) {
    return (
      <EmptyState
        icon={<CalendarTodayIcon sx={{ width: '100%', height: '100%' }} />}
        title="No site activity yet"
        description="No site activity has been recorded for this property."
      />
    );
  }

  const statusConf = STATUS_CONFIG[activity.overallStatus];
  const isCancelled = activity.overallStatus === SiteActivityStatus.CANCELLED;
  const isCompleted = activity.overallStatus === SiteActivityStatus.COMPLETED;

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Status Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {activity.activityNumber}
          </Typography>
          <Chip label={statusConf.label} color={statusConf.color} size="small" />
        </Box>
        <Typography variant="caption" color="text.secondary">
          Created {formatDate(activity.createdAt)}
        </Typography>
      </Box>

      {/* Two-Phase Progress */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
        <PhaseCard
          title="Site Visit"
          done={activity.isSiteVisitDone}
          disabled={isCancelled || isCompleted}
          canComplete={!activity.isSiteVisitDone && !isCancelled}
          onComplete={() => setConfirmAction('visit')}
          isPending={completeVisitMutation.isPending}
        >
          <VisitDataSummary activity={activity} />
        </PhaseCard>

        <PhaseCard
          title="Site Survey"
          done={activity.isSiteSurveyDone}
          disabled={!activity.isSiteVisitDone || isCancelled || isCompleted}
          canComplete={activity.isSiteVisitDone && !activity.isSiteSurveyDone && !isCancelled}
          onComplete={() => setConfirmAction('survey')}
          isPending={completeSurveyMutation.isPending}
        >
          <SurveyDataSummary activity={activity} />
        </PhaseCard>
      </Box>

      {/* Documents */}
      <Card variant="outlined">
        <CardHeader
          title="Site Activity Documents"
          titleTypographyProps={{ variant: 'body2', fontWeight: 600 }}
          sx={{ pb: 0 }}
        />
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <DocumentManager
            entityType={DocumentEntityType.SITE_ACTIVITY}
            entityId={activity.id}
            title="Site Activity Documents"
            description="Upload photos and documents captured during the site visit or survey."
            readOnly={isCancelled}
          />
        </CardContent>
      </Card>

      {/* Complete Action Confirmation */}
      <MUIDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        size="sm"
      >
        <MUIDialogHeader>
          <MUIDialogTitle>
            {confirmAction === 'visit' ? 'Complete Site Visit' : 'Complete Site Survey'}
          </MUIDialogTitle>
          <MUIDialogDescription>
            {confirmAction === 'visit'
              ? 'This will mark the site visit phase as complete.'
              : 'This will mark the site survey as complete.'}
          </MUIDialogDescription>
        </MUIDialogHeader>
        <MUIDialogBody>
          <Typography variant="body2" color="text.secondary">
            {confirmAction === 'visit'
              ? 'Ensure GPS coordinates and roof area have been captured before completing.'
              : 'Ensure all survey data (roof type, condition, etc.) is filled before completing.'}
          </Typography>
        </MUIDialogBody>
        <MUIDialogFooter>
          <Button variant="outlined" onClick={() => setConfirmAction(null)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void handleConfirmAction()}>
            Complete
          </Button>
        </MUIDialogFooter>
      </MUIDialog>
    </Box>
  );
}

function PhaseCard({
  title,
  done,
  disabled,
  canComplete,
  onComplete,
  isPending,
  children,
}: {
  title: string;
  done: boolean;
  disabled: boolean;
  canComplete: boolean;
  onComplete: () => void;
  isPending: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Card variant="outlined" sx={{ opacity: disabled && !done ? 0.6 : 1 }}>
      <CardHeader
        title={title}
        titleTypographyProps={{ variant: 'body2', fontWeight: 600 }}
        action={
          done ? (
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
              label="Done"
              color="success"
              size="small"
            />
          ) : disabled ? (
            <Chip icon={<LockIcon sx={{ fontSize: 14 }} />} label="Locked" size="small" />
          ) : (
            <Chip label="Pending" color="warning" size="small" />
          )
        }
        sx={{ pb: 0 }}
      />
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
        {children}
        {canComplete && (
          <Button
            variant="contained"
            size="small"
            onClick={onComplete}
            disabled={isPending}
            fullWidth
          >
            {isPending ? 'Completing...' : `Complete ${title}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function VisitDataSummary({ activity }: { activity: SiteActivity }): JSX.Element {
  const gps = activity.gpsCoordinates;
  const roofArea = activity.availableRoofAreaSqft;
  const shading = activity.shadingAnalysis;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <DataRow
        icon={<GpsFixedIcon sx={{ fontSize: 16 }} />}
        label={gps ? `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}` : 'GPS not captured'}
      />
      <DataRow
        icon={<StraightenIcon sx={{ fontSize: 16 }} />}
        label={roofArea ? `${roofArea} sq ft` : 'Roof area not measured'}
      />
      <DataRow
        icon={<WbSunnyIcon sx={{ fontSize: 16 }} />}
        label={
          shading
            ? shading.hasShading
              ? `Shading: ${shading.shadingPercentage ?? '?'}%`
              : 'No shading'
            : 'Shading not assessed'
        }
      />
      {activity.notes && (
        <Typography variant="caption" color="text.disabled">
          {activity.notes}
        </Typography>
      )}
    </Box>
  );
}

function SurveyDataSummary({ activity }: { activity: SiteActivity }): JSX.Element {
  const survey = activity.surveyData;

  if (!survey) {
    return (
      <Typography variant="caption" color="text.disabled">
        {activity.isSiteVisitDone
          ? 'Survey data not yet captured. Complete the survey to proceed.'
          : 'Complete the site visit first to unlock the survey phase.'}
      </Typography>
    );
  }

  const rows: { label: string; value: string }[] = [];
  if (survey.roofType) rows.push({ label: 'Roof Type', value: survey.roofType });
  if (survey.roofCondition) rows.push({ label: 'Condition', value: survey.roofCondition });
  if (survey.roofOrientation) rows.push({ label: 'Orientation', value: survey.roofOrientation });
  if (survey.roofTiltAngle != null)
    rows.push({ label: 'Tilt Angle', value: `${survey.roofTiltAngle}°` });
  if (survey.structuralAssessment)
    rows.push({ label: 'Structural', value: survey.structuralAssessment });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {rows.map((row) => (
        <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.disabled">
            {row.label}
          </Typography>
          <Typography variant="caption" fontWeight={500} sx={{ textTransform: 'capitalize' }}>
            {row.value}
          </Typography>
        </Box>
      ))}
      {survey.recommendations && (
        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
          {survey.recommendations}
        </Typography>
      )}
    </Box>
  );
}

function DataRow({ icon, label }: { icon: React.ReactNode; label: string }): JSX.Element {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
