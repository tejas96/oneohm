'use client';

import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import {
  Box,
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
import { useRouter } from 'next/navigation';
import { type JSX, useMemo } from 'react';

import {
  useCustomerLoans,
  useCustomerProjects,
  useCustomerSubsidies,
  type CustomerPropertyResponse,
} from '../../hooks';
import {
  DetailCard,
  IconCircle,
  Mono,
  SectionHeading,
  TonePill,
  TONE_INK,
  type DetailTone,
} from '../primitives';
import { detailTableSx, tableCardSx } from '../styles';
import { getBalanceTone, getOverdueAmount } from '../utils';

import { getPropertyDisplayName } from '@/components/features/properties/utils';
import { KpiStripe } from '@/components/shared/inventory/kpi-stripe';
import { useOrgCustomersAr, useOrgOutstanding, useOrgReceipts } from '@/lib/hooks/resources';
import { formatCurrency, formatDate, toTitleLabel } from '@/lib/utils';

export interface FinanceTabProps {
  customerId: string;
  customerName: string;
  enabled: boolean;
}

/** The page caps the open-term query here; the UI says so when it bites. */
const TERM_PAGE_LIMIT = 100;

/**
 * Payment states that mean the money actually arrived.
 *
 * Mirrors the `status IN ('received','verified','cleared')` filter the AR
 * report applies when it computes `lastReceiptDate`. The receipts endpoint
 * applies no status filter at all, so its rows include pending, bounced and
 * refunded payments — money that is not in the bank.
 */
const SETTLED_PAYMENT_STATUSES: readonly PaymentTransactionStatus[] = [
  PaymentTransactionStatus.RECEIVED,
  PaymentTransactionStatus.VERIFIED,
  PaymentTransactionStatus.CLEARED,
];

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

function isSettled(status: PaymentTransactionStatus): boolean {
  return SETTLED_PAYMENT_STATUSES.includes(status);
}

/**
 * Half the payment methods are acronyms, and `toTitleLabel` lowercases them
 * into "Neft", "Rtgs", "Imps" and "Upi" — which is simply not how any of them
 * are written on a bank statement.
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

interface ProjectGroup {
  projectId: string;
  projectNumber: string;
  projectName: string;
  outstanding: number;
  termCount: number;
  maxDaysOverdue: number;
  /**
   * The portion of `outstanding` that is actually past its due date.
   *
   * Kept separate because the two are usually different: a project can owe
   * ₹33,815 across three terms of which only ₹15,000 is late. Labelling the
   * whole balance "60d overdue" — which is all `maxDaysOverdue` alone can say
   * — overstates the debt by more than double.
   */
  overdue: number;
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
 * A section with nothing in it.
 *
 * Deliberately NOT a card with a centred `EmptyPane`: on a quiet account three
 * of those stacked up into ~400px of grey boxes each carrying one sentence.
 * A single muted line says the same thing and keeps the sections that *do*
 * have content adjacent to each other.
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

export function FinanceTab({ customerId, enabled }: FinanceTabProps): JSX.Element {
  const router = useRouter();

  const outstandingQ = useOrgOutstanding(
    { customerId, sort: 'daysOverdue', sortOrder: 'DESC', page: 1, limit: TERM_PAGE_LIMIT },
    { enabled },
  );
  const receiptsQ = useOrgReceipts({ customerId, page: 1, limit: 10 }, { enabled });
  const loansQ = useCustomerLoans(customerId, { enabled });
  const subsidiesQ = useCustomerSubsidies(customerId, { enabled });
  const projectsQ = useCustomerProjects(customerId, { enabled });
  /*
   * The authoritative outstanding balance.
   *
   * The tab used to headline the sum of the open terms it had fetched, which
   * is a different number from the one the page header shows: that one is
   * server-computed over *every* term, this one stops at `TERM_PAGE_LIMIT`.
   * Two "Outstanding" figures that disagree on one screen is worse than one
   * that is occasionally coarse, so the AR row leads and the per-project list
   * below is presented as the breakdown it actually is. The query key matches
   * the page's, so this costs no extra request.
   */
  const arQ = useOrgCustomersAr(undefined, { enabled });

  const openTerms = useMemo(() => outstandingQ.data?.data ?? [], [outstandingQ.data?.data]);
  const recentReceipts = useMemo(() => receiptsQ.data?.data ?? [], [receiptsQ.data?.data]);
  const loans = useMemo(() => loansQ.data ?? [], [loansQ.data]);
  const subsidies = subsidiesQ.data ?? [];
  const projects = projectsQ.data ?? [];

  const aging = useMemo(
    () => arQ.data?.find((row) => row.customerId === customerId),
    [arQ.data, customerId],
  );

  /*
   * The AR report INNER JOINs its open-terms CTE, so a customer who owes
   * nothing produces no row at all — and `lastReceiptDate` disappears with it.
   * Reading the date straight off `aging` therefore told a customer who had
   * paid in full that they had never paid anything. The receipts query is
   * ordered `created_at DESC`, so the first settled row in it is the same date
   * the AR report would have reported.
   */
  const lastReceiptDate = useMemo((): string | null => {
    const fromAr = aging?.lastReceiptDate;
    if (fromAr) return typeof fromAr === 'string' ? fromAr : new Date(fromAr).toISOString();
    const settled = recentReceipts.find((receipt) => isSettled(receipt.status));
    return settled?.createdAt ?? null;
  }, [aging?.lastReceiptDate, recentReceipts]);

  const projectGroups = useMemo((): ProjectGroup[] => {
    const map = new Map<string, ProjectGroup>();
    for (const term of openTerms) {
      const existing = map.get(term.projectId);
      const days = term.daysOverdue ?? 0;
      const amount = Number(term.outstandingAmount);
      // `daysOverdue` is negative for terms that are not yet due.
      const lateAmount = days > 0 ? amount : 0;
      if (existing) {
        existing.outstanding += amount;
        existing.termCount += 1;
        existing.maxDaysOverdue = Math.max(existing.maxDaysOverdue, days);
        existing.overdue += lateAmount;
      } else {
        map.set(term.projectId, {
          projectId: term.projectId,
          projectNumber: term.projectNumber,
          projectName: term.projectName,
          outstanding: amount,
          termCount: 1,
          maxDaysOverdue: days,
          overdue: lateAmount,
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

  const outstanding = aging?.totalOutstanding ?? 0;
  const over90 = aging?.bucket90plus ?? 0;
  const termsTruncated = openTerms.length >= TERM_PAGE_LIMIT;
  const overdueAmount = getOverdueAmount(aging);

  return (
    <Stack gap={3}>
      <KpiStripe
        columns={4}
        tiles={[
          {
            id: 'fin-outstanding',
            label: 'Outstanding',
            value: formatCurrency(outstanding),
            isLoading: arQ.isLoading,
            intent: getBalanceTone(aging),
            secondary:
              outstanding === 0
                ? 'All settled'
                : overdueAmount > 0
                  ? `${formatCurrency(overdueAmount)} past due`
                  : 'All on schedule',
          },
          {
            id: 'fin-over90',
            label: 'Over 90 days',
            value: formatCurrency(over90),
            isLoading: arQ.isLoading,
            intent: over90 > 0 ? 'danger' : 'neutral',
            secondary: over90 > 0 ? 'Chase this first' : 'Nothing this old',
          },
          {
            id: 'fin-terms',
            label: 'Open terms',
            value: String(aging?.openTermCount ?? openTerms.length),
            isLoading: arQ.isLoading,
            secondary: `Across ${projectGroups.length} project${
              projectGroups.length === 1 ? '' : 's'
            }`,
          },
          {
            id: 'fin-last-receipt',
            label: 'Last receipt',
            value: lastReceiptDate ? formatDate(lastReceiptDate) : '—',
            isLoading: arQ.isLoading || receiptsQ.isLoading,
            secondary: lastReceiptDate ? 'Most recent cleared payment' : 'No cleared payments yet',
          },
        ]}
      />

      {/* ── Receivables by project ─────────────────────────────────────── */}
      <Box>
        <SectionHeading count={projectGroups.length || undefined}>
          Receivables by project
        </SectionHeading>
        {projectGroups.length === 0 ? (
          <SectionEmpty description="No open payment terms for this customer." />
        ) : (
          <Stack gap={1}>
            {projectGroups.map((group) => {
              const tone: DetailTone =
                group.maxDaysOverdue > 90 ? 'danger' : group.overdue > 0 ? 'warning' : 'info';
              return (
                <DetailCard
                  key={group.projectId}
                  sx={{
                    p: 1.75,
                    cursor: 'pointer',
                    transition: 'box-shadow 200ms var(--ease-standard)',
                    '&:hover': { boxShadow: 'var(--shadow-e3)' },
                  }}
                >
                  <Box
                    component="button"
                    type="button"
                    // Straight to the project's money tab. A read-only drawer used
                    // to sit in front of this link re-summing over a capped query.
                    onClick={() => router.push(`/projects/${group.projectId}?tab=finance`)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      width: '100%',
                      p: 0,
                      border: 'none',
                      bgcolor: 'transparent',
                      font: 'inherit',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
                      <IconCircle tone={tone}>
                        <PaymentsOutlinedIcon />
                      </IconCircle>
                      <Box sx={{ minWidth: 0 }}>
                        <Mono sx={{ fontWeight: 600, display: 'block' }}>
                          {group.projectNumber}
                        </Mono>
                        <Typography
                          sx={{
                            fontSize: '0.6875rem',
                            color: 'var(--ds-text-tertiary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {group.projectName} · {group.termCount} open term
                          {group.termCount === 1 ? '' : 's'}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" alignItems="center" gap={1.5} sx={{ flexShrink: 0 }}>
                      <Box sx={{ textAlign: 'right' }}>
                        <Mono sx={{ fontSize: '0.9375rem', fontWeight: 600 }} tone={tone}>
                          {formatCurrency(group.outstanding)}
                        </Mono>
                        {group.overdue > 0 && (
                          <Typography
                            sx={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              color: TONE_INK[tone].ink,
                            }}
                          >
                            {formatCurrency(group.overdue)} overdue · {group.maxDaysOverdue}d
                          </Typography>
                        )}
                      </Box>
                      <ChevronRightIcon
                        fontSize="small"
                        sx={{ color: 'var(--ds-text-tertiary)' }}
                      />
                    </Stack>
                  </Box>
                </DetailCard>
              );
            })}
            {termsTruncated && (
              <Typography sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)', px: 0.5 }}>
                Showing the {TERM_PAGE_LIMIT} most overdue terms. The Outstanding tile above counts
                all of them.
              </Typography>
            )}
          </Stack>
        )}
      </Box>

      {/* ── Loans ──────────────────────────────────────────────────────── */}
      <Box>
        <SectionHeading count={loans.length || undefined}>Loan applications</SectionHeading>
        {loans.length === 0 ? (
          <SectionEmpty description="No loan applications on record." />
        ) : (
          <Box sx={tableCardSx}>
            <TableContainer>
              <Table size="small" sx={detailTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 180 }}>Site</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Lender</TableCell>
                    <TableCell align="right" sx={{ minWidth: 120 }}>
                      Amount
                    </TableCell>
                    <TableCell sx={{ minWidth: 120 }}>Status</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Bank reference</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...loansByProperty.entries()].map(([propertyId, propertyLoans]) =>
                    propertyLoans.map((loan, index) => {
                      const property =
                        loan.property ??
                        projects.find((p) => p.propertyId === propertyId)?.property;
                      const propertyLabel =
                        propertyId === 'unassigned'
                          ? 'Unassigned'
                          : property
                            ? getPropertyDisplayName(property as CustomerPropertyResponse)
                            : propertyId;
                      return (
                        <TableRow key={loan.id}>
                          <TableCell>
                            {index === 0 ? (
                              <Stack direction="row" alignItems="center" gap={1.25}>
                                <IconCircle tone="info">
                                  <AccountBalanceOutlinedIcon />
                                </IconCircle>
                                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                                  {propertyLabel}
                                </Typography>
                              </Stack>
                            ) : (
                              ''
                            )}
                          </TableCell>
                          <TableCell sx={{ color: 'var(--ds-text-secondary)' }}>
                            {loan.lenderName || '—'}
                          </TableCell>
                          <TableCell align="right">
                            <Mono sx={{ fontWeight: 500 }}>
                              {loan.loanAmount != null ? formatCurrency(loan.loanAmount) : '—'}
                            </Mono>
                          </TableCell>
                          <TableCell>
                            <TonePill
                              label={toTitleLabel(loan.status)}
                              tone={statusTone(loan.status)}
                              dot
                            />
                          </TableCell>
                          <TableCell>
                            <Mono sx={{ color: 'var(--ds-text-secondary)' }}>
                              {loan.bankReferenceNumber || '—'}
                            </Mono>
                          </TableCell>
                        </TableRow>
                      );
                    }),
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>

      {/* ── Subsidies ──────────────────────────────────────────────────── */}
      <Box>
        <SectionHeading count={subsidies.length || undefined}>Subsidy applications</SectionHeading>
        {subsidies.length === 0 ? (
          <SectionEmpty description="No subsidy applications on record." />
        ) : (
          <Box sx={tableCardSx}>
            <TableContainer>
              <Table size="small" sx={detailTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 190 }}>Application</TableCell>
                    <TableCell sx={{ minWidth: 190 }}>Project</TableCell>
                    <TableCell align="right" sx={{ minWidth: 120 }}>
                      Applied
                    </TableCell>
                    <TableCell align="right" sx={{ minWidth: 120 }}>
                      Approved
                    </TableCell>
                    <TableCell sx={{ minWidth: 120 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {subsidies.map((subsidy) => (
                    <TableRow key={subsidy.id}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" gap={1.25}>
                          <IconCircle tone={statusTone(subsidy.status)}>
                            <WorkspacePremiumOutlinedIcon />
                          </IconCircle>
                          <Box sx={{ minWidth: 0 }}>
                            <Mono sx={{ fontWeight: 600, display: 'block' }}>
                              {subsidy.applicationNumber}
                            </Mono>
                            <Typography
                              sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)' }}
                            >
                              {subsidy.subsidyScheme ? `${subsidy.subsidyScheme} · ` : ''}
                              {formatDate(subsidy.applicationDate)}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ color: 'var(--ds-text-secondary)' }}>
                        {subsidy.project
                          ? `${subsidy.project.projectNumber} · ${subsidy.project.name}`
                          : '—'}
                      </TableCell>
                      <TableCell align="right">
                        <Mono>{formatCurrency(subsidy.appliedAmount)}</Mono>
                      </TableCell>
                      <TableCell align="right">
                        {subsidy.approvedAmount != null ? (
                          <Mono sx={{ fontWeight: 600 }} tone="success">
                            {formatCurrency(subsidy.approvedAmount)}
                          </Mono>
                        ) : (
                          <Mono sx={{ color: 'var(--ds-text-tertiary)' }}>Pending</Mono>
                        )}
                      </TableCell>
                      <TableCell>
                        <TonePill
                          label={toTitleLabel(subsidy.status)}
                          tone={statusTone(subsidy.status)}
                          dot
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>

      {/* ── Receipts ───────────────────────────────────────────────────── */}
      <Box>
        <SectionHeading count={recentReceipts.length || undefined}>Recent payments</SectionHeading>
        {recentReceipts.length === 0 ? (
          <SectionEmpty description="No payments recorded yet." />
        ) : (
          <Box sx={tableCardSx}>
            <TableContainer>
              <Table size="small" sx={detailTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ minWidth: 180 }}>Payment</TableCell>
                    <TableCell sx={{ minWidth: 190 }}>Project</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>Method</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>Status</TableCell>
                    <TableCell sx={{ minWidth: 110 }}>Date</TableCell>
                    <TableCell align="right" sx={{ minWidth: 120 }}>
                      Amount
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentReceipts.map((receipt) => {
                    const tone = paymentTone(receipt.status);
                    const settled = isSettled(receipt.status);
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
                                  sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)' }}
                                >
                                  Ref {receipt.paymentReference}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ color: 'var(--ds-text-secondary)' }}>
                          {receipt.projectNumber}
                        </TableCell>
                        <TableCell sx={{ color: 'var(--ds-text-secondary)' }}>
                          {methodLabel(receipt.paymentMethod)}
                        </TableCell>
                        <TableCell>
                          {/*
                           * The receipts endpoint applies no status filter, so
                           * this list carries pending, bounced and refunded
                           * payments too. Painting every row success-green made
                           * a bounced cheque look like money in the bank.
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
    </Stack>
  );
}
