'use client';

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
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
import { FollowupPriority, FollowupStatus } from '@tejas96/shared/types';
import type { JSX } from 'react';

import { useCompletePropertyFollowup, usePropertyFollowups } from '../../hooks';

import { formatDate, toTitleLabel } from '@/lib/utils';

interface FollowupsTabProps {
  propertyId: string;
  enabled: boolean;
  onLogFollowup: () => void;
}

export function FollowupsTab({
  propertyId,
  enabled,
  onLogFollowup,
}: FollowupsTabProps): JSX.Element {
  const { data, isLoading } = usePropertyFollowups(propertyId, { enabled });
  const completeMutation = useCompletePropertyFollowup();
  const followups = data?.data ?? [];

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
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {followups.map((followup) => (
                <TableRow key={followup.id} hover>
                  <TableCell>{followup.subject}</TableCell>
                  <TableCell>{toTitleLabel(followup.type)}</TableCell>
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
                      color={followup.status === FollowupStatus.COMPLETED ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {followup.status === FollowupStatus.PENDING && (
                      <Button
                        size="small"
                        startIcon={<CheckCircleOutlineIcon />}
                        onClick={() => completeMutation.mutate(followup.id)}
                        disabled={completeMutation.isPending}
                      >
                        Complete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
