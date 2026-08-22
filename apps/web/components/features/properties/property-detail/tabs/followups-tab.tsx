'use client';

import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import {
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { FollowupStatus } from '@tejas96/shared/types';
import { useMemo, useState, type JSX } from 'react';

import { usePropertyFollowups } from '../../hooks';

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
} from '@/components/features/customers/customer-detail/primitives';
import { detailTableSx, tableCardSx } from '@/components/features/customers/customer-detail/styles';
import {
  FollowupCompleteDialog,
  FollowupReassignDialog,
  FollowupRescheduleDialog,
  FollowupRowActions,
  OUTCOME_LABELS,
  useCancelFollowup,
  followupIsPastDue,
  type FollowupResponse,
} from '@/components/features/followups';
import { showToast } from '@/components/ui';
import { formatFollowupWhen, getErrorMessage, toTitleLabel } from '@/lib/utils';

export interface FollowupsTabProps {
  propertyId: string;
  enabled: boolean;
  onLogFollowup: () => void;
  /**
   * Opens the site's mark-as-lost dialog.
   *
   * Without it the complete dialog's "Not interested → Mark lost" path never
   * renders, because it is gated on this callback being present.
   */
  onMarkLost?: () => void;
  onViewFollowup: (followupId: string) => void;
}

const STATUS_TONE = {
  [FollowupStatus.PENDING]: 'warning',
  [FollowupStatus.COMPLETED]: 'success',
  [FollowupStatus.CANCELLED]: 'neutral',
} satisfies Record<FollowupStatus, DetailTone>;

const TRUNCATE_SX = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

