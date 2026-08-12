'use client';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EngineeringOutlinedIcon from '@mui/icons-material/EngineeringOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import { ProjectPriority, ProjectStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import type { JSX } from 'react';

import type { CustomerPropertyResponse } from '../../hooks';

import {
  DetailCard,
  EmptyPane,
  Field,
  IconCircle,
  Mono,
  SectionHeading,
  TonePill,
  TONE_INK,
  type DetailTone,
} from '@/components/features/customers/customer-detail/primitives';
import type { ProjectDetail } from '@/components/features/projects/hooks/types';
import { useProject } from '@/components/features/projects/hooks/use-project-detail';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import {
  formatCurrency,
  formatDate,
  formatSystemSize,
  hasSystemSizeVariance,
  toTitleLabel,
} from '@/lib/utils';

export interface ProjectTabProps {
  property: CustomerPropertyResponse;
  enabled: boolean;
  onGoToProject: () => void;
  isInactiveCustomer: boolean;
}

const STATUS_TONE = {
  [ProjectStatus.PLANNING]: 'info',
  [ProjectStatus.ACTIVE]: 'accent',
  [ProjectStatus.ON_HOLD]: 'warning',
  [ProjectStatus.COMPLETED]: 'success',
  [ProjectStatus.CANCELLED]: 'danger',
} satisfies Record<ProjectStatus, DetailTone>;

/**
 * `satisfies` above proves the map covers every enum member; this widens the
 * *lookup* so a status the API adds before the frontend knows about it falls
 * back to neutral instead of indexing to `undefined`.
 */
function getStatusTone(status: string): DetailTone {
  return (STATUS_TONE as Record<string, DetailTone | undefined>)[status] ?? 'neutral';
}

/** Only priorities that mean "treat me differently" get a pill. */
function getPriorityTone(priority: ProjectPriority): DetailTone | null {
  if (priority === ProjectPriority.URGENT) return 'danger';
  if (priority === ProjectPriority.HIGH) return 'warning';
  return null;
}

/**
 * The installed capacity, with the selected one named beneath when they differ.
 * Picking `actual` silently — which this did — leaves no way to tell that the
 * subsidy was rated on a different number.
 */
function SystemSize({ project }: { project: ProjectDetail }): JSX.Element {
  const displayKw = project.actualSystemSizeKw ?? project.systemSizeKw;
  const sizeDiffers = hasSystemSizeVariance(project.actualSystemSizeKw, project.systemSizeKw);

  return (
    <Box sx={{ minWidth: 0 }}>
      <Mono>{displayKw != null ? `${formatSystemSize(displayKw)} kW` : '—'}</Mono>
      {sizeDiffers && project.systemSizeKw != null && (
        <Typography sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)' }}>
          selected {formatSystemSize(project.systemSizeKw)} kW
        </Typography>
      )}
    </Box>
  );
}

function ProgressBar({ value, tone }: { value: number; tone: DetailTone }): JSX.Element {
  const progress = Math.max(0, Math.min(100, value));
  return (
    <Box>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)' }}>
          Installation progress
        </Typography>
        <Mono sx={{ fontSize: '0.9375rem', fontWeight: 700 }} tone={tone}>
          {progress}%
        </Mono>
      </Stack>
      <Box
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        sx={{
          height: 6,
          borderRadius: 'var(--radius-pill)',
          bgcolor: 'var(--ds-canvas-sunken)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: `${progress}%`,
            height: '100%',
            borderRadius: 'var(--radius-pill)',
            bgcolor: TONE_INK[tone].ink,
            transition: 'width 320ms var(--ease-standard)',
          }}
        />
      </Box>
    </Box>
  );
}

