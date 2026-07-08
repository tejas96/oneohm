'use client';

import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import type { JSX } from 'react';

import type { CustomerPropertyResponse } from '../../hooks';

import { useProject } from '@/components/features/projects/hooks/use-project-detail';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { toTitleLabel } from '@/lib/utils';

interface ProjectTabProps {
  property: CustomerPropertyResponse;
  enabled: boolean;
}

export function ProjectTab({ property, enabled }: ProjectTabProps): JSX.Element {
  const fallbackProjectId = property.project?.id ?? property.projectId ?? '';
  const { data: project } = useProject(fallbackProjectId, {
    enabled: enabled && !!fallbackProjectId,
  });

  const projectName = property.project?.name || project?.name;
  const projectStatus = property.project?.status || project?.status;
  const projectId = property.project?.id || project?.id;

  return (
    <Box sx={{ p: 2 }}>
      <Card variant="outlined">
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {!projectId ? (
            <Typography variant="body2" color="text.secondary">
              No project linked to this property yet.
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              <Typography variant="subtitle2" fontWeight={600}>
                {projectName || 'Project'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status: {projectStatus ? toTitleLabel(projectStatus) : '—'}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                endIcon={<OpenInNewIcon />}
                href={buildRoute(ROUTES.PROJECTS.DETAIL, { id: projectId })}
                sx={{ alignSelf: 'flex-start' }}
              >
                Open Project
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
