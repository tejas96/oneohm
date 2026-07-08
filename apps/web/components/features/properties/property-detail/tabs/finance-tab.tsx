'use client';

import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { JSX } from 'react';

import { usePropertyFinanceSnapshot, usePropertyLoan } from '../../hooks';

import { formatCurrency, formatDate, toTitleLabel } from '@/lib/utils';

interface FinanceTabProps {
  propertyId: string;
  projectId: string | null;
  enabled: boolean;
}

export function FinanceTab({ propertyId, projectId, enabled }: FinanceTabProps): JSX.Element {
  const {
    snapshot,
    openTerms,
    isLoading: financeLoading,
  } = usePropertyFinanceSnapshot(projectId, {
    enabled,
  });
  const { data: loan, isLoading: loanLoading } = usePropertyLoan(propertyId, { enabled });

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
        Receivables
      </Typography>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {financeLoading ? (
            <Typography variant="body2" color="text.secondary">
              Loading payment terms...
            </Typography>
          ) : !snapshot.hasProject ? (
            <Typography variant="body2" color="text.secondary">
              No project linked yet. Outstanding receivables appear after project conversion.
            </Typography>
          ) : openTerms.length === 0 ? (
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                No open payment terms for this project.
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                Outstanding: {formatCurrency(0)}
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {openTerms.length} open term{openTerms.length === 1 ? '' : 's'}
                </Typography>
                <Typography variant="body2" fontWeight={600} color="warning.dark">
                  {formatCurrency(snapshot.totalOutstanding)}
                </Typography>
              </Stack>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Term</TableCell>
                      <TableCell>Due</TableCell>
                      <TableCell align="right">Outstanding</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {openTerms.map((term) => (
                      <TableRow key={term.id}>
                        <TableCell>{term.name}</TableCell>
                        <TableCell>{term.dueDate ? formatDate(term.dueDate) : '—'}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(term.outstandingAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
        Loan Snapshot
      </Typography>
      <Card variant="outlined">
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {loanLoading ? (
            <Typography variant="body2" color="text.secondary">
              Loading loan details...
            </Typography>
          ) : !loan ? (
            <Typography variant="body2" color="text.secondary">
              No loan application mapped to this property.
            </Typography>
          ) : (
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight={600}>
                  {loan.lenderName || 'Lender not set'}
                </Typography>
                <Chip label={toTitleLabel(loan.status)} size="small" color="info" />
              </Stack>
              <Typography variant="body2">
                Amount: {loan.loanAmount != null ? formatCurrency(loan.loanAmount) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Reference: {loan.bankReferenceNumber || '—'}
              </Typography>
              {loan.notes && (
                <Typography variant="body2" color="text.secondary">
                  {loan.notes}
                </Typography>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
