'use client';

import { Box, Chip, Divider, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { type JSX, useMemo } from 'react';

import {
  type CustomerPropertyResponse,
  useCustomerFollowups,
  useCustomerProjects,
  useCustomerQuotes,
  useCustomerServiceRequests,
} from '../../hooks';
import { TabSkeleton } from '../tab-skeleton';

import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { useOrgReceipts } from '@/lib/hooks/resources';
import { formatCurrency, formatDate, toTitleLabel } from '@/lib/utils';

export interface ActivityTabProps {
  customerId: string;
  properties: CustomerPropertyResponse[];
  enabled: boolean;
}

type ActivityKind = 'followup' | 'quote' | 'receipt' | 'service';

interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  subtitle: string;
  date: string;
  timestamp: number;
}

const KIND_LABELS: Record<ActivityKind, string> = {
  followup: 'Follow-up',
  quote: 'Quote',
  receipt: 'Receipt',
  service: 'Service',
};

const KIND_COLORS: Record<ActivityKind, 'default' | 'primary' | 'success' | 'warning' | 'info'> = {
  followup: 'warning',
  quote: 'primary',
  receipt: 'success',
  service: 'info',
};

export function ActivityTab({ customerId, properties, enabled }: ActivityTabProps): JSX.Element {
  const { data: followupsData, isLoading: followupsLoading } = useCustomerFollowups(customerId, {
    enabled,
  });
  const { data: quotesData, isLoading: quotesLoading } = useCustomerQuotes(customerId, {
    enabled,
    limit: 20,
    page: 1,
  });
  const { data: receiptsData, isLoading: receiptsLoading } = useOrgReceipts(
    { customerId, page: 1, limit: 20 },
    { enabled },
  );
  const { data: serviceRequests, isLoading: serviceLoading } = useCustomerServiceRequests(
    customerId,
    { enabled },
  );
  const { data: projects } = useCustomerProjects(customerId, { enabled });

  const propertyMap = useMemo(
    () => new Map(properties.map((property) => [property.id, property])),
    [properties],
  );
  const projectMap = useMemo(
    () => new Map((projects ?? []).map((project) => [project.id, project])),
    [projects],
  );

  const events = useMemo((): ActivityEvent[] => {
    const items: ActivityEvent[] = [];

    for (const followup of followupsData?.data ?? []) {
      const propertyLabel = followup.property
        ? getPropertyDisplayName(followup.property as CustomerPropertyResponse)
        : 'Customer-level';
      items.push({
        id: `followup-${followup.id}`,
        kind: 'followup',
        title: followup.subject,
        subtitle: `${toTitleLabel(followup.type)} · ${toTitleLabel(followup.status)} · ${propertyLabel}`,
        date: followup.scheduledAt,
        timestamp: new Date(followup.scheduledAt).getTime(),
      });
    }

    for (const quote of quotesData?.data ?? []) {
      const propertyLabel =
        quote.propertyName ||
        (quote.propertyId ? propertyMap.get(quote.propertyId)?.propertyName : undefined) ||
        '—';
      items.push({
        id: `quote-${quote.id}`,
        kind: 'quote',
        title: quote.quoteNumber,
        subtitle: `${toTitleLabel(quote.status)} · ${propertyLabel}${
          quote.finalPrice ? ` · ${formatCurrency(quote.finalPrice)}` : ''
        }`,
        date: quote.quoteDate,
        timestamp: new Date(quote.quoteDate).getTime(),
      });
    }

    for (const receipt of receiptsData?.data ?? []) {
      const project = projectMap.get(receipt.projectId);
      items.push({
        id: `receipt-${receipt.id}`,
        kind: 'receipt',
        title: receipt.paymentNumber,
        subtitle: `${receipt.projectNumber}${
          project ? ` · ${project.name}` : ''
        } · ${formatCurrency(Number(receipt.paidAmount))}`,
        date: receipt.createdAt,
        timestamp: new Date(receipt.createdAt).getTime(),
      });
    }

    for (const request of serviceRequests ?? []) {
      const project = projectMap.get(request.projectId);
      const propertyLabel = project ? getPropertyDisplayName(project.property) : '—';
      items.push({
        id: `service-${request.id}`,
        kind: 'service',
        title: request.issueTitle,
        subtitle: `${request.requestNumber} · ${toTitleLabel(request.status)} · ${propertyLabel}`,
        date: request.requestDate,
        timestamp: new Date(request.requestDate).getTime(),
      });
    }

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [
    followupsData?.data,
    quotesData?.data,
    receiptsData?.data,
    serviceRequests,
    propertyMap,
    projectMap,
  ]);

  const isLoading = followupsLoading || quotesLoading || receiptsLoading || serviceLoading;

  if (isLoading && events.length === 0) {
    return <TabSkeleton />;
  }

  if (events.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          No activity yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Follow-ups, quotes, receipts, and service requests will appear here.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} mb={2}>
        Activity Timeline
      </Typography>
      <Paper variant="outlined" sx={{ p: 0 }}>
        {isLoading ? (
          <Stack spacing={1} sx={{ p: 2 }}>
            <Skeleton height={48} />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </Stack>
        ) : (
          <Stack divider={<Divider flexItem />} sx={{ p: 2 }}>
            {events.map((event) => (
              <Stack
                key={event.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ sm: 'flex-start' }}
                sx={{ py: 1.5 }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ minWidth: 96, flexShrink: 0 }}
                >
                  {formatDate(event.date)}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.25} flexWrap="wrap">
                    <Typography variant="body2" fontWeight={600}>
                      {event.title}
                    </Typography>
                    <Chip
                      label={KIND_LABELS[event.kind]}
                      size="small"
                      color={KIND_COLORS[event.kind]}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {event.subtitle}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
