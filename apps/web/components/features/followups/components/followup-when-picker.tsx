'use client';

import { Stack } from '@mui/material';
import { mergeFollowupDateTime } from '@tejas96/shared/types';
import type { JSX } from 'react';

import { MUIDatePicker } from '@/components/ui/mui-date-picker';
import { MUITimePicker } from '@/components/ui/mui-time-picker';

export interface FollowupWhenPickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  dateLabel?: string;
  timeLabel?: string;
  required?: boolean;
  disabled?: boolean;
  dateError?: string;
  timeError?: string;
}

/**
 * Date + time for follow-ups. Merges day and hour so a date change never zeros the clock.
 */
export function FollowupWhenPicker({
  value,
  onChange,
  dateLabel = 'Date',
  timeLabel = 'Time',
  required = false,
  disabled = false,
  dateError,
  timeError,
}: FollowupWhenPickerProps): JSX.Element {
  return (
    /*
     * Always stack date above time. A viewport `sm` row layout breaks inside
     * narrow dialogs (e.g. reschedule at 400px) — the time field gets clipped
     * when both pickers fight for half the content width.
     */
    <Stack direction="column" spacing={2} useFlexGap sx={{ width: '100%' }}>
      <MUIDatePicker
        fieldLabel={dateLabel}
        required={required}
        value={value}
        onChange={(d) => {
          if (d) onChange(mergeFollowupDateTime(value, 'date', d));
        }}
        fullWidth
        disabled={disabled}
        error={dateError}
      />
      <MUITimePicker
        fieldLabel={timeLabel}
        required={required}
        value={value}
        onChange={(t) => {
          if (t) onChange(mergeFollowupDateTime(value, 'time', t));
        }}
        fullWidth
        disabled={disabled}
        error={timeError}
      />
    </Stack>
  );
}
