'use client';

import { Box, type SxProps, type Theme } from '@mui/material';
import * as React from 'react';

import { MUIDatePicker } from './mui-date-picker';
import { MUIFieldLabel } from './mui-shared';

export interface MUIDateRangePickerProps {
  fromDate?: Date | string | null;
  toDate?: Date | string | null;
  onFromChange?: (date: Date | null) => void;
  onToChange?: (date: Date | null) => void;
  fieldLabel?: string;
  required?: boolean;
  error?: string;
  className?: string;
  containerSx?: SxProps<Theme>;
}

export function MUIDateRangePicker({
  fromDate,
  toDate,
  onFromChange,
  onToChange,
  fieldLabel,
  required,
  error,
  className,
  containerSx,
}: MUIDateRangePickerProps): React.JSX.Element {
  return (
    <Box className={className} sx={containerSx}>
      {fieldLabel && <MUIFieldLabel fieldLabel={fieldLabel} required={required} />}
      <div className="flex flex-wrap items-center gap-2">
        <MUIDatePicker
          value={fromDate}
          onChange={onFromChange}
          placeholder="From"
          fullWidth={false}
          containerSx={{ minWidth: 140 }}
        />
        <span className="text-xs text-foreground-tertiary">to</span>
        <MUIDatePicker
          value={toDate}
          onChange={onToChange}
          placeholder="To"
          fullWidth={false}
          containerSx={{ minWidth: 140 }}
        />
      </div>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </Box>
  );
}

MUIDateRangePicker.displayName = 'MUIDateRangePicker';
