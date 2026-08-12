'use client';

import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EngineeringOutlinedIcon from '@mui/icons-material/EngineeringOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { type JSX, type ReactElement, useMemo, useState } from 'react';

import {
  usePropertyFinanceSnapshot,
  usePropertyFollowups,
  usePropertyLoan,
  usePropertyQuoteSummary,
  type CustomerPropertyResponse,
} from '../../hooks';

import {
  DetailCard,
  EmptyPane,
  IconCircle,
  Mono,
  SectionHeading,
  TonePill,
  type DetailTone,
} from '@/components/features/customers/customer-detail/primitives';
import { useProject } from '@/components/features/projects/hooks/use-project-detail';
import { formatCurrency, formatDate, toTitleLabel } from '@/lib/utils';
import { formatPaise } from '@/lib/utils/paise';

export interface ActivityTabProps {
  property: CustomerPropertyResponse;
  enabled: boolean;
}

type ActivityKind = 'site' | 'followup' | 'quote' | 'receipt' | 'loan' | 'project';

interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  subtitle: string;
  date: string;
  timestamp: number;
}

const KIND_LABELS = {
  site: 'Site',
  followup: 'Follow-up',
  quote: 'Quote',
  receipt: 'Payment',
  loan: 'Loan',
  project: 'Project',
} satisfies Record<ActivityKind, string>;

const KIND_TONE = {
  site: 'neutral',
  followup: 'warning',
  quote: 'accent',
  receipt: 'success',
  loan: 'info',
  project: 'info',
} satisfies Record<ActivityKind, DetailTone>;

const KIND_ICON = {
  site: <HomeWorkOutlinedIcon />,
  followup: <EventNoteOutlinedIcon />,
  quote: <DescriptionOutlinedIcon />,
  receipt: <ReceiptLongOutlinedIcon />,
  loan: <AccountBalanceOutlinedIcon />,
  project: <EngineeringOutlinedIcon />,
} satisfies Record<ActivityKind, ReactElement>;

const KIND_ORDER: readonly ActivityKind[] = [
  'site',
  'followup',
  'quote',
  'receipt',
  'loan',
  'project',
];

export function ActivityTab({ property, enabled }: ActivityTabProps): JSX.Element {
  const [kindFilter, setKindFilter] = useState<ActivityKind | null>(null);

  const { data: followups, isLoading: followupsLoading } = usePropertyFollowups(property.id, {
    enabled,
  });
  const { quotes, isLoading: quotesLoading } = usePropertyQuoteSummary(property.id, { enabled });
  const { data: loan } = usePropertyLoan(property.id, { enabled });
  const projectId = property.project?.id ?? property.projectId ?? '';
  const { data: project } = useProject(projectId, { enabled: enabled && !!projectId });
  /*
   * Payments were missing from this timeline entirely — the one kind of event
   * a customer asks about by date. Same query the Finance tab runs, so it
   * costs nothing extra.
   */
  const { receipts, isLoading: receiptsLoading } = usePropertyFinanceSnapshot(projectId || null, {
    enabled,
  });

  const events = useMemo((): ActivityEvent[] => {
    const items: ActivityEvent[] = [];

    items.push({
      id: `site-${property.id}`,
      kind: 'site',
      title: 'Site added',
      subtitle: property.creatorName ? `Created by ${property.creatorName}` : 'Created',
      date: property.createdAt,
      timestamp: new Date(property.createdAt).getTime(),
    });

    if (property.siteVisitDone && property.siteVisitCompletedAt) {
      items.push({
        id: `visit-${property.id}`,
        kind: 'site',
        title: 'Site visit completed',
        subtitle: property.siteVisitAssigneeName ?? 'Visit marked complete',
        date: property.siteVisitCompletedAt,
        timestamp: new Date(property.siteVisitCompletedAt).getTime(),
      });
    }

    if (property.surveyDone && property.siteSurveyCompletedAt) {
      items.push({
        id: `survey-${property.id}`,
        kind: 'site',
        title: 'Technical survey completed',
        subtitle: property.siteSurveyAssigneeName ?? 'Survey marked complete',
        date: property.siteSurveyCompletedAt,
        timestamp: new Date(property.siteSurveyCompletedAt).getTime(),
      });
    }

    for (const followup of followups?.data ?? []) {
      items.push({
        id: `followup-${followup.id}`,
        kind: 'followup',
        title: followup.subject,
        subtitle: `${toTitleLabel(followup.type)} · ${toTitleLabel(followup.status)}`,
        date: followup.scheduledAt,
        timestamp: new Date(followup.scheduledAt).getTime(),
      });
    }

    for (const quote of quotes) {
      items.push({
        id: `quote-${quote.id}`,
        kind: 'quote',
        title: quote.quoteNumber,
        subtitle: `${toTitleLabel(quote.status)}${
          quote.finalPrice ? ` · ${formatCurrency(quote.finalPrice)}` : ''
        }`,
        date: quote.quoteDate,
        timestamp: new Date(quote.quoteDate).getTime(),
      });
    }

    for (const receipt of receipts) {
      const recordedNote =
        receipt.valueDate !== receipt.createdAt.slice(0, 10)
          ? ` · recorded ${formatDate(receipt.createdAt)}`
          : '';
      items.push({
        id: `receipt-${receipt.id}`,
        kind: 'receipt',
        title: receipt.entryNo,
        subtitle: `${formatPaise(receipt.amountPaise)} · ${receipt.paymentMethod ? toTitleLabel(receipt.paymentMethod) : 'Payment'}${recordedNote}`,
        date: receipt.valueDate,
        timestamp: new Date(receipt.valueDate).getTime(),
      });
    }

    if (loan) {
      items.push({
        id: `loan-${loan.id}`,
        kind: 'loan',
        title: loan.lenderName || 'Loan application',
        subtitle: `${toTitleLabel(loan.status)} · ${
          loan.loanAmount != null ? formatCurrency(loan.loanAmount) : 'Amount pending'
        }`,
        date: loan.updatedAt,
        timestamp: new Date(loan.updatedAt).getTime(),
      });
    }

    if (project) {
      items.push({
        id: `project-${project.id}`,
        kind: 'project',
        title: project.name || project.projectNumber,
        subtitle: `${project.projectNumber} · ${toTitleLabel(project.status)} · ${project.progressPercentage}% complete`,
        date: project.createdAt,
        timestamp: new Date(project.createdAt).getTime(),
      });
    }

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [property, followups?.data, quotes, receipts, loan, project]);

  const counts = useMemo(() => {
    const tally: Record<ActivityKind, number> = {
      site: 0,
      followup: 0,
      quote: 0,
      receipt: 0,
      loan: 0,
      project: 0,
    };
    for (const event of events) tally[event.kind] += 1;
    return tally;
  }, [events]);

  const visible = kindFilter ? events.filter((event) => event.kind === kindFilter) : events;
  const isLoading = followupsLoading || quotesLoading || receiptsLoading;

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
          description="Visits, quotes, payments and follow-ups will collect here as this site moves."
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
