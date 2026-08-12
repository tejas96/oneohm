'use client';

import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import {
  Box,
  Button,
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
import { PaymentMethod, PaymentTransactionStatus } from '@tejas96/shared/types';
import type { JSX } from 'react';

import {
  isSettledPayment,
  PROPERTY_FINANCE_PAGE_LIMIT,
  usePropertyFinanceSnapshot,
  usePropertyLoan,
} from '../../hooks';

import {
  DetailCard,
  EmptyPane,
  Field,
  IconCircle,
  Mono,
  SectionHeading,
  TonePill,
  TONE_INK,
  type DetailTone,
} from '@/components/features/customers/customer-detail/primitives';
import { detailTableSx, tableCardSx } from '@/components/features/customers/customer-detail/styles';
import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import { formatCurrency, formatDate, toTitleLabel } from '@/lib/utils';

export interface FinanceTabProps {
  propertyId: string;
  projectId: string | null;
  enabled: boolean;
  onGoToProject: () => void;
}

const PAYMENT_STATUS_TONE = {
  [PaymentTransactionStatus.PENDING]: 'warning',
  [PaymentTransactionStatus.RECEIVED]: 'success',
  [PaymentTransactionStatus.VERIFIED]: 'success',
  [PaymentTransactionStatus.CLEARED]: 'success',
  [PaymentTransactionStatus.BOUNCED]: 'danger',
  [PaymentTransactionStatus.REFUNDED]: 'neutral',
} satisfies Record<PaymentTransactionStatus, DetailTone>;

function paymentTone(status: PaymentTransactionStatus): DetailTone {
  return (PAYMENT_STATUS_TONE as Record<string, DetailTone | undefined>)[status] ?? 'neutral';
}

/**
 * Half the payment methods are acronyms, and `toTitleLabel` lowercases them
 * into "Neft", "Rtgs", "Imps" and "Upi" — which is not how any of them are
 * written on a bank statement.
 */
const PAYMENT_METHOD_LABEL = {
  [PaymentMethod.ONLINE]: 'Online',
  [PaymentMethod.CHEQUE]: 'Cheque',
  [PaymentMethod.CASH]: 'Cash',
  [PaymentMethod.NEFT]: 'NEFT',
  [PaymentMethod.RTGS]: 'RTGS',
  [PaymentMethod.IMPS]: 'IMPS',
  [PaymentMethod.UPI]: 'UPI',
  [PaymentMethod.DEMAND_DRAFT]: 'Demand draft',
} satisfies Record<PaymentMethod, string>;

function methodLabel(method: PaymentMethod): string {
  return (
    (PAYMENT_METHOD_LABEL as Record<string, string | undefined>)[method] ?? toTitleLabel(method)
  );
}

function statusTone(status: string): DetailTone {
  const normalized = status.toLowerCase();
  if (
    normalized.includes('approv') ||
    normalized.includes('disburs') ||
    normalized === 'credited'
  ) {
    return 'success';
  }
  if (normalized.includes('reject') || normalized.includes('cancel')) return 'danger';
  if (normalized.includes('pending') || normalized.includes('submit')) return 'warning';
  return 'info';
}

/**
 * A section with nothing in it. Deliberately not a card with a centred empty
 * pane: on a quiet site three of those stack into ~400px of grey boxes each
 * carrying one sentence.
 */
function SectionEmpty({ description }: { description: string }): JSX.Element {
  return (
    <Typography
      sx={{
        fontSize: '0.75rem',
        color: 'var(--ds-text-tertiary)',
        bgcolor: 'var(--ds-surface)',
        borderRadius: 'var(--radius-card-functional)',
        boxShadow: 'var(--shadow-e1)',
        px: 2,
        py: 1.5,
      }}
    >
      {description}
    </Typography>
  );
}

export function FinanceTab({
  propertyId,
  projectId,
  enabled,
  onGoToProject,
}: FinanceTabProps): JSX.Element {
  const {
    snapshot,
    openTerms,
    receipts,
    isTruncated,
    isLoading: financeLoading,
    hasProject,
  } = usePropertyFinanceSnapshot(projectId, { enabled });
  const { data: loan, isLoading: loanLoading } = usePropertyLoan(propertyId, { enabled });

  if (financeLoading && hasProject) {
    return (
      <Stack gap={2}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 1.5,
          }}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              variant="rounded"
              height={96}
              sx={{ borderRadius: 'var(--radius-card-functional)' }}
            />
          ))}
        </Box>
        <Skeleton
          variant="rounded"
          height={220}
          sx={{ borderRadius: 'var(--radius-card-functional)' }}
        />
      </Stack>
    );
  }

  /** Narrower than `DetailTone` because `MetricTile`'s intent has no `accent`. */
  const balanceIntent: 'neutral' | 'success' | 'warning' | 'danger' =
    snapshot.maxDaysOverdue > 90
      ? 'danger'
      : snapshot.overdueAmount > 0
        ? 'warning'
        : snapshot.totalOutstanding > 0
          ? 'neutral'
          : 'success';

  return (
    <Stack gap={3}>
      {!hasProject ? (
        <DetailCard>
          <EmptyPane
            size="page"
            icon={<PaymentsOutlinedIcon />}
            title="No receivables yet"
            description="A payment schedule is created when this site is converted to a project. Until then there is nothing to collect against it."
            action={
              <Button
                size="small"
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                onClick={onGoToProject}
              >
                Convert to project
              </Button>
            }
          />
        </DetailCard>
      ) : (
        <>
          <KpiStripe
            columns={4}
            tiles={[
              {
                id: 'fin-outstanding',
                label: 'Outstanding',
                value: formatCurrency(snapshot.totalOutstanding),
                intent: balanceIntent,
                secondary:
                  snapshot.totalOutstanding === 0
                    ? 'Fully collected'
                    : `${snapshot.openTermCount} open term${
                        snapshot.openTermCount === 1 ? '' : 's'
                      }`,
              },
              {
                id: 'fin-overdue',
                label: 'Past due',
                value: formatCurrency(snapshot.overdueAmount),
                intent:
                  snapshot.maxDaysOverdue > 90
                    ? 'danger'
                    : snapshot.overdueAmount > 0
                      ? 'warning'
                      : 'neutral',
                secondary:
                  snapshot.overdueAmount > 0
                    ? `Oldest ${snapshot.maxDaysOverdue} days`
                    : 'Nothing past its date',
              },
              {
                id: 'fin-received',
                label: 'Received',
                value: formatCurrency(snapshot.receivedAmount),
                intent: snapshot.receivedAmount > 0 ? 'success' : 'neutral',
                secondary: `${receipts.length} payment${receipts.length === 1 ? '' : 's'} recorded`,
              },
              {
                id: 'fin-last-receipt',
                label: 'Last receipt',
                value: snapshot.lastReceiptDate ? formatDate(snapshot.lastReceiptDate) : '—',
                secondary: snapshot.lastReceiptDate
                  ? 'Most recent cleared payment'
                  : 'No cleared payments yet',
              },
            ]}
          />

          {/* ── Open payment terms ───────────────────────────────────────── */}
          <Box>
            <SectionHeading count={openTerms.length || undefined}>
              Open payment terms
            </SectionHeading>
            {openTerms.length === 0 ? (
              <SectionEmpty description="Every payment term on this project has been settled." />
            ) : (
              <Box sx={tableCardSx}>
                <TableContainer>
                  <Table size="small" sx={detailTableSx}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ minWidth: 200 }}>Term</TableCell>
                        <TableCell sx={{ minWidth: 130 }}>Due</TableCell>
                        <TableCell align="right" sx={{ minWidth: 120 }}>
                          Expected
                        </TableCell>
                        <TableCell align="right" sx={{ minWidth: 110 }}>
                          Paid
                        </TableCell>
                        <TableCell align="right" sx={{ minWidth: 130 }}>
                          Outstanding
                        </TableCell>
                        <TableCell sx={{ minWidth: 130 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {openTerms.map((term) => {
                        /*
                         * `daysOverdue` is null for terms with no due date and
                         * negative for terms not yet due, so only a strictly
                         * positive value means late. The old table showed no
                         * overdue signal at all — a term 60 days late read
                         * exactly like one due next month.
                         */
                        const days = term.daysOverdue ?? 0;
                        const isLate = days > 0;
                        const tone: DetailTone = !isLate
                          ? 'neutral'
                          : days > 90
                            ? 'danger'
                            : 'warning';
                        /*
                         * A term's stage is usually its name in snake_case
                         * ("Installation Complete" / installation_complete),
                         * which printed the same words twice under each other.
                         * It only earns a line when it says something new.
                         */
                        const stageLabel = term.stage ? toTitleLabel(term.stage) : '';
                        const showStage =
                          stageLabel !== '' &&
                          stageLabel.toLowerCase() !== term.name.trim().toLowerCase();

                        return (
                          <TableRow key={term.id}>
                            <TableCell>
                              <Stack direction="row" alignItems="center" gap={1.25}>
                                <IconCircle tone={isLate ? tone : 'info'}>
                                  <PaymentsOutlinedIcon />
                                </IconCircle>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography
                                    sx={{
                                      fontSize: '0.8125rem',
                                      fontWeight: 600,
                                      color: 'var(--ds-text-primary)',
                                    }}
                                  >
                                    {term.name}
                                  </Typography>
                                  {showStage && (
                                    <Typography
                                      sx={{
                                        fontSize: '0.6875rem',
                                        color: 'var(--ds-text-tertiary)',
                                      }}
                                    >
                                      {stageLabel}
                                    </Typography>
                                  )}
                                </Box>
                              </Stack>
                            </TableCell>

                            <TableCell>
                              <Mono
                                sx={{
                                  color: isLate ? TONE_INK[tone].ink : 'var(--ds-text-primary)',
                                  fontWeight: isLate ? 600 : 400,
                                }}
                              >
                                {term.dueDate ? formatDate(term.dueDate) : 'No date set'}
                              </Mono>
                              {isLate && (
                                <Typography
                                  sx={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 600,
                                    color: TONE_INK[tone].ink,
                                  }}
                                >
                                  {days} days overdue
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell align="right">
                              <Mono sx={{ color: 'var(--ds-text-secondary)' }}>
                                {formatCurrency(term.expectedAmount)}
                              </Mono>
                            </TableCell>

                            <TableCell align="right">
                              <Mono
                                sx={{
                                  color:
                                    term.paidAmount > 0
                                      ? TONE_INK.success.ink
                                      : 'var(--ds-text-tertiary)',
                                }}
                              >
                                {formatCurrency(term.paidAmount)}
                              </Mono>
                            </TableCell>

                            <TableCell align="right">
                              <Mono sx={{ fontWeight: 600 }} tone={isLate ? tone : undefined}>
                                {formatCurrency(term.outstandingAmount)}
                              </Mono>
                            </TableCell>

                            <TableCell>
                              <TonePill
                                label={isLate ? 'Overdue' : toTitleLabel(term.status)}
                                tone={isLate ? tone : 'info'}
                                dot
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            {isTruncated && (
              <Typography sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)', mt: 1 }}>
                Showing the first {PROPERTY_FINANCE_PAGE_LIMIT} rows. Totals above cover only what
                is listed.
              </Typography>
            )}
          </Box>

          {/* ── Receipts ─────────────────────────────────────────────────── */}
          <Box>
            <SectionHeading count={receipts.length || undefined}>Payments received</SectionHeading>
            {receipts.length === 0 ? (
              <SectionEmpty description="No payments recorded against this project yet." />
            ) : (
              <Box sx={tableCardSx}>
                <TableContainer>
                  <Table size="small" sx={detailTableSx}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ minWidth: 200 }}>Payment</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>Method</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>Status</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>Date</TableCell>
                        <TableCell align="right" sx={{ minWidth: 130 }}>
                          Amount
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {receipts.map((receipt) => {
                        const tone = paymentTone(receipt.status);
                        const settled = isSettledPayment(receipt.status);
                        return (
                          <TableRow key={receipt.id}>
                            <TableCell>
                              <Stack direction="row" alignItems="center" gap={1.25}>
                                <IconCircle tone={tone}>
                                  <ReceiptLongOutlinedIcon />
                                </IconCircle>
                                <Box sx={{ minWidth: 0 }}>
                                  <Mono sx={{ fontWeight: 600, display: 'block' }}>
                                    {receipt.paymentNumber}
                                  </Mono>
                                  {receipt.paymentReference && (
                                    <Typography
                                      sx={{
                                        fontSize: '0.6875rem',
                                        color: 'var(--ds-text-tertiary)',
                                      }}
                                    >
                                      Ref {receipt.paymentReference}
                                    </Typography>
                                  )}
                                </Box>
                              </Stack>
                            </TableCell>

                            <TableCell sx={{ color: 'var(--ds-text-secondary)' }}>
                              {methodLabel(receipt.paymentMethod)}
                            </TableCell>

                            <TableCell>
                              {/*
                               * The receipts endpoint applies no status filter,
                               * so this list carries pending, bounced and
                               * refunded payments too. Only settled rows count
                               * toward the Received tile above.
                               */}
                              <TonePill label={toTitleLabel(receipt.status)} tone={tone} dot />
                            </TableCell>

                            <TableCell>
                              <Mono>{formatDate(receipt.createdAt)}</Mono>
                            </TableCell>

                            <TableCell align="right">
                              <Mono
                                sx={{
                                  fontWeight: 600,
                                  ...(settled ? {} : { textDecoration: 'line-through' }),
                                }}
                                tone={settled ? 'success' : tone}
                              >
                                {formatCurrency(Number(receipt.paidAmount))}
                              </Mono>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        </>
      )}

      {/* ── Loan ───────────────────────────────────────────────────────── */}
      <Box>
        <SectionHeading>Loan application</SectionHeading>
        {loanLoading ? (
          <Skeleton
            variant="rounded"
            height={96}
            sx={{ borderRadius: 'var(--radius-card-functional)' }}
          />
        ) : !loan ? (
          <SectionEmpty description="No loan application is mapped to this site." />
        ) : (
          <DetailCard>
            <Stack direction="row" alignItems="flex-start" gap={1.5} sx={{ mb: 2 }}>
              <IconCircle tone={statusTone(loan.status)} size={40}>
                <AccountBalanceOutlinedIcon />
              </IconCircle>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" useFlexGap>
                  <Typography
                    sx={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--ds-text-primary)' }}
                  >
                    {loan.lenderName || 'Lender not set'}
                  </Typography>
                  <TonePill label={toTitleLabel(loan.status)} tone={statusTone(loan.status)} dot />
                </Stack>
              </Box>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(160px, 1fr))' },
                columnGap: 2,
                rowGap: 1.75,
              }}
            >
              <Field
                label="Amount"
                value={loan.loanAmount != null ? formatCurrency(loan.loanAmount) : '—'}
                mono
              />
              <Field label="Bank reference" value={loan.bankReferenceNumber || '—'} mono />
              {loan.notes ? (
                <Box sx={{ gridColumn: { sm: '1 / -1' }, minWidth: 0 }}>
                  <Field label="Notes" value={loan.notes} />
                </Box>
              ) : null}
            </Box>
          </DetailCard>
        )}
      </Box>
    </Stack>
  );
}
