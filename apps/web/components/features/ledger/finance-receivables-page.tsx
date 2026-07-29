'use client';

import {
  Button,
  Card,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { type JSX, useState } from 'react';

import { MUIStatusChip, MUITypography } from '@/components/ui';
import { useReceivables, type Receivable } from '@/lib/hooks/resources/ledger';
import { formatPaise } from '@/lib/utils/paise';

/** Ageing buckets. Colour is never the only signal — the label carries it too. */
function bucket(days: number): { label: string; color: string } {
  if (days <= 0) return { label: 'Current', color: 'text.secondary' };
  if (days <= 30) return { label: '1–30 days', color: 'warning.main' };
  if (days <= 60) return { label: '31–60 days', color: 'warning.main' };
  if (days <= 90) return { label: '61–90 days', color: 'error.main' };
  return { label: '90+ days', color: 'error.main' };
}

/**
 * Who owes us money, milestone by milestone.
 *
 * This is the client's requirement stated almost verbatim: "per milestone how
 * many customer amount is pending — a customer who needs to pay 10k but paid
 * only 2k should be flagged that he has not paid 8k under the 1st milestone."
 *
 * Waived milestones never appear: the backend view excludes them, so a written-
 * off residual stops being chased. In the old system the dashboard dropped it
 * while the project page kept reporting it, forever.
 *
 * Every figure comes from the API. There is deliberately no client-side total —
 * the old AR table summed only the rows currently visible and labelled the
 * result "Total", which is how a month-end reconciliation went wrong.
 */
export function FinanceReceivablesPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const limit = 50;
  const query = useReceivables(page, limit);

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <MUITypography variant="drawerTitle" component="h1">
          Receivables
        </MUITypography>
        <MUITypography variant="body" sx={{ mt: 0.25 }}>
          Every open milestone, worst overdue first. Waived amounts are excluded.
        </MUITypography>
      </header>

      {query.isLoading ? (
        <Skeleton variant="rounded" height={320} />
      ) : rows.length === 0 ? (
        <Card variant="outlined" sx={{ p: 6, textAlign: 'center', borderStyle: 'dashed' }}>
          <MUITypography variant="bodyPrimary" fontWeight={500}>
            Nothing outstanding.
          </MUITypography>
          <MUITypography variant="body" sx={{ mt: 0.5 }}>
            Every active milestone has been paid in full.
          </MUITypography>
        </Card>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Project</TableCell>
                  <TableCell>Milestone</TableCell>
                  <TableCell align="right">Expected</TableCell>
                  <TableCell align="right">Received</TableCell>
                  <TableCell align="right">Short by</TableCell>
                  <TableCell>Ageing</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <Row key={r.milestoneId} row={r} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {total > limit && (
            <div className="flex items-center justify-between gap-3">
              <MUITypography variant="body">
                {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </MUITypography>
              <div className="flex gap-2">
                <Button size="small" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  size="small"
                  disabled={page * limit >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Row({ row }: { row: Receivable }): JSX.Element {
  const age = bucket(row.daysOverdue);
  const toPaise = (v: number): number => Math.round((v ?? 0) * 100);

  const numeric = { whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' } as const;

  return (
    <TableRow hover>
      <TableCell>{row.customerName ?? '—'}</TableCell>
      <TableCell>
        <span className="block">{row.projectNumber}</span>
        <MUITypography variant="finePrint" component="span" sx={{ display: 'block' }}>
          {row.projectName}
        </MUITypography>
      </TableCell>
      <TableCell>
        <span className="flex flex-wrap items-center gap-1.5">
          <MUITypography variant="finePrint" component="span">
            #{row.displayOrder}
          </MUITypography>
          <span>{row.milestoneName}</span>
          {/* The bank's share, not the customer's — never chase them for it. */}
          {row.payerType === 'lender' && (
            <MUIStatusChip label="Bank pays" color="info" size="small" autoColor={false} />
          )}
        </span>
      </TableCell>
      <TableCell align="right" sx={{ ...numeric, color: 'text.secondary' }}>
        {formatPaise(toPaise(row.expectedAmount))}
      </TableCell>
      <TableCell align="right" sx={numeric}>
        {formatPaise(toPaise(row.paidAmount))}
      </TableCell>
      <TableCell align="right" sx={{ ...numeric, fontWeight: 500, color: 'error.main' }}>
        {formatPaise(toPaise(row.outstandingAmount))}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12, color: age.color }}>
        {age.label}
        {row.daysOverdue > 0 && ` · ${row.daysOverdue}d`}
      </TableCell>
    </TableRow>
  );
}
