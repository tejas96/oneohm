'use client';

import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import {
  Box,
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { QuoteStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import { type JSX, useState } from 'react';

import { QUOTE_STATUS_TONE } from '../../constants';
import { useCustomerQuotes } from '../../hooks';
import {
  DetailCard,
  EmptyPane,
  IconCircle,
  Mono,
  RowSkeleton,
  SectionHeading,
  TonePill,
  TONE_INK,
  type DetailTone,
} from '../primitives';
import { detailTableSx, tableCardSx } from '../styles';

import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useGatedAction } from '@/lib/rbac';
import { formatCurrency, formatDate, formatSystemSize, toTitleLabel } from '@/lib/utils';

export interface QuotesTabProps {
  customerId: string;
  enabled: boolean;
  isInactive: boolean;
  onCreateQuote: () => void;
}

const INACTIVE_TOOLTIP = 'This customer is inactive. Reactivate to continue this action.';
const DAY_MS = 1000 * 60 * 60 * 24;

/** Quote states where the clock still matters — a decided quote can't lapse. */
const LIVE_STATUSES: readonly QuoteStatus[] = [
  QuoteStatus.DRAFT,
  QuoteStatus.SENT,
  QuoteStatus.VIEWED,
];

interface Validity {
  label: string;
  tone: DetailTone;
  emphasis: boolean;
}

/**
 * How long a quote has left.
 *
 * `validUntil` has always been on the payload and was never rendered, which
 * meant the one date a sales rep chases — when the price stops being real —
 * was invisible on the customer's own quote list.
 */
function getValidity(validUntil: string | undefined, status: QuoteStatus): Validity | null {
  if (!validUntil) return null;
  const label = formatDate(validUntil);
  if (!LIVE_STATUSES.includes(status)) {
    return { label, tone: 'neutral', emphasis: false };
  }
  const daysLeft = Math.ceil((new Date(validUntil).getTime() - Date.now()) / DAY_MS);
  if (daysLeft < 0) return { label: `Expired ${label}`, tone: 'danger', emphasis: true };
  if (daysLeft === 0) return { label: 'Expires today', tone: 'danger', emphasis: true };
  if (daysLeft <= 7) {
    return { label: `${daysLeft}d left · ${label}`, tone: 'warning', emphasis: true };
  }
  return { label, tone: 'neutral', emphasis: false };
}

export function QuotesTab({
  customerId,
  enabled,
  isInactive,
  onCreateQuote,
}: QuotesTabProps): JSX.Element {
  const createQuoteAction = useGatedAction('quotes.create', onCreateQuote, 'Create quote');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data, isLoading } = useCustomerQuotes(customerId, {
    page: page + 1,
    limit: rowsPerPage,
    enabled,
  });

  const quotes = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  if (isLoading && quotes.length === 0) {
    return (
      <Box sx={tableCardSx}>
        <RowSkeleton rows={5} />
      </Box>
    );
  }

  if (!isLoading && quotes.length === 0) {
    return (
      <DetailCard>
        <EmptyPane
          size="page"
          icon={<DescriptionOutlinedIcon />}
          title="No quotes yet"
          description={
            isInactive
              ? 'Quote creation is blocked while this customer is inactive.'
              : 'Build the first quote to put a price in front of this customer.'
          }
          action={
            !isInactive ? (
              <Button
                variant="contained"
                size="small"
                startIcon={<PostAddOutlinedIcon />}
                onClick={createQuoteAction.onGatedClick}
                aria-disabled={!createQuoteAction.allowed}
              >
                Create quote
              </Button>
            ) : undefined
          }
        />
      </DetailCard>
    );
  }

  return (
    <Stack gap={1.5}>
      <SectionHeading
        count={total}
        sx={{ mb: 0 }}
        action={
          <Tooltip title={isInactive ? INACTIVE_TOOLTIP : ''}>
            <span>
              <Button
                size="small"
                variant="contained"
                startIcon={<PostAddOutlinedIcon />}
                onClick={createQuoteAction.onGatedClick}
                aria-disabled={!createQuoteAction.allowed}
                disabled={isInactive}
              >
                Create quote
              </Button>
            </span>
          </Tooltip>
        }
      >
        Quotes
      </SectionHeading>

      <Box sx={tableCardSx}>
        <TableContainer>
          <Table size="small" sx={detailTableSx}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 170 }}>Quote</TableCell>
                <TableCell sx={{ minWidth: 150 }}>Site</TableCell>
                <TableCell sx={{ minWidth: 110 }}>System</TableCell>
                <TableCell align="right" sx={{ minWidth: 140 }}>
                  Value
                </TableCell>
                <TableCell sx={{ minWidth: 110 }}>Status</TableCell>
                <TableCell sx={{ minWidth: 140 }}>Valid until</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Owner</TableCell>
                <TableCell align="right" sx={{ width: 56 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={8} sx={{ py: 1 }}>
                        <Box
                          sx={{
                            height: 28,
                            borderRadius: 'var(--radius-rf-sm)',
                            bgcolor: 'var(--ds-canvas-sunken)',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                : quotes.map((quote) => {
                    const href = buildRoute(ROUTES.QUOTES.DETAIL, { id: quote.id });
                    const tone: DetailTone = QUOTE_STATUS_TONE[quote.status] ?? 'neutral';
                    const sizeKw = quote.actualSystemSizeKw ?? quote.systemSizeKw;
                    const validity = getValidity(quote.validUntil, quote.status);
                    const hasSubsidy = Boolean(quote.subsidyAmount && quote.subsidyAmount > 0);

                    return (
                      <TableRow key={quote.id}>
                        <TableCell>
                          <Stack direction="row" alignItems="center" gap={1.25}>
                            <IconCircle tone={tone}>
                              <DescriptionOutlinedIcon />
                            </IconCircle>
                            <Box sx={{ minWidth: 0 }}>
                              <Box
                                component={NextLink}
                                href={href}
                                sx={{
                                  display: 'block',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.8125rem',
                                  fontWeight: 600,
                                  color: 'var(--ds-link)',
                                  textDecoration: 'none',
                                  '&:hover': { textDecoration: 'underline' },
                                }}
                              >
                                {quote.quoteNumber}
                              </Box>
                              <Typography
                                sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)' }}
                              >
                                {formatDate(quote.quoteDate)}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        <TableCell sx={{ color: 'var(--ds-text-secondary)' }}>
                          {quote.propertyName || '—'}
                        </TableCell>

                        <TableCell>
                          <Mono>{sizeKw ? `${formatSystemSize(sizeKw)} kW` : '—'}</Mono>
                          {quote.systemType && (
                            <Typography
                              sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)' }}
                            >
                              {toTitleLabel(quote.systemType)}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell align="right">
                          <Mono sx={{ fontWeight: 600 }}>
                            {quote.finalPrice ? formatCurrency(quote.finalPrice) : '—'}
                          </Mono>
                          {/*
                           * `finalPrice` is the price BEFORE subsidy — the
                           * server computes `effectivePrice = max(0,
                           * finalPrice − subsidy)`. Showing only "−₹X subsidy"
                           * left the reader to do the arithmetic, and read
                           * just as easily as if the subsidy were already off.
                           * The net figure is quoted directly instead.
                           */}
                          {hasSubsidy && quote.effectivePrice != null && (
                            <Typography
                              sx={{
                                fontSize: '0.6875rem',
                                color: TONE_INK.success.ink,
                                fontFamily: 'var(--font-mono)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {formatCurrency(quote.effectivePrice)} after subsidy
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          <TonePill label={toTitleLabel(quote.status)} tone={tone} dot />
                        </TableCell>

                        <TableCell>
                          {validity ? (
                            <Typography
                              sx={{
                                fontSize: '0.75rem',
                                fontWeight: validity.emphasis ? 600 : 400,
                                color: validity.emphasis
                                  ? TONE_INK[validity.tone].ink
                                  : 'var(--ds-text-secondary)',
                              }}
                            >
                              {validity.label}
                            </Typography>
                          ) : (
                            <Typography
                              sx={{ fontSize: '0.75rem', color: 'var(--ds-text-tertiary)' }}
                            >
                              —
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell sx={{ color: 'var(--ds-text-secondary)' }}>
                          {quote.salesPersonName || '—'}
                        </TableCell>

                        <TableCell align="right">
                          <IconButton
                            size="small"
                            component={NextLink}
                            href={href}
                            aria-label={`Open quote ${quote.quoteNumber}`}
                          >
                            <ChevronRightIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          rowsPerPageOptions={[10, 25, 50]}
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          sx={{
            borderTop: 'none',
            '& .MuiTablePagination-toolbar': { minHeight: 48, px: 1.5 },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: '0.75rem',
              color: 'var(--ds-text-secondary)',
            },
          }}
        />
      </Box>
    </Stack>
  );
}
