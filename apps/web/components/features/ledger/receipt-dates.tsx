'use client';

import { Box, Tooltip } from '@mui/material';
import type { JSX } from 'react';

import { MUITypography } from '@/components/ui';
import { formatBusinessDate, formatDate } from '@/lib/utils';

export interface ReceiptDatesProps {
  valueDate: string;
  createdAt: string;
  valueDateIsInferred?: boolean;
  variant?: 'table' | 'inline';
}

/**
 * Received date (when money moved) plus recorded-on date (when keyed in).
 * KPI tiles use received date only; receipt rows and PDFs show both.
 */
export function ReceiptDates({
  valueDate,
  createdAt,
  valueDateIsInferred = false,
  variant = 'table',
}: ReceiptDatesProps): JSX.Element {
  // Both through formatDate: the value date was rendered as raw ISO while the
  // recorded date was humanised, so one cell read "2026-08-12 / Recorded
  // 14 Aug 2026" — two formats for two dates that invite comparison.
  const receivedLabel = formatBusinessDate(valueDate);
  const recordedLabel = `Recorded ${formatDate(createdAt)}`;

  if (variant === 'inline') {
    return (
      <span>
        {receivedLabel}
        {valueDateIsInferred && (
          <Tooltip title="Date inferred from the record's creation time">
            <span> ~</span>
          </Tooltip>
        )}
        <span style={{ color: 'var(--ds-text-tertiary)' }}> · {recordedLabel}</span>
      </span>
    );
  }

  return (
    <Box sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
      <Box component="span">
        {receivedLabel}
        {valueDateIsInferred && (
          <Tooltip title="Date inferred from the record's creation time">
            <span> ~</span>
          </Tooltip>
        )}
      </Box>
      <MUITypography variant="finePrint" sx={{ color: 'text.disabled', lineHeight: 1.3 }}>
        {recordedLabel}
      </MUITypography>
    </Box>
  );
}
