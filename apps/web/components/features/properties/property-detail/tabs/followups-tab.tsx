'use client';

import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import {
  Box,
  Button,
  Chip,
  Paper,
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
  FollowupCompleteDialog,
  FollowupReassignDialog,
  FollowupRescheduleDialog,
  FollowupRowActions,
  OUTCOME_LABELS,
  useCancelFollowup,
  type FollowupResponse,
} from '@/components/features/followups';
import { showToast } from '@/components/ui';
import { formatDate, getErrorMessage, toTitleLabel } from '@/lib/utils';

interface FollowupsTabProps {
  propertyId: string;
  enabled: boolean;
  onLogFollowup: () => void;
  /**
   * Opens the property's mark-as-lost dialog.
   *
   * Without it the complete dialog's "Not interested → Mark lost" path never
   * renders, because it is gated on this callback being present.
   */
  onMarkLost?: () => void;
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

export function FollowupsTab({
  propertyId,
  enabled,
  onLogFollowup,
  onMarkLost,
}: FollowupsTabProps): JSX.Element {
  const { data, isLoading } = usePropertyFollowups(propertyId, { enabled });
  const followups = data?.data ?? [];

  const [completing, setCompleting] = useState<FollowupResponse | null>(null);
  const [rescheduling, setRescheduling] = useState<FollowupResponse | null>(null);
  const [reassigning, setReassigning] = useState<FollowupResponse[]>([]);
  const cancelMutation = useCancelFollowup();

  // Pending followups on this lead unit other than the one being completed.
  // Zero is the only case where scheduling the next one is mandatory.
  const pendingSiblings = useMemo(
    () =>
      followups.filter((f) => f.status === FollowupStatus.PENDING && f.id !== completing?.id)
        .length,
    [followups, completing?.id],
  );

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle2" fontWeight={600}>
          Follow-ups ({followups.length})
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<EventNoteOutlinedIcon />}
          onClick={onLogFollowup}
        >
          Log Follow-up
        </Button>
      </Stack>

      {!isLoading && followups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No follow-ups logged for this property yet.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Subject</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Scheduled</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Outcome</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {followups.map((followup) => (
                <TableRow key={followup.id} hover>
                  <TableCell
                    title={followup.subject}
                    sx={{
                      maxWidth: 280,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {followup.subject}
                  </TableCell>
                  <TableCell>{toTitleLabel(followup.type)}</TableCell>
                  <TableCell>{formatDate(followup.scheduledAt)}</TableCell>
                  <TableCell>{ownerName(followup)}</TableCell>
                  <TableCell>
                    <Chip
                      label={toTitleLabel(followup.status)}
                      size="small"
                      color={followup.status === FollowupStatus.COMPLETED ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>{followup.outcome ? OUTCOME_LABELS[followup.outcome] : '—'}</TableCell>
                  <TableCell align="right">
                    <FollowupRowActions
                      followup={followup}
                      onComplete={setCompleting}
                      onReschedule={setRescheduling}
                      onReassign={(f) => setReassigning([f])}
                      onCancel={(f) =>
                        cancelMutation.mutate(f.id, {
                          onSuccess: () =>
                            showToast.success('Follow-up cancelled — the lead now needs a new one'),
                          onError: (error) => showToast.error(getErrorMessage(error)),
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
    </Box>
  );
}
