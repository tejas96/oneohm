'use client';

import {
  Alert,
  Box,
  Button,
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
  atDefaultHour,
  type LeadTemperature,
  nextFollowupDate,
} from '@tejas96/shared/types';
import { useEffect, useMemo, useState, type JSX } from 'react';

import { FollowupWhenPicker } from './followup-when-picker';
import { OUTCOME_LABELS } from '../constants';
import { useCompleteFollowup } from '../hooks';
import { type FollowupResponse } from '../hooks/use-followups';

import { useEmployees } from '@/components/features/employees';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  showToast,
} from '@/components/ui';
import { MUIUserAssigneeSelector } from '@/components/ui/mui-user-assignee-selector';
import { useGatedAction } from '@/lib/rbac';
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
  const markLost = useGatedAction('followups.manage', () => onMarkLost?.(), 'Mark lost');
  const complete = useGatedAction(
    'followups.manage',
    () => submit('accepted'),
    'Complete follow-up',
  );
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
    setNextDate(atDefaultHour(nextFollowupDate(new Date(), temperature)));
    setNextSubject('');
  }, [open, temperature]);

  /**
   * Default the next owner to the current user, but only once they are a
   * selectable option — see the same note in FollowupDrawer. A hidden value
   * behind an "Assign user" placeholder is worse than an honestly empty field.
   */
  useEffect(() => {
    if (!open || employeesLoading) return;
    const selectable = employees.some((employee) => employee.userId === user?.id);
    setNextOwner(selectable ? (user?.id ?? null) : null);
  }, [open, employees, employeesLoading, user?.id]);

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
    <MUIDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !completeMutation.isPending) onClose();
      }}
      /*
       * lg, not sm: this footer carries four actions — Cancel plus the three
       * exits the flow allows. At sm (400px) they wrap and squeeze.
       */
      size="lg"
      disableEscapeKeyDown={completeMutation.isPending}
    >
      <MUIDialogHeader hideCloseButton={completeMutation.isPending}>
        <MUIDialogTitle>Complete follow-up</MUIDialogTitle>
        <MUIDialogDescription>
          {followup ? `${leadName} · ${followup.subject}` : 'Record what happened.'}
        </MUIDialogDescription>
      </MUIDialogHeader>

      <MUIDialogBody>
        <Stack
          spacing={2.5}
          useFlexGap
          sx={{
            /*
             * See followup-drawer.tsx: the theme's `marginTop: 6` on labelled
             * FormControls overrides Stack's margin-based spacing, so spacing moves
             * to CSS `gap` and the margin is zeroed.
             */
            '& > .MuiFormControl-root:has(> .MuiInputLabel-root)': { mt: 0 },
          }}
        >
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
                <Button
                  size="small"
                  onClick={markLost.onGatedClick}
                  aria-disabled={!markLost.allowed}
                >
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
            <Stack
              spacing={2}
              useFlexGap
              sx={{ '& > .MuiFormControl-root:has(> .MuiInputLabel-root)': { mt: 0 } }}
            >
              <FollowupWhenPicker value={nextDate} onChange={setNextDate} required />
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
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button variant="outlined" onClick={onClose} disabled={completeMutation.isPending}>
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        {onMarkLost && (
          <Button
            color="error"
            onClick={markLost.onGatedClick}
            aria-disabled={!markLost.allowed}
            disabled={completeMutation.isPending}
          >
            Mark lost
          </Button>
        )}
        {followup?.propertyId && (
          <Button
            color="success"
            onClick={complete.onGatedClick}
            aria-disabled={!complete.allowed}
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
      </MUIDialogFooter>
    </MUIDialog>
  );
}
