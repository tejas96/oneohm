'use client';

import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import { Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import { ServiceRequestPriority } from '@tejas96/shared/types';
import { type JSX, useMemo } from 'react';

import { useCustomerFeedback, useCustomerProjects, useCustomerServiceRequests } from '../../hooks';
import { TabSkeleton } from '../tab-skeleton';

import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { formatDate, toTitleLabel } from '@/lib/utils';

export interface ServiceTabProps {
  customerId: string;
  enabled: boolean;
}

export function ServiceTab({ customerId, enabled }: ServiceTabProps): JSX.Element {
  const { data: projects, isLoading: projectsLoading } = useCustomerProjects(customerId, {
    enabled,
  });
  const { data: requests, isLoading: requestsLoading } = useCustomerServiceRequests(customerId, {
    enabled,
  });
  const { data: feedback, isLoading: feedbackLoading } = useCustomerFeedback(customerId, {
    enabled,
  });

  const grouped = useMemo(() => {
    const projectMap = new Map((projects ?? []).map((project) => [project.id, project]));

    const byProject = new Map<
      string,
      {
        projectId: string;
        projectNumber: string;
        projectName: string;
        propertyLabel: string;
        requests: NonNullable<typeof requests>;
        feedback: NonNullable<typeof feedback>;
      }
    >();

    for (const project of projects ?? []) {
      byProject.set(project.id, {
        projectId: project.id,
        projectNumber: project.projectNumber,
        projectName: project.name,
        propertyLabel: getPropertyDisplayName(project.property),
        requests: [],
        feedback: [],
      });
    }

    for (const request of requests ?? []) {
      const bucket = byProject.get(request.projectId);
      if (bucket) {
        bucket.requests.push(request);
      } else {
        const fallback = projectMap.get(request.projectId);
        byProject.set(request.projectId, {
          projectId: request.projectId,
          projectNumber: fallback?.projectNumber ?? request.projectId.slice(0, 8),
          projectName: fallback?.name ?? 'Unknown project',
          propertyLabel: fallback ? getPropertyDisplayName(fallback.property) : '—',
          requests: [request],
          feedback: [],
        });
      }
    }

    for (const item of feedback ?? []) {
      const bucket = byProject.get(item.projectId);
      if (bucket) {
        bucket.feedback.push(item);
      }
    }

    return [...byProject.values()].sort((a, b) => a.projectNumber.localeCompare(b.projectNumber));
  }, [projects, requests, feedback]);

  const isLoading = projectsLoading || requestsLoading || feedbackLoading;

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
          Service requests and feedback are grouped by project. Convert a quote to see service
          history here.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} mb={2}>
        Service by Project
      </Typography>
      <Stack spacing={2}>
        {grouped.map((group) => (
          <Card key={group.projectId} variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {group.projectNumber} · {group.projectName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {group.propertyLabel}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5}>
                  <Chip
                    size="small"
                    icon={<SupportAgentOutlinedIcon />}
                    label={`${group.requests.length} request${group.requests.length === 1 ? '' : 's'}`}
                    color="info"
                  />
                  {group.feedback.length > 0 && (
                    <Chip
                      size="small"
                      icon={<StarOutlineIcon />}
                      label={`${group.feedback.length} feedback`}
                      color="success"
                    />
                  )}
                </Stack>
              </Stack>

              {group.requests.length === 0 && group.feedback.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No service activity for this project.
                </Typography>
              ) : (
                <Stack spacing={1.5} divider={<Divider flexItem />}>
                  {group.requests.map((request) => (
                    <Box key={request.id}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={0.25}>
                        <Typography variant="body2" fontWeight={500}>
                          {request.issueTitle}
                        </Typography>
                        <Chip label={toTitleLabel(request.status)} size="small" color="warning" />
                        <Chip
                          label={toTitleLabel(request.priority)}
                          size="small"
                          color={
                            request.priority === ServiceRequestPriority.HIGH ||
                            request.priority === ServiceRequestPriority.URGENT
                              ? 'error'
                              : 'default'
                          }
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {request.requestNumber} · {formatDate(request.requestDate)}
                      </Typography>
                      {request.issueDescription && (
                        <Typography variant="body2" color="text.secondary" mt={0.5}>
                          {request.issueDescription}
                        </Typography>
                      )}
                    </Box>
                  ))}

                  {group.feedback.map((item) => (
                    <Box key={item.id}>
                      <Typography variant="body2" fontWeight={500}>
                        Customer feedback
                        {item.overallRating != null ? ` · ${item.overallRating}/5` : ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(item.createdAt)}
                        {item.npsScore != null ? ` · NPS ${item.npsScore}` : ''}
                      </Typography>
                      {item.comments && (
                        <Typography variant="body2" color="text.secondary" mt={0.5}>
                          {item.comments}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
