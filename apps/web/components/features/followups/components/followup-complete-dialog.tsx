'use client';

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  FollowupOutcome,
  FollowupType,
  type LeadTemperature,
  nextFollowupDate,
} from '@tejas96/shared/types';
import { useEffect, useMemo, useState, type JSX } from 'react';

import { OUTCOME_LABELS } from '../constants';
import { useCompleteFollowup } from '../hooks';
import { type FollowupResponse } from '../hooks/use-followups';

import { useEmployees } from '@/components/features/employees';
import { showToast } from '@/components/ui';
import { MUIDatePicker } from '@/components/ui/mui-date-picker';
import { MUIUserAssigneeSelector } from '@/components/ui/mui-user-assignee-selector';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

interface FollowupCompleteDialogProps {
  open: boolean;
  followup: FollowupResponse | null;
  /**
   * Pending followups on the same lead unit, EXCLUDING this one.
   * Zero means completing this leaves the lead with nobody owing it an action,
   * which is the only case where scheduling the next one is mandatory.
   */
  pendingSiblings: number;
  onClose: () => void;
  /** Omit to hide the lost path (e.g. where the caller has no reason prompt). */
  onMarkLost?: () => void;
}

const OUTCOMES = Object.values(FollowupOutcome);

export function FollowupCompleteDialog({
  open,
  followup,
  pendingSiblings,
  onClose,
  onMarkLost,
}: FollowupCompleteDialogProps): JSX.Element {
  const { user } = useAuth();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees({ enabled: open });
  const completeMutation = useCompleteFollowup();

  const [outcome, setOutcome] = useState<FollowupOutcome>(FollowupOutcome.CALL_BACK_LATER);
  const [notes, setNotes] = useState('');
  const [scheduleNext, setScheduleNext] = useState(true);
  const [nextDate, setNextDate] = useState<Date | null>(null);
  const [nextOwner, setNextOwner] = useState<string | null>(null);
  const [nextSubject, setNextSubject] = useState('');

  const nextRequired = pendingSiblings === 0;
  const temperature = (followup?.property?.leadTemperature as LeadTemperature | undefined) ?? null;

  useEffect(() => {
    if (!open) return;
    setOutcome(FollowupOutcome.CALL_BACK_LATER);
    setNotes('');
    setScheduleNext(true);
    setNextDate(nextFollowupDate(new Date(), temperature));
    setNextOwner(user?.id ?? null);
    setNextSubject('');
  }, [open, temperature, user?.id]);

  const notesRequired = outcome === FollowupOutcome.OTHER;
  const wantsNext = nextRequired || scheduleNext;

  const canSubmit = useMemo(() => {
    if (notesRequired && !notes.trim()) return false;
    if (wantsNext && (!nextDate || !nextOwner || !nextSubject.trim())) return false;
    return true;
  }, [notesRequired, notes, wantsNext, nextDate, nextOwner, nextSubject]);

  const submit = (terminal?: 'accepted'): void => {
    if (!followup) return;

    completeMutation.mutate(
      {
        id: followup.id,
        outcome,
        notes: notes.trim() || undefined,
        ...(terminal
          ? { terminal }
          : wantsNext && nextDate && nextOwner
            ? {
                next: {
                  scheduledAt: nextDate.toISOString(),
                  assignedToUserId: nextOwner,
                  subject: nextSubject.trim(),
                  type: FollowupType.TASK,
                },
              }
            : {}),
      },
      {
        onSuccess: () => {
          showToast.success(
            terminal ? 'Quote accepted — follow-ups closed' : 'Follow-up completed',
          );
          onClose();
        },
        onError: (error) => showToast.error(getErrorMessage(error)),
      },
    );
  };

  const leadName = followup?.property?.propertyName ?? followup?.property?.city ?? 'Customer lead';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Complete follow-up</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {followup && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                {leadName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {followup.subject}
              </Typography>
            </Box>
          )}

          <TextField
            select
            fullWidth
            size="small"
            label="What happened?"
            value={outcome}
            onChange={(event) => setOutcome(event.target.value as FollowupOutcome)}
          >
            {OUTCOMES.map((value) => (
              <MenuItem key={value} value={value}>
                {OUTCOME_LABELS[value]}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            label={notesRequired ? 'Notes (required)' : 'Notes'}
            required={notesRequired}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            helperText={
              notesRequired ? 'Say what "other" means, so it can be counted later.' : undefined
            }
          />

          {outcome === FollowupOutcome.NOT_INTERESTED && onMarkLost && (
            <Alert
              severity="info"
              action={
                <Button size="small" onClick={onMarkLost}>
                  Mark lost
                </Button>
              }
            >
              Not interested usually means this lead is dead.
            </Alert>
          )}

          <Divider />

          <Box>
            <Typography variant="subtitle2" fontWeight={600}>
              Next follow-up {nextRequired && '(required)'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {nextRequired
                ? 'This is the only open follow-up — schedule the next one, or close the lead.'
                : `${pendingSiblings} other follow-up${
                    pendingSiblings === 1 ? '' : 's'
                  } still open on this lead.`}
            </Typography>
          </Box>

          {!nextRequired && (
            <FormControlLabel
              control={
                <Switch
                  checked={scheduleNext}
                  onChange={(event) => setScheduleNext(event.target.checked)}
                />
              }
              label="Schedule another follow-up"
            />
          )}

          {wantsNext && (
            <Stack spacing={2}>
              <MUIDatePicker
                fieldLabel="Date"
                required
                value={nextDate}
                onChange={setNextDate}
                fullWidth
              />
              <MUIUserAssigneeSelector
                fieldLabel="Owner"
                required
                value={nextOwner}
                onChange={setNextOwner}
                employees={employees}
                optionsLoading={employeesLoading}
                disablePortal
              />
              <TextField
                fullWidth
                size="small"
                label="Subject"
                required
                value={nextSubject}
                onChange={(event) => setNextSubject(event.target.value)}
                placeholder="e.g. Follow up on discount request"
              />
            </Stack>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={completeMutation.isPending}>
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        {onMarkLost && (
          <Button color="error" onClick={onMarkLost} disabled={completeMutation.isPending}>
            Mark lost
          </Button>
        )}
        {followup?.propertyId && (
          <Button
            color="success"
            onClick={() => submit('accepted')}
            disabled={completeMutation.isPending}
          >
            Quote accepted
          </Button>
        )}
        <Button
          variant="contained"
          onClick={() => submit()}
          disabled={!canSubmit || completeMutation.isPending}
        >
          {wantsNext ? 'Save & schedule next' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
