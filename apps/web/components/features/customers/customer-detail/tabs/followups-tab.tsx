'use client';

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import {
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { FollowupPriority, FollowupStatus } from '@tejas96/shared/types';
import { useMemo, useState, type JSX } from 'react';

import { useCustomerFollowups, type CustomerPropertyResponse } from '../../hooks';
import { TabSkeleton } from '../tab-skeleton';

import {
  FollowupCompleteDialog,
  OUTCOME_LABELS,
  type FollowupResponse,
} from '@/components/features/followups';
import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { formatDate, toTitleLabel } from '@/lib/utils';

export interface FollowupsTabProps {
  customerId: string;
  enabled: boolean;
  onSchedule: () => void;
}

function getScopeLabel(
  property?: { id: string; propertyName?: string; city?: string } | null,
): string {
  if (!property) return 'Customer-level';
  return getPropertyDisplayName(property as CustomerPropertyResponse);
}

export function FollowupsTab({ customerId, enabled, onSchedule }: FollowupsTabProps): JSX.Element {
  const { data, isLoading } = useCustomerFollowups(customerId, { enabled });
  const followups = data?.data ?? [];

  const [completing, setCompleting] = useState<FollowupResponse | null>(null);

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

  if (isLoading && followups.length === 0) {
    return <TabSkeleton />;
  }

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
          onClick={onSchedule}
        >
          Schedule
        </Button>
      </Stack>

      {followups.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            No follow-ups scheduled yet.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<EventNoteOutlinedIcon />}
            onClick={onSchedule}
          >
            Schedule follow-up
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Subject</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell>Scheduled</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Outcome</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton height={32} />
                      </TableCell>
                    </TableRow>
                  ))
                : followups.map((followup) => (
                    <TableRow key={followup.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {followup.subject}
                        </Typography>
                        {followup.notes && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {followup.notes}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{toTitleLabel(followup.type)}</TableCell>
                      <TableCell>{getScopeLabel(followup.property)}</TableCell>
                      <TableCell>{formatDate(followup.scheduledAt)}</TableCell>
                      <TableCell>
                        <Chip
                          label={toTitleLabel(followup.priority)}
                          size="small"
                          color={
                            followup.priority === FollowupPriority.HIGH
                              ? 'warning'
                              : followup.priority === FollowupPriority.LOW
                                ? 'default'
                                : 'info'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={toTitleLabel(followup.status)}
                          size="small"
                          color={
                            followup.status === FollowupStatus.COMPLETED ? 'success' : 'warning'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {followup.outcome ? OUTCOME_LABELS[followup.outcome] : '—'}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          {followup.status === FollowupStatus.PENDING && (
                            <Button
                              size="small"
                              startIcon={<CheckCircleOutlineIcon />}
                              onClick={() => setCompleting(followup)}
                            >
                              Complete
                            </Button>
                          )}
                          <Button size="small" onClick={onSchedule}>
                            Schedule
                          </Button>
                        </Stack>
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
      />
    </Box>
  );
}
