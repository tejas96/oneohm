'use client';

import { Box, Button, Paper } from '@mui/material';

import { type PoTotals } from './po-create-schema';

import { MUITypography } from '@/components/ui/mui-typography';
import { formatCurrency } from '@/lib/utils';

interface PoCreateSummaryProps {
  totals: PoTotals;
  isPending: boolean;
  onCancel: () => void;
}

export function PoCreateSummary({
  totals,
  isPending,
  onCancel,
}: PoCreateSummaryProps): React.JSX.Element {
  return (
    <Box className="sticky bottom-0 z-10 -mx-6 mt-2">
      <Paper elevation={3} square sx={{ borderTop: 1, borderColor: 'divider', px: 3, py: 1.5 }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="grid grid-cols-3 gap-x-6 gap-y-1 md:flex md:items-center md:gap-6">
            <SummaryCell label="Subtotal" value={formatCurrency(totals.subtotal)} />
            <SummaryCell label="Tax" value={formatCurrency(totals.taxAmount)} />
            <SummaryCell label="Total" value={formatCurrency(totals.totalAmount)} emphasized />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outlined" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create PO'}
            </Button>
          </div>
        </div>
      </Paper>
    </Box>
  );
}

interface SummaryCellProps {
  label: string;
  value: string;
  emphasized?: boolean;
}

function SummaryCell({ label, value, emphasized = false }: SummaryCellProps): React.JSX.Element {
  return (
    <div className="flex flex-col">
      <MUITypography variant="finePrint" className="text-foreground-secondary">
        {label}
      </MUITypography>
      <MUITypography variant={emphasized ? 'sectionTitle' : 'bodyPrimary'}>{value}</MUITypography>
    </div>
  );
}
