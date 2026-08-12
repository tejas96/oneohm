'use client';

import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import {
  Box,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { ProjectPriority, ProjectStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import type { JSX } from 'react';

import { useCustomerProjects, type CustomerProjectItem } from '../../hooks';
import {
  DetailCard,
  EmptyPane,
  IconCircle,
  Mono,
  RowSkeleton,
  SectionHeading,
  TonePill,
  TONE_INK,
  type DetailTone,
} from '../primitives';
import { detailTableSx, tableCardSx } from '../styles';

import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { formatDate, formatSystemSize, toTitleLabel } from '@/lib/utils';

export interface ProjectsTabProps {
  customerId: string;
  enabled: boolean;
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
 * back to neutral instead of indexing to `undefined` and throwing in
 * `TONE_INK`.
 */
function getStatusTone(status: string): DetailTone {
  return (STATUS_TONE as Record<string, DetailTone | undefined>)[status] ?? 'neutral';
}

/**
 * Only priorities that mean "treat me differently" get a pill. Printing a
 * warning-coloured chip on every project including the normal ones makes the
 * colour that should mean "look here" mean nothing.
 */
const NOTABLE_PRIORITY_TONE = {
  [ProjectPriority.HIGH]: 'warning',
  [ProjectPriority.URGENT]: 'danger',
} satisfies Partial<Record<ProjectPriority, DetailTone>>;

function getPriorityTone(priority: ProjectPriority): DetailTone | null {
  if (priority === ProjectPriority.HIGH) return NOTABLE_PRIORITY_TONE[ProjectPriority.HIGH];
  if (priority === ProjectPriority.URGENT) return NOTABLE_PRIORITY_TONE[ProjectPriority.URGENT];
  return null;
}

function ProgressCell({ value }: { value: number }): JSX.Element {
  const progress = Math.max(0, Math.min(100, value));
  const isComplete = progress >= 100;

  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <Box
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        sx={{
          flex: 1,
          minWidth: 56,
          height: 5,
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
            bgcolor: isComplete ? TONE_INK.success.ink : TONE_INK.accent.ink,
            transition: 'width 320ms var(--ease-standard)',
          }}
        />
      </Box>
      <Mono
        sx={{
          fontSize: '0.75rem',
          fontWeight: 600,
          minWidth: 32,
          textAlign: 'right',
          color: isComplete ? TONE_INK.success.ink : 'var(--ds-text-primary)',
        }}
      >
        {progress}%
      </Mono>
    </Stack>
  );
}

function ProjectRow({ project }: { project: CustomerProjectItem }): JSX.Element {
  const statusTone = getStatusTone(project.status);
  const priorityTone = getPriorityTone(project.priority);
  const href = buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id });

  return (
    <TableRow>
      <TableCell>
        <Stack direction="row" alignItems="center" gap={1.25} sx={{ minWidth: 0 }}>
          <IconCircle tone={statusTone}>
            <FolderOpenOutlinedIcon />
          </IconCircle>
          <Box sx={{ minWidth: 0 }}>
            <Box
              component={NextLink}
              href={href}
              sx={{
                display: 'block',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--ds-link)',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {project.projectNumber}
            </Box>
            <Typography
              sx={{
                fontSize: '0.6875rem',
                color: 'var(--ds-text-tertiary)',
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.name}
              {project.quoteNumber ? ` · Quote ${project.quoteNumber}` : ''}
            </Typography>
          </Box>
        </Stack>
      </TableCell>

      <TableCell sx={{ color: 'var(--ds-text-secondary)' }}>
        {getPropertyDisplayName(project.property)}
      </TableCell>

      <TableCell>
        <Mono>{project.systemSizeKw ? `${formatSystemSize(project.systemSizeKw)} kW` : '—'}</Mono>
      </TableCell>

      {/*
       * The bar is the only cell that paints edge to edge, so the cell gutter
       * alone reads as nothing between it and the column next door. Ending the
       * bar short of the boundary restores the gap without widening anything.
       */}
      <TableCell sx={{ pr: 2.5 }}>
        <ProgressCell value={project.progressPercentage} />
      </TableCell>

      <TableCell>
        <Mono sx={{ fontSize: '0.75rem', color: 'var(--ds-text-secondary)' }}>
          {project.startDate ? formatDate(project.startDate) : '—'}
        </Mono>
        <Typography sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)' }}>
          to {project.endDate ? formatDate(project.endDate) : '—'}
        </Typography>
      </TableCell>

      <TableCell>
        <Stack direction="row" alignItems="center" gap={0.5} flexWrap="wrap" useFlexGap>
          <TonePill label={toTitleLabel(project.status)} tone={statusTone} dot />
          {priorityTone && (
            <TonePill label={toTitleLabel(project.priority)} tone={priorityTone} dot />
          )}
        </Stack>
      </TableCell>

      <TableCell align="right">
        <IconButton
          size="small"
          component={NextLink}
          href={href}
          aria-label={`Open project ${project.projectNumber}`}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

export function ProjectsTab({ customerId, enabled }: ProjectsTabProps): JSX.Element {
  const { data: projects, isLoading } = useCustomerProjects(customerId, { enabled });

  if (isLoading) {
    return (
      <Box sx={tableCardSx}>
        <RowSkeleton rows={3} />
      </Box>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <DetailCard>
        <EmptyPane
          size="page"
          icon={<FolderOpenOutlinedIcon />}
          title="No projects yet"
          description="A project opens automatically once a quote is accepted, and installation tracking starts there."
        />
      </DetailCard>
    );
  }

  return (
    <Stack gap={1.5}>
      <SectionHeading count={projects.length} sx={{ mb: 0 }}>
        Projects
      </SectionHeading>

      <Box sx={tableCardSx}>
        <TableContainer>
          <Table size="small" sx={detailTableSx}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 230 }}>Project</TableCell>
                <TableCell sx={{ minWidth: 150 }}>Site</TableCell>
                <TableCell sx={{ minWidth: 90 }}>System</TableCell>
                <TableCell sx={{ minWidth: 150 }}>Progress</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Timeline</TableCell>
                <TableCell sx={{ minWidth: 130 }}>Status</TableCell>
                <TableCell align="right" sx={{ width: 56 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {projects.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Stack>
  );
}
