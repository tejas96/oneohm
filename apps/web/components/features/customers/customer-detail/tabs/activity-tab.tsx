'use client';

import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { type JSX, type ReactElement, useMemo, useState } from 'react';

import {
  type CustomerPropertyResponse,
  useCustomerFollowups,
  useCustomerProjects,
  useCustomerQuotes,
} from '../../hooks';
import {
  DetailCard,
  EmptyPane,
  IconCircle,
  Mono,
  SectionHeading,
  TonePill,
  type DetailTone,
} from '../primitives';

import { getPropertyDisplayName } from '@/components/features/properties/utils';
import {
  SERVICE_TICKET_STATUS_LABELS,
  useServiceTickets,
} from '@/components/features/service-tickets';
import { useLedgerEntries } from '@/lib/hooks/resources/ledger';
import { formatCurrency, formatDate, toTitleLabel } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

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

const KIND_LABELS = {
  followup: 'Follow-up',
  quote: 'Quote',
  receipt: 'Receipt',
  service: 'Service',
} satisfies Record<ActivityKind, string>;

const KIND_TONE = {
  followup: 'warning',
  quote: 'accent',
  receipt: 'success',
  service: 'info',
} satisfies Record<ActivityKind, DetailTone>;

const KIND_ICON = {
  followup: <EventNoteOutlinedIcon />,
  quote: <DescriptionOutlinedIcon />,
  receipt: <ReceiptLongOutlinedIcon />,
  service: <BuildOutlinedIcon />,
} satisfies Record<ActivityKind, ReactElement>;

const KIND_ORDER: readonly ActivityKind[] = ['followup', 'quote', 'receipt', 'service'];

export function ActivityTab({ customerId, properties, enabled }: ActivityTabProps): JSX.Element {
  const [kindFilter, setKindFilter] = useState<ActivityKind | null>(null);

  const { data: followupsData, isLoading: followupsLoading } = useCustomerFollowups(customerId, {
    enabled,
  });
  const { data: quotesData, isLoading: quotesLoading } = useCustomerQuotes(customerId, {
    enabled,
    limit: 20,
    page: 1,
  });
  const { data: ledgerReceiptsData, isLoading: receiptsLoading } = useLedgerEntries(
    { customerId, direction: 'in', page: 1, limit: 20 },
    { enabled },
  );
  const { data: projects } = useCustomerProjects(customerId, { enabled });
  const { data: ticketData, isLoading: ticketsLoading } = useServiceTickets(
    { customerId, limit: 50 },
    enabled,
  );

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

    for (const entry of ledgerReceiptsData?.data ?? []) {
      if (entry.entryType !== 'receipt' || entry.direction !== 'in') continue;
      const project = projectMap.get(entry.projectId ?? '');
      const recordedNote =
        entry.valueDate !== entry.createdAt.slice(0, 10)
          ? ` · recorded ${formatDate(entry.createdAt)}`
          : '';
      items.push({
        id: `receipt-${entry.id}`,
        kind: 'receipt',
        title: entry.entryNo,
        subtitle: `${entry.projectNumber ?? project?.projectNumber ?? '—'}${
          project ? ` · ${project.name}` : ''
        } · ${formatPaise(entry.amountPaise)}${recordedNote}`,
        date: entry.valueDate,
        timestamp: new Date(entry.valueDate).getTime(),
      });
    }

    for (const ticket of ticketData?.items ?? []) {
      items.push({
        id: `service-${ticket.id}`,
        kind: 'service',
        title: ticket.title,
        subtitle: `${ticket.ticketNumber} · ${SERVICE_TICKET_STATUS_LABELS[ticket.status]} · ${ticket.projectNumber}`,
        date: ticket.createdAt,
        timestamp: new Date(ticket.createdAt).getTime(),
      });
    }

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [
    followupsData?.data,
    quotesData?.data,
    ledgerReceiptsData?.data,
    ticketData?.items,
    propertyMap,
    projectMap,
  ]);

  const counts = useMemo(() => {
    const tally: Record<ActivityKind, number> = {
      followup: 0,
      quote: 0,
      receipt: 0,
      service: 0,
    };
    for (const event of events) tally[event.kind] += 1;
    return tally;
  }, [events]);

  const visible = kindFilter ? events.filter((event) => event.kind === kindFilter) : events;

  const isLoading = followupsLoading || quotesLoading || receiptsLoading || ticketsLoading;

  if (isLoading && events.length === 0) {
    return (
      <DetailCard>
        <Stack gap={2}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Stack key={index} direction="row" gap={1.5} alignItems="center">
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="text" sx={{ flex: 1 }} height={32} />
            </Stack>
          ))}
        </Stack>
      </DetailCard>
    );
  }

  if (events.length === 0) {
    return (
      <DetailCard>
        <EmptyPane
          size="page"
          icon={<HistoryOutlinedIcon />}
          title="No activity yet"
          description="Follow-ups, quotes, receipts and service tickets will collect here as this customer moves."
        />
      </DetailCard>
    );
  }

  return (
    <Stack gap={1.5}>
      <SectionHeading count={events.length} sx={{ mb: 0 }}>
        Activity
      </SectionHeading>

      {/* Client-side narrowing over what is already loaded — no extra requests. */}
      <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
        <TonePill
          label={`All ${events.length}`}
          tone={kindFilter === null ? 'accent' : 'neutral'}
          onClick={() => setKindFilter(null)}
        />
        {KIND_ORDER.filter((kind) => counts[kind] > 0).map((kind) => (
          <TonePill
            key={kind}
            label={`${KIND_LABELS[kind]} ${counts[kind]}`}
            tone={kindFilter === kind ? KIND_TONE[kind] : 'neutral'}
            dot={kindFilter === kind}
            onClick={() => setKindFilter(kindFilter === kind ? null : kind)}
          />
        ))}
      </Stack>

      <DetailCard>
        <Stack gap={0}>
          {visible.map((event, index) => {
            const isLast = index === visible.length - 1;
            return (
              <Stack key={event.id} direction="row" gap={1.5} sx={{ position: 'relative' }}>
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  <IconCircle tone={KIND_TONE[event.kind]}>{KIND_ICON[event.kind]}</IconCircle>
                  {/*
                   * The rail is the one hairline on the page. It is not a
                   * structural border — it is the thread the events hang from,
                   * which is exactly what a timeline is.
                   */}
                  {!isLast && (
                    <Box
                      aria-hidden
                      sx={{
                        position: 'absolute',
                        left: '50%',
                        top: 36,
                        bottom: -8,
                        width: '1px',
                        transform: 'translateX(-50%)',
                        bgcolor: 'var(--ds-canvas-sunken)',
                      }}
                    />
                  )}
                </Box>

                <Box sx={{ minWidth: 0, flex: 1, pb: isLast ? 0 : 2.5 }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ sm: 'baseline' }}
                    gap={{ xs: 0, sm: 2 }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: 'var(--ds-text-primary)',
                        lineHeight: 1.4,
                        minWidth: 0,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {event.title}
                    </Typography>
                    <Mono
                      sx={{
                        fontSize: '0.6875rem',
                        color: 'var(--ds-text-tertiary)',
                        flexShrink: 0,
                      }}
                    >
                      {formatDate(event.date)}
                    </Mono>
                  </Stack>
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: 'var(--ds-text-secondary)',
                      lineHeight: 1.45,
                    }}
                  >
                    {event.subtitle}
                  </Typography>
                </Box>
              </Stack>
            );
          })}
        </Stack>
      </DetailCard>
    </Stack>
  );
}
