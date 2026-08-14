'use client';

import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
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
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { QuoteStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import type { JSX } from 'react';

import { usePropertyQuoteSummary } from '../../hooks';

import { QUOTE_STATUS_TONE } from '@/components/features/customers/constants';
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
} from '@/components/features/customers/customer-detail/primitives';
import { detailTableSx, tableCardSx } from '@/components/features/customers/customer-detail/styles';
import { usePropertyLockStatus } from '@/components/features/quotes/hooks/use-quotes';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useGatedAction } from '@/lib/rbac';
import {
  formatCurrency,
  formatDate,
  formatSystemSize,
  hasSystemSizeVariance,
  toTitleLabel,
} from '@/lib/utils';

export interface QuotesTabProps {
  propertyId: string;
  enabled: boolean;
  isInactiveCustomer: boolean;
  onCreateQuote: () => void;
}

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
 * `validUntil` has always been on the payload and was never rendered here —
 * the one date a rep chases, when the price stops being real, was invisible on
 * the site's own quote list.
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
  propertyId,
  enabled,
  isInactiveCustomer,
  onCreateQuote,
}: QuotesTabProps): JSX.Element {
  const createQuoteAction = useGatedAction('quotes.create', onCreateQuote, 'Create quote');
  /*
   * Sourced from `/quotes?propertyId=` rather than the versions endpoint the
   * old DataGrid used. The versions payload carries only id / number / status
   * / date / size — no `finalPrice`, no subsidy, no `validUntil`, no owner —
   * so the "Value" column was showing `effectivePrice` (net of subsidy) under
   * a heading that reads as the quoted price, and four useful columns could
   * not be shown at all.
   */
  const { quotes, count, isLoading } = usePropertyQuoteSummary(propertyId, { enabled });
  const { data: lockStatus } = usePropertyLockStatus(enabled ? propertyId : undefined);

  const createBlocked = isInactiveCustomer || Boolean(lockStatus?.locked);
  const blockedReason = isInactiveCustomer
    ? 'This customer is inactive. Reactivate to continue this action.'
    : lockStatus?.locked
      ? `Locked by accepted quote ${lockStatus.acceptedQuoteNumber ?? ''}`.trim()
      : '';

  const createButton = (
    <Tooltip title={blockedReason}>
      <span>
        <Button
          size="small"
          variant="contained"
          startIcon={<PostAddOutlinedIcon />}
          onClick={createQuoteAction.onGatedClick}
          aria-disabled={!createQuoteAction.allowed}
          disabled={createBlocked}
        >
          Create quote
        </Button>
      </span>
    </Tooltip>
  );

  if (isLoading && quotes.length === 0) {
    return (
      <Box sx={tableCardSx}>
        <RowSkeleton rows={4} />
      </Box>
    );
  }

  if (quotes.length === 0) {
    return (
      <DetailCard>
        <EmptyPane
          size="page"
          icon={<DescriptionOutlinedIcon />}
          title="No quotes yet"
          description={
            isInactiveCustomer
              ? 'Quote creation is blocked while this customer is inactive.'
              : 'Build the first quote to put a price in front of this customer.'
          }
          action={!isInactiveCustomer ? createButton : undefined}
        />
      </DetailCard>
    );
  }

  return (
    <Stack gap={1.5}>
      <SectionHeading count={count} sx={{ mb: 0 }} action={createButton}>
        Quotes
      </SectionHeading>

      {lockStatus?.locked && (
        <TonePill
          icon={<LockOutlinedIcon />}
          label={`New quotes locked — ${lockStatus.acceptedQuoteNumber ?? 'a quote'} has been accepted`}
          tone="info"
        />
      )}

      <Box sx={tableCardSx}>
        <TableContainer>
          <Table size="small" sx={detailTableSx}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 180 }}>Quote</TableCell>
                <TableCell sx={{ minWidth: 120 }}>System</TableCell>
                <TableCell align="right" sx={{ minWidth: 150 }}>
                  Value
                </TableCell>
                <TableCell sx={{ minWidth: 110 }}>Status</TableCell>
                <TableCell sx={{ minWidth: 140 }}>Valid until</TableCell>
                <TableCell sx={{ minWidth: 130 }}>Owner</TableCell>
                <TableCell align="right" sx={{ width: 56 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {quotes.map((quote) => {
                const href = buildRoute(ROUTES.QUOTES.DETAIL, { id: quote.id });
                const tone: DetailTone = QUOTE_STATUS_TONE[quote.status] ?? 'neutral';
                const validity = getValidity(quote.validUntil, quote.status);
                const hasSubsidy = Boolean(quote.subsidyAmount && quote.subsidyAmount > 0);
                const selectedKw = quote.systemSizeKw;
                const displayKw = quote.actualSystemSizeKw ?? selectedKw;
                const sizeDiffers = hasSystemSizeVariance(quote.actualSystemSizeKw, selectedKw);

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

                    <TableCell>
                      <Mono>{displayKw ? `${formatSystemSize(displayKw)} kW` : '—'}</Mono>
                      <Typography sx={{ fontSize: '0.6875rem', color: 'var(--ds-text-tertiary)' }}>
                        {[
                          quote.systemType ? toTitleLabel(quote.systemType) : null,
                          sizeDiffers ? `selected ${formatSystemSize(selectedKw)} kW` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Mono sx={{ fontWeight: 600 }}>
                        {quote.finalPrice ? formatCurrency(quote.finalPrice) : '—'}
                      </Mono>
                      {/*
                       * `finalPrice` is the price BEFORE subsidy — the server
                       * computes `effectivePrice = max(0, finalPrice − subsidy)`.
                       * The net figure is quoted directly rather than leaving
                       * the reader to do the arithmetic.
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
                        <Typography sx={{ fontSize: '0.75rem', color: 'var(--ds-text-tertiary)' }}>
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
      </Box>
    </Stack>
  );
}