export function ProjectTab({
  property,
  enabled,
  onGoToProject,
  isInactiveCustomer,
}: ProjectTabProps): JSX.Element {
  const linkedProjectId = property.project?.id ?? property.projectId ?? '';
  const { data: project, isLoading } = useProject(linkedProjectId, {
    enabled: enabled && !!linkedProjectId,
  });

  if (!linkedProjectId) {
    return (
      <DetailCard>
        <EmptyPane
          size="page"
          icon={<FolderOpenOutlinedIcon />}
          title="Not converted yet"
          description="Converting this site opens a project: a payment schedule, an installation plan and a place for the team to work."
          action={
            <Button
              size="small"
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={onGoToProject}
              disabled={isInactiveCustomer}
            >
              Convert to project
            </Button>
          }
        />
      </DetailCard>
    );
  }

  if (isLoading && !project) {
    return (
      <Skeleton
        variant="rounded"
        height={280}
        sx={{ borderRadius: 'var(--radius-card-functional)' }}
      />
    );
  }

  /*
   * The detail read can fail or be denied while the property still carries the
   * link, so the summary the property itself holds is the fallback rather than
   * an error state — the link is still worth offering.
   */
  const name = project?.name ?? property.project?.name ?? 'Project';
  const status = project?.status ?? property.project?.status;
  const statusTone = status ? getStatusTone(status) : 'neutral';
  const priorityTone = project ? getPriorityTone(project.priority) : null;
  const href = buildRoute(ROUTES.PROJECTS.DETAIL, { id: linkedProjectId });

  return (
    <Stack gap={1.5}>
      <SectionHeading
        sx={{ mb: 0 }}
        action={
          <Button
            size="small"
            variant="contained"
            component={NextLink}
            href={href}
            endIcon={<OpenInNewIcon />}
          >
            Open project
          </Button>
        }
      >
        Project
      </SectionHeading>

      <DetailCard>
        <Stack direction="row" alignItems="flex-start" gap={1.5}>
          <IconCircle tone={statusTone} size={40}>
            <EngineeringOutlinedIcon />
          </IconCircle>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" useFlexGap>
              <Typography
                sx={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: 'var(--ds-text-primary)',
                  minWidth: 0,
                }}
              >
                {name}
              </Typography>
              {status && <TonePill label={toTitleLabel(status)} tone={statusTone} dot />}
              {priorityTone && project && (
                <TonePill label={toTitleLabel(project.priority)} tone={priorityTone} dot />
              )}
            </Stack>
            {project?.projectNumber && (
              <Mono sx={{ fontSize: '0.75rem', color: 'var(--ds-text-tertiary)' }}>
                {project.projectNumber}
                {project.quoteNumber ? ` · from quote ${project.quoteNumber}` : ''}
              </Mono>
            )}
            {project?.description && (
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  color: 'var(--ds-text-secondary)',
                  lineHeight: 1.5,
                  mt: 1,
                }}
              >
                {project.description}
              </Typography>
            )}
          </Box>
        </Stack>

        {project && (
          <>
            <Box sx={{ mt: 2.5 }}>
              <ProgressBar
                value={project.progressPercentage}
                tone={project.progressPercentage >= 100 ? 'success' : 'accent'}
              />
            </Box>

            <Box
              sx={{
                mt: 2.5,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(150px, 1fr))' },
                columnGap: 2,
                rowGap: 1.75,
              }}
            >
              <Field label="System size" value={<SystemSize project={project} />} />
              <Field
                label="Started"
                value={project.startDate ? formatDate(project.startDate) : '—'}
                mono
              />
              <Field
                label="Target completion"
                value={project.endDate ? formatDate(project.endDate) : '—'}
                mono
              />
              <Field
                label="Panels"
                value={project.panelCount != null ? String(project.panelCount) : '—'}
                mono
              />
              <Field
                label="Inverters"
                value={project.inverterCount != null ? String(project.inverterCount) : '—'}
                mono
              />
              <Field
                label="Structure"
                value={project.structureType ? toTitleLabel(project.structureType) : '—'}
              />
              <Field
                label="Estimated cost"
                value={project.estimatedCost != null ? formatCurrency(project.estimatedCost) : '—'}
                mono
              />
              <Field
                label="Actual cost"
                value={project.actualCost != null ? formatCurrency(project.actualCost) : '—'}
                mono
              />
            </Box>
          </>
        )}
      </DetailCard>
    </Stack>
  );
}
