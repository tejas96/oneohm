'use client';

import {
  Box,
  Card,
  CardContent,
  Divider,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { type JSX, useMemo } from 'react';

import {
  useCustomerLoans,
  useCustomerProjects,
  useCustomerSubsidies,
  type CustomerPropertyResponse,
} from '../../hooks';
import { TabSkeleton } from '../tab-skeleton';

import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { useOrgOutstanding, useOrgReceipts } from '@/lib/hooks/resources';
import { formatCurrency, formatDate, toTitleLabel } from '@/lib/utils';

export interface FinanceTabProps {
  customerId: string;
  customerName: string;
  enabled: boolean;
}

interface ProjectGroup {
  projectId: string;
  projectNumber: string;
  projectName: string;
  outstanding: number;
  termCount: number;
}

export function FinanceTab({ customerId, enabled }: FinanceTabProps): JSX.Element {
  const outstandingQ = useOrgOutstanding(
    { customerId, sort: 'daysOverdue', sortOrder: 'DESC', page: 1, limit: 100 },
    { enabled },
  );
  const receiptsQ = useOrgReceipts({ customerId, page: 1, limit: 10 }, { enabled });
  const loansQ = useCustomerLoans(customerId, { enabled });
  const subsidiesQ = useCustomerSubsidies(customerId, { enabled });
  const projectsQ = useCustomerProjects(customerId, { enabled });

  const router = useRouter();

  const openTerms = outstandingQ.data?.data ?? [];
  const recentReceipts = receiptsQ.data?.data ?? [];
  const loans = loansQ.data ?? [];
  const subsidies = subsidiesQ.data ?? [];
  const projects = projectsQ.data ?? [];

  const projectGroups = useMemo((): ProjectGroup[] => {
    const map = new Map<string, ProjectGroup>();
    for (const term of openTerms) {
      const existing = map.get(term.projectId);
      if (existing) {
        existing.outstanding += Number(term.outstandingAmount);
        existing.termCount += 1;
      } else {
        map.set(term.projectId, {
          projectId: term.projectId,
          projectNumber: term.projectNumber,
          projectName: term.projectName,
          outstanding: Number(term.outstandingAmount),
          termCount: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.outstanding - a.outstanding);
  }, [openTerms]);

  const loansByProperty = useMemo(() => {
    const map = new Map<string, typeof loans>();
    for (const loan of loans) {
      const key = loan.propertyId ?? 'unassigned';
      const list = map.get(key) ?? [];
      list.push(loan);
      map.set(key, list);
    }
    return map;
  }, [loans]);

  const isLoading =
    outstandingQ.isLoading ||
    receiptsQ.isLoading ||
    loansQ.isLoading ||
    subsidiesQ.isLoading ||
    projectsQ.isLoading;

  if (isLoading && openTerms.length === 0 && loans.length === 0) {
    return <TabSkeleton />;
  }

  const totalOutstanding = projectGroups.reduce((sum, group) => sum + group.outstanding, 0);

  return (
    <>
      <Box sx={{ p: 2 }}>
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <SummaryTile
              label="Outstanding"
              value={formatCurrency(totalOutstanding)}
              loading={outstandingQ.isLoading}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <SummaryTile
              label="Open Terms"
              value={String(openTerms.length)}
              loading={outstandingQ.isLoading}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <SummaryTile
              label="Loan Applications"
              value={String(loans.length)}
              loading={loansQ.isLoading}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <SummaryTile
              label="Subsidies"
              value={String(subsidies.length)}
              loading={subsidiesQ.isLoading}
            />
          </Grid>
        </Grid>

        <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
          Receivables by Project
        </Typography>
        {projectGroups.length === 0 ? (
          <Typography variant="body2" color="text.secondary" mb={3}>
            No open payment terms for this customer.
          </Typography>
        ) : (
          <Stack spacing={1} mb={3}>
            {projectGroups.map((group) => (
              <Card
                key={group.projectId}
                variant="outlined"
                // Navigate straight to the project's Money tab. The previous
                // read-only drawer was an interstitial in front of this link
                // that re-summed money over a capped query.
                onClick={() => router.push(`/projects/${group.projectId}?tab=finance`)}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              >
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {group.projectNumber}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {group.projectName} · {group.termCount} open term
                        {group.termCount === 1 ? '' : 's'}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600} color="warning.dark">
                      {formatCurrency(group.outstanding)}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
          Loans by Property
        </Typography>
        {loans.length === 0 ? (
          <Typography variant="body2" color="text.secondary" mb={3}>
            No loan applications on record.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Property</TableCell>
                  <TableCell>Lender</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Reference</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...loansByProperty.entries()].map(([propertyId, propertyLoans]) =>
                  propertyLoans.map((loan, index) => {
                    const property =
                      loan.property ?? projects.find((p) => p.propertyId === propertyId)?.property;
                    const propertyLabel =
                      propertyId === 'unassigned'
                        ? 'Unassigned'
                        : property
                          ? getPropertyDisplayName(property as CustomerPropertyResponse)
                          : propertyId;
                    return (
                      <TableRow key={loan.id} hover>
                        <TableCell>{index === 0 ? propertyLabel : ''}</TableCell>
                        <TableCell>{loan.lenderName || '—'}</TableCell>
                        <TableCell align="right">
                          {loan.loanAmount != null ? formatCurrency(loan.loanAmount) : '—'}
                        </TableCell>
                        <TableCell>{toTitleLabel(loan.status)}</TableCell>
                        <TableCell>{loan.bankReferenceNumber || '—'}</TableCell>
                      </TableRow>
                    );
                  }),
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {subsidies.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
              Subsidy Applications
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Application</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell align="right">Applied</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subsidies.map((subsidy) => (
                    <TableRow key={subsidy.id} hover>
                      <TableCell>{subsidy.applicationNumber}</TableCell>
                      <TableCell>
                        {subsidy.project
                          ? `${subsidy.project.projectNumber} · ${subsidy.project.name}`
                          : '—'}
                      </TableCell>
                      <TableCell align="right">{formatCurrency(subsidy.appliedAmount)}</TableCell>
                      <TableCell>{toTitleLabel(subsidy.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {recentReceipts.length > 0 && (
          <>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
              Recent Receipts
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Receipt</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentReceipts.map((receipt) => (
                    <TableRow key={receipt.id} hover>
                      <TableCell>{receipt.paymentNumber}</TableCell>
                      <TableCell>{receipt.projectNumber}</TableCell>
                      <TableCell>{formatDate(receipt.createdAt)}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(Number(receipt.paidAmount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Box>
    </>
  );
}

function SummaryTile({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading?: boolean;
}): JSX.Element {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
          {label}
        </Typography>
        {loading ? (
          <Skeleton height={28} sx={{ mt: 0.5 }} />
        ) : (
          <Typography variant="h6" sx={{ fontSize: '1.125rem', fontWeight: 600, mt: 0.5 }}>
            {value}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
