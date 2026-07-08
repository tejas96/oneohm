'use client';

import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import NextLink from 'next/link';
import type { JSX } from 'react';

import { useCustomerProjects } from '../../hooks';
import { TabSkeleton } from '../tab-skeleton';

import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { formatDate, toTitleLabel } from '@/lib/utils';

export interface ProjectsTabProps {
  customerId: string;
  enabled: boolean;
}

export function ProjectsTab({ customerId, enabled }: ProjectsTabProps): JSX.Element {
  const { data: projects, isLoading } = useCustomerProjects(customerId, { enabled });

  if (isLoading) {
    return <TabSkeleton />;
  }

  if (!projects || projects.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <FolderOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          No projects yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Projects will appear here once a quote is accepted.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} mb={2}>
        Projects ({projects.length})
      </Typography>
      <Grid container spacing={2}>
        {projects.map((project) => (
          <Grid key={project.id} size={{ xs: 12, md: 6, lg: 4 }}>
            <Card
              variant="outlined"
              sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  mb={1}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={600} noWrap>
                      {project.projectNumber}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {project.name}
                    </Typography>
                  </Box>
                  <Chip label={toTitleLabel(project.status)} size="small" color="info" />
                </Stack>

                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  {getPropertyDisplayName(project.property)}
                  {project.systemSizeKw ? ` · ${project.systemSizeKw} kW` : ''}
                </Typography>

                <Stack direction="row" spacing={1} mb={1.5}>
                  {project.quoteNumber && (
                    <Chip label={`Quote ${project.quoteNumber}`} size="small" variant="outlined" />
                  )}
                  <Chip label={toTitleLabel(project.priority)} size="small" color="warning" />
                </Stack>

                <Box>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="caption">{project.progressPercentage}%</Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={project.progressPercentage}
                    sx={{ height: 6, borderRadius: 1 }}
                  />
                </Box>

                {(project.startDate || project.endDate) && (
                  <Typography variant="caption" color="text.disabled" display="block" mt={1}>
                    {project.startDate ? formatDate(project.startDate) : '—'}
                    {' → '}
                    {project.endDate ? formatDate(project.endDate) : '—'}
                  </Typography>
                )}
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                <Button
                  component={NextLink}
                  href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: project.id })}
                  size="small"
                  endIcon={<OpenInNewIcon />}
                >
                  View Project
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
