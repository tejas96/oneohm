'use client';

import { Box, Button, TextField } from '@mui/material';
import { nextFollowupDate } from '@tejas96/shared/types';
import { useEffect, useState, type JSX } from 'react';

import { useEmployees } from '@/components/features/employees';
import {
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
} from '@/components/ui';
import { MUIDatePicker } from '@/components/ui/mui-date-picker';
import { MUIUserAssigneeSelector } from '@/components/ui/mui-user-assignee-selector';
import { color, radius } from '@/lib/theme/tokens';
import { useAuth } from '@/providers/auth-provider';

export interface CustomerFollowupFields {
  scheduledAt: Date;
  assignedToUserId: string;
  subject: string;
  notes?: string;
}

const DEFAULT_SUBJECT = 'Follow up to add site';

interface ScheduleCustomerFollowupDialogProps {
  open: boolean;
  onBack: () => void;
  onConfirm: (fields: CustomerFollowupFields) => void;
  isSubmitting?: boolean;
}

export function ScheduleCustomerFollowupDialog({
  open,
  onBack,
  onConfirm,
  isSubmitting = false,
}: ScheduleCustomerFollowupDialogProps): JSX.Element {
  const { user } = useAuth();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees({ enabled: open });

  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [assignedToUserId, setAssignedToUserId] = useState<string | null>(null);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setSubject(DEFAULT_SUBJECT);
    setNotes('');
    setScheduledAt(nextFollowupDate(new Date(), null));
  }, [open]);

  useEffect(() => {
    if (!open || employeesLoading) return;
    const selectable = employees.some((employee) => employee.userId === user?.id);
    setAssignedToUserId(selectable ? (user?.id ?? null) : null);
  }, [open, employees, employeesLoading, user?.id]);

  const canSubmit = Boolean(subject.trim() && scheduledAt && assignedToUserId);

  const handleConfirm = (): void => {
    if (!scheduledAt || !assignedToUserId) return;
    onConfirm({
      scheduledAt,
      assignedToUserId,
      subject: subject.trim(),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <MUIDialog
      open={open}
      onOpenChange={() => {
        // Required gate — only explicit Back closes without saving.
      }}
      disableEscapeKeyDown
      size="default"
    >
      <MUIDialogHeader hideCloseButton>
        <MUIDialogTitle>Schedule a follow-up</MUIDialogTitle>
        <MUIDialogDescription>
          Without a site on file, schedule a follow-up so this lead stays on someone&apos;s list.
        </MUIDialogDescription>
      </MUIDialogHeader>

      <MUIDialogBody>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            p: '13px 15px',
            borderRadius: radius['rf-lg'],
            background: color['canvas-sunken'],
          }}
        >
          <TextField
            fullWidth
            size="small"
            label="Subject"
            required
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            disabled={isSubmitting}
          />

          <MUIDatePicker
            fieldLabel="Next follow-up"
            required
            value={scheduledAt}
            onChange={setScheduledAt}
            fullWidth
            disabled={isSubmitting}
          />

          <MUIUserAssigneeSelector
            fieldLabel="Owner"
            required
            value={assignedToUserId}
            onChange={setAssignedToUserId}
            employees={employees}
            optionsLoading={employeesLoading}
            disabled={isSubmitting}
            popoverPlacement="above"
            triggerMinWidth={0}
          />

          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={isSubmitting}
          />
        </Box>
      </MUIDialogBody>

      <MUIDialogFooter>
        <Button variant="outlined" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button variant="contained" onClick={handleConfirm} disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save customer'}
        </Button>
      </MUIDialogFooter>
    </MUIDialog>
  );
}
