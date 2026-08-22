'use client';

import { Box, type SxProps, type Theme } from '@mui/material';
import { TimePicker, type TimePickerProps } from '@mui/x-date-pickers/TimePicker';
import * as React from 'react';

import { MUIFieldLabel } from './mui-shared';

import {
  MUI_BORDER_COLOR,
  MUI_BORDER_RADIUS,
  MUI_FONT_SIZE,
  MUI_INPUT_HEIGHT,
} from '@/lib/theme/mui-theme';

export interface MUITimePickerProps extends Omit<TimePickerProps, 'value' | 'onChange'> {
  value?: Date | string | null;
  onChange?: (date: Date | null) => void;
  fieldLabel?: string;
  required?: boolean;
  tooltip?: React.ReactNode;
  error?: string;
  helperText?: string;
  placeholder?: string;
  fullWidth?: boolean;
  containerSx?: SxProps<Theme>;
}

function parseToDate(val: Date | string | null | undefined): Date | null {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) return val;
  const parsed = new Date(val);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameMinute(a: Date | null, b: Date | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return a.getTime() === b.getTime();
}

function MUITimePickerInner(
  {
    value,
    onChange,
    fieldLabel,
    required,
    tooltip,
    error,
    helperText,
    placeholder,
    fullWidth = true,
    containerSx,
    slotProps,
    ampm = true,
    format = 'hh:mm a',
    minutesStep = 5,
    ...pickerProps
  }: MUITimePickerProps,
  ref: React.ForwardedRef<HTMLDivElement>,
): React.JSX.Element {
  const [internalDate, setInternalDate] = React.useState<Date | null>(() => parseToDate(value));

  React.useEffect(() => {
    const incoming = parseToDate(value);
    if (!isSameMinute(incoming, internalDate)) {
      setInternalDate(incoming);
    }
  }, [value]);

  const handleChange = React.useCallback(
    (date: Date | null) => {
      if (date === null) return;
      setInternalDate(date);
      onChange?.(date);
    },
    [onChange],
  );

  const displayError = Boolean(error);

  return (
    <Box
      sx={{
        width: fullWidth ? '100%' : 'auto',
        ...(containerSx ? (containerSx as Record<string, unknown>) : {}),
      }}
    >
      <MUIFieldLabel fieldLabel={fieldLabel} required={required} tooltip={tooltip} />
      <TimePicker
        ref={ref}
        value={internalDate}
        onChange={handleChange}
        format={format}
        ampm={ampm}
        minutesStep={minutesStep}
        slotProps={{
          ...slotProps,
          field: {
            clearable: false,
            ...(slotProps?.field ?? {}),
          },
          textField: {
            size: 'small',
            fullWidth,
            error: displayError,
            helperText: error || helperText,
            placeholder: placeholder || 'hh:mm am',
            sx: {
              '& .MuiInputBase-root': {
                height: MUI_INPUT_HEIGHT,
                fontSize: MUI_FONT_SIZE,
                borderRadius: `${MUI_BORDER_RADIUS}px`,
                paddingRight: '8px',
              },
              '& .MuiInputBase-input': {
                padding: '6px 0 6px 10px',
                fontSize: MUI_FONT_SIZE,
                height: 'auto',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: MUI_BORDER_COLOR,
              },
              '& .MuiInputAdornment-root': {
                marginLeft: 0,
              },
            },
            ...(slotProps?.textField ?? {}),
          },
          popper: {
            placement: 'bottom-start' as const,
            disablePortal: false,
            sx: { zIndex: 1500 },
            ...(slotProps?.popper ?? {}),
          },
          desktopPaper: {
            sx: { boxShadow: 8 },
            ...(slotProps?.desktopPaper ?? {}),
          },
          openPickerButton: {
            size: 'small',
            sx: { padding: '4px' },
            ...(slotProps?.openPickerButton ?? {}),
          },
          openPickerIcon: {
            sx: { fontSize: 16 },
            ...(slotProps?.openPickerIcon ?? {}),
          },
        }}
        {...pickerProps}
      />
    </Box>
  );
}

export const MUITimePicker = React.forwardRef<HTMLDivElement, MUITimePickerProps>(
  MUITimePickerInner,
);
MUITimePicker.displayName = 'MUITimePicker';
