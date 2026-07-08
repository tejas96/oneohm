'use client';

import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import { type JSX, useMemo } from 'react';

import { usePropertyFollowups, usePropertyLoan, type CustomerPropertyResponse } from '../../hooks';

import { useProject } from '@/components/features/projects/hooks/use-project-detail';
import { usePropertyQuoteVersions } from '@/components/features/quotes';
import { formatCurrency, formatDate, toTitleLabel } from '@/lib/utils';

type ActivityKind = 'followup' | 'quote' | 'loan' | 'project';

interface ActivityItem {
  id: string;
  kind: ActivityKind;
  date: string;
  timestamp: number;
  title: string;
  subtitle: string;
}

const KIND_COLOR: Record<ActivityKind, 'warning' | 'primary' | 'info' | 'success'> = {
  followup: 'warning',
  quote: 'primary',
  loan: 'info',
  project: 'success',
};

interface ActivityTabProps {
  property: CustomerPropertyResponse;
  enabled: boolean;
}

export function ActivityTab({ property, enabled }: ActivityTabProps): JSX.Element {
  const { data: followups } = usePropertyFollowups(property.id, { enabled });
  const { data: quotes = [] } = usePropertyQuoteVersions(enabled ? property.id : undefined);
  const { data: loan } = usePropertyLoan(property.id, { enabled });
  const projectId = property.project?.id ?? property.projectId ?? '';
  const { data: project } = useProject(projectId, { enabled: enabled && !!projectId });

  const events = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = [];

    for (const followup of followups?.data ?? []) {
      items.push({
        id: `followup-${followup.id}`,
        kind: 'followup',
        date: followup.scheduledAt,
        timestamp: new Date(followup.scheduledAt).getTime(),
        title: followup.subject,
        subtitle: `${toTitleLabel(followup.type)} · ${toTitleLabel(followup.status)}`,
      });
    }

    for (const quote of quotes) {
      items.push({
        id: `quote-${quote.id}`,
        kind: 'quote',
        date: quote.quoteDate,
        timestamp: new Date(quote.quoteDate).getTime(),
        title: quote.quoteNumber,
        subtitle: `${toTitleLabel(quote.status)}${
          quote.effectivePrice ? ` · ${formatCurrency(quote.effectivePrice)}` : ''
        }`,
      });
    }

    if (loan) {
      items.push({
        id: `loan-${loan.id}`,
        kind: 'loan',
        date: loan.updatedAt,
        timestamp: new Date(loan.updatedAt).getTime(),
        title: loan.lenderName || 'Loan application',
        subtitle: `${toTitleLabel(loan.status)} · ${
          loan.loanAmount != null ? formatCurrency(loan.loanAmount) : 'Amount pending'
        }`,
      });
    }

    if (project) {
      items.push({
        id: `project-${project.id}`,
        kind: 'project',
        date: project.updatedAt,
        timestamp: new Date(project.updatedAt).getTime(),
        title: project.name || project.projectNumber,
        subtitle: `${toTitleLabel(project.status)} · ${project.projectNumber}`,
      });
    }

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [followups?.data, quotes, loan, project]);

  if (events.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          No activity captured for this property yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
        Activity Timeline
      </Typography>
      <Paper variant="outlined">
        <Stack divider={<Divider flexItem />} sx={{ p: 2 }}>
          {events.map((event) => (
            <Stack
              key={event.id}
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ sm: 'flex-start' }}
              sx={{ py: 1 }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 96 }}>
                {formatDate(event.date)}
              </Typography>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.25}>
                  <Typography variant="body2" fontWeight={600}>
                    {event.title}
                  </Typography>
                  <Chip
                    label={toTitleLabel(event.kind)}
                    size="small"
                    color={KIND_COLOR[event.kind]}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {event.subtitle}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