/** The assignee is the lead's owner — there is no separate owner field. */
function ownerName(followup: FollowupResponse): string {
  return (
    [followup.assignedToUser?.firstName, followup.assignedToUser?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Unassigned'
  );
}

export function FollowupsTab({
  propertyId,
  enabled,
  onLogFollowup,
  onMarkLost,
  onViewFollowup,
}: FollowupsTabProps): JSX.Element {
  const { data, isLoading } = usePropertyFollowups(propertyId, { enabled });
  const followups = useMemo(() => data?.data ?? [], [data?.data]);

  const [completing, setCompleting] = useState<FollowupResponse | null>(null);
  const [rescheduling, setRescheduling] = useState<FollowupResponse | null>(null);
  const [reassigning, setReassigning] = useState<FollowupResponse[]>([]);
  const cancelMutation = useCancelFollowup();

  /*
   * Pending follow-ups on this site other than the one being completed. Zero
   * is the only case where scheduling the next one is mandatory — the list is
   * already property-scoped, so no further narrowing is needed here.
   */
  const pendingSiblings = useMemo(
    () =>
      followups.filter((f) => f.status === FollowupStatus.PENDING && f.id !== completing?.id)
        .length,
    [followups, completing?.id],
  );

  const overdueCount = useMemo(
    () =>
      followups.filter(
        (f) => f.status === FollowupStatus.PENDING && followupIsPastDue(f.scheduledAt),
      ).length,
    [followups],
  );

  if (isLoading && followups.length === 0) {
    return (
      <Box sx={tableCardSx}>
        <RowSkeleton rows={5} />
      </Box>
    );
  }

  const scheduleButton = (
    <Button
      size="small"
      variant="contained"
      startIcon={<EventNoteOutlinedIcon />}
      onClick={onLogFollowup}
    >
      Schedule
    </Button>
  );

  return (
    <>
      <Stack gap={1.5}>
        <SectionHeading
          count={followups.length || undefined}
          sx={{ mb: 0 }}
          action={scheduleButton}
        >
          Follow-ups
        </SectionHeading>

        {overdueCount > 0 && (
          <TonePill
            label={`${overdueCount} pending follow-up${overdueCount > 1 ? 's are' : ' is'} past due`}
            tone="danger"
            dot
          />
        )}

        {followups.length === 0 ? (
          <DetailCard>
            <EmptyPane
              size="page"
              icon={<EventNoteOutlinedIcon />}
              title="No follow-ups yet"
              description="Schedule the next conversation so this site stays on someone's list."
              action={scheduleButton}
            />
          </DetailCard>
        ) : (
          <Box sx={tableCardSx}>
            <TableContainer>
              <Table size="small" sx={detailTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 260 }}>Follow-up</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>Scheduled</TableCell>
                    <TableCell sx={{ minWidth: 140 }}>Owner</TableCell>
                    <TableCell sx={{ minWidth: 140 }}>Status</TableCell>
                    <TableCell align="right" sx={{ width: 60 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {followups.map((followup) => {
                    const tone: DetailTone = STATUS_TONE[followup.status] ?? 'neutral';
                    const isOverdue =
                      followup.status === FollowupStatus.PENDING &&
                      followupIsPastDue(followup.scheduledAt);

                    return (
                      <TableRow
                        key={followup.id}
                        hover
                        role="button"
                        tabIndex={0}
                        sx={{ cursor: 'pointer' }}
                        onClick={() => onViewFollowup(followup.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onViewFollowup(followup.id);
                          }
                        }}
                      >
                        {/*
                         * Subject and notes are free text with no length limit
                         * — real records run to hundreds of characters. Without
                         * a ceiling here one of those stretches the row wider
                         * than the viewport and pushes Scheduled, Owner, Status
                         * and the row menu off the right edge.
                         */}
                        <TableCell sx={{ maxWidth: 340 }}>
                          <Stack direction="row" gap={1.25} sx={{ minWidth: 0 }}>
                            <IconCircle tone={isOverdue ? 'danger' : tone}>
                              <EventNoteOutlinedIcon />
                            </IconCircle>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                title={followup.subject}
                                sx={{
                                  fontSize: '0.8125rem',
                                  fontWeight: 600,
                                  color: 'var(--ds-text-primary)',
                                  lineHeight: 1.35,
                                  ...TRUNCATE_SX,
                                }}
                              >
                                {followup.subject.trim() || 'Untitled follow-up'}
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '0.6875rem',
                                  color: 'var(--ds-text-tertiary)',
                                  lineHeight: 1.4,
                                  ...TRUNCATE_SX,
                                }}
                              >
                                {toTitleLabel(followup.type)}
                                {followup.notes ? ` · ${followup.notes}` : ''}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Mono
                            sx={{
                              color: isOverdue ? TONE_INK.danger.ink : 'var(--ds-text-primary)',
                              fontWeight: isOverdue ? 600 : 400,
                            }}
                          >
                            {formatFollowupWhen(followup.scheduledAt)}
                          </Mono>
                          {isOverdue && (
                            <Typography
                              sx={{
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                color: TONE_INK.danger.ink,
                              }}
                            >
                              Past due
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell sx={{ color: 'var(--ds-text-secondary)' }}>
                          {ownerName(followup)}
                        </TableCell>

                        <TableCell>
                          <Stack gap={0.5} alignItems="flex-start">
                            <TonePill label={toTitleLabel(followup.status)} tone={tone} dot />
                            {followup.outcome && (
                              <Typography
                                sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)' }}
                              >
                                {OUTCOME_LABELS[followup.outcome]}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>

                        <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                          <FollowupRowActions
                            followup={followup}
                            onViewDetails={() => onViewFollowup(followup.id)}
                            onComplete={setCompleting}
                            onReschedule={setRescheduling}
                            onReassign={(f) => setReassigning([f])}
                            onCancel={(f) =>
                              cancelMutation.mutate(f.id, {
                                onSuccess: () =>
                                  showToast.success(
                                    'Follow-up cancelled — the lead now needs a new one',
                                  ),
                                onError: (error) => showToast.error(getErrorMessage(error)),
                              })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Stack>

      <FollowupCompleteDialog
        open={Boolean(completing)}
        followup={completing}
        pendingSiblings={pendingSiblings}
        onClose={() => setCompleting(null)}
        onMarkLost={
          onMarkLost
            ? () => {
                setCompleting(null);
                onMarkLost();
              }
            : undefined
        }
      />

      <FollowupRescheduleDialog followup={rescheduling} onClose={() => setRescheduling(null)} />
      <FollowupReassignDialog followups={reassigning} onClose={() => setReassigning([])} />
    </>
  );
}
