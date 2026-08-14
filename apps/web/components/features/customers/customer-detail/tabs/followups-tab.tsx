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

import { useCustomerFollowups, type CustomerPropertyResponse } from '../../hooks';
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

import {
  FollowupCompleteDialog,
  FollowupReassignDialog,
  FollowupRescheduleDialog,
  FollowupRowActions,
  OUTCOME_LABELS,
  useCancelFollowup,
  type FollowupResponse,
} from '@/components/features/followups';
import { MarkAsLostDialog } from '@/components/features/properties';
import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { showToast } from '@/components/ui';
import { useGatedAction } from '@/lib/rbac';
import { formatDate, getErrorMessage, toTitleLabel } from '@/lib/utils';

export interface FollowupsTabProps {
  customerId: string;
  enabled: boolean;
  onSchedule: () => void;
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

function getScopeLabel(
  property?: { id: string; propertyName?: string; city?: string } | null,
): string {
  if (!property) return 'Customer-level';
  return getPropertyDisplayName(property as CustomerPropertyResponse);
}

/** The assignee is the lead's owner — there is no separate owner field. */
function ownerName(followup: FollowupResponse): string {
  return (
    [followup.assignedToUser?.firstName, followup.assignedToUser?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Unassigned'
  );
}

export function FollowupsTab({ customerId, enabled, onSchedule }: FollowupsTabProps): JSX.Element {
  const scheduleAction = useGatedAction('followups.manage', onSchedule, 'Schedule follow-up');
  const { data, isLoading } = useCustomerFollowups(customerId, { enabled });
  const followups = useMemo(() => data?.data ?? [], [data?.data]);

  const [completing, setCompleting] = useState<FollowupResponse | null>(null);
  const [markingLost, setMarkingLost] = useState<{ id: string; name: string } | null>(null);
  const [rescheduling, setRescheduling] = useState<FollowupResponse | null>(null);
  const [reassigning, setReassigning] = useState<FollowupResponse[]>([]);
  const cancelMutation = useCancelFollowup();

  /**
   * Pending followups on the SAME lead unit as the one being completed.
   *
   * This list spans the whole customer, so it must be narrowed to the matching
   * propertyId — counting a sibling property's followups here would wrongly
   * make the next-followup block optional and let a site go dark.
   */
  const pendingSiblings = useMemo(() => {
    if (!completing) return 0;
    const unitId = completing.propertyId ?? null;
    return followups.filter(
      (f) =>
        f.status === FollowupStatus.PENDING &&
        f.id !== completing.id &&
        (f.propertyId ?? null) === unitId,
    ).length;
  }, [followups, completing]);

  const overdueCount = useMemo(
    () =>
      followups.filter(
        (f) =>
          f.status === FollowupStatus.PENDING && new Date(f.scheduledAt).getTime() < Date.now(),
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
      onClick={scheduleAction.onGatedClick}
      aria-disabled={!scheduleAction.allowed}
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
              description="Schedule the next conversation so this customer stays on someone's list."
              action={scheduleButton}
            />
          </DetailCard>
        ) : (
          <Box sx={tableCardSx}>
            <TableContainer>
              <Table size="small" sx={detailTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 240 }}>Follow-up</TableCell>
                    <TableCell sx={{ minWidth: 140 }}>Scope</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>Scheduled</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>Owner</TableCell>
                    <TableCell sx={{ minWidth: 130 }}>Status</TableCell>
                    <TableCell align="right" sx={{ width: 60 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {followups.map((followup) => {
                    const tone: DetailTone = STATUS_TONE[followup.status] ?? 'neutral';
                    const isOverdue =
                      followup.status === FollowupStatus.PENDING &&
                      new Date(followup.scheduledAt).getTime() < Date.now();

                    return (
                      <TableRow key={followup.id}>
                        {/*
                         * Subject and notes are free text with no length limit
                         * — real records run to hundreds of characters. Without
                         * a ceiling here one of those stretches the row wider
                         * than the viewport and pushes every column after it
                         * off the right edge.
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

                        <TableCell sx={{ color: 'var(--ds-text-secondary)' }}>
                          {getScopeLabel(followup.property)}
                        </TableCell>

                        <TableCell>
                          <Mono
                            sx={{
                              color: isOverdue ? TONE_INK.danger.ink : 'var(--ds-text-primary)',
                              fontWeight: isOverdue ? 600 : 400,
                            }}
                          >
                            {formatDate(followup.scheduledAt)}
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

                        <TableCell align="right">
                          <FollowupRowActions
                            followup={followup}
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
        /*
         * Only property-level followups can be marked lost from here — losing a
         * site is a per-site action. A customer-level lead has no site to lose,
         * so the path is correctly absent there.
         */
        onMarkLost={
          completing?.propertyId
            ? () => {
                const target = {
                  id: completing.propertyId as string,
                  name: getScopeLabel(completing.property),
                };
                setCompleting(null);
                setMarkingLost(target);
              }
            : undefined
        }
      />

      {markingLost && (
        <MarkAsLostDialog
          open
          onClose={() => setMarkingLost(null)}
          propertyId={markingLost.id}
          propertyName={markingLost.name}
        />
      )}

      <FollowupRescheduleDialog followup={rescheduling} onClose={() => setRescheduling(null)} />
      <FollowupReassignDialog followups={reassigning} onClose={() => setReassigning([])} />
    </>
  );
}
