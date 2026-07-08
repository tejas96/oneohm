'use client';

import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import {
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import NextLink from 'next/link';
import { type JSX, useState } from 'react';

import { QUOTE_STATUS_BADGE_VARIANT } from '../../constants';
import { useCustomerQuotes } from '../../hooks';
import { TabSkeleton } from '../tab-skeleton';

import { buildRoute, ROUTES } from '@/lib/config/routes';
import { formatCurrency, formatDate, toTitleLabel } from '@/lib/utils';

export interface QuotesTabProps {
  customerId: string;
  enabled: boolean;
  isInactive: boolean;
  onCreateQuote: () => void;
}

const CHIP_COLOR_MAP: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'secondary'
> = {
  default: 'default',
  info: 'info',
  secondary: 'default',
  success: 'success',
  error: 'error',
  warning: 'warning',
};

export function QuotesTab({
  customerId,
  enabled,
  isInactive,
  onCreateQuote,
}: QuotesTabProps): JSX.Element {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data, isLoading } = useCustomerQuotes(customerId, {
    page: page + 1,
    limit: rowsPerPage,
    enabled,
  });

  const quotes = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const inactiveTooltip = 'This customer is inactive. Reactivate to continue this action.';

  if (isLoading && quotes.length === 0) {
    return <TabSkeleton />;
  }

  if (!isLoading && quotes.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          No quotes yet
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {isInactive
            ? 'Quote creation is blocked because this customer is inactive.'
            : 'Create a quote to start the sales process.'}
        </Typography>
        {!isInactive && (
          <Button
            variant="contained"
            size="small"
            startIcon={<PostAddOutlinedIcon />}
            onClick={onCreateQuote}
          >
            Create Quote
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle2" fontWeight={600}>
          Quotes ({total})
        </Typography>
        <Tooltip title={isInactive ? inactiveTooltip : ''}>
          <span>
            <Button
              size="small"
              variant="contained"
              startIcon={<PostAddOutlinedIcon />}
              onClick={onCreateQuote}
              disabled={isInactive}
            >
              Create Quote
            </Button>
          </span>
        </Tooltip>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Quote #</TableCell>
              <TableCell>Property</TableCell>
              <TableCell>System</TableCell>
              <TableCell align="right">Value</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton height={32} />
                    </TableCell>
                  </TableRow>
                ))
              : quotes.map((quote) => {
                  const badgeVariant = QUOTE_STATUS_BADGE_VARIANT[quote.status] ?? 'default';
                  const sizeKw = quote.actualSystemSizeKw ?? quote.systemSizeKw;
                  return (
                    <TableRow key={quote.id} hover>
                      <TableCell>
                        <Typography
                          component={NextLink}
                          href={buildRoute(ROUTES.QUOTES.DETAIL, { id: quote.id })}
                          variant="body2"
                          color="primary"
                          sx={{
                            textDecoration: 'none',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                        >
                          {quote.quoteNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>{quote.propertyName || '—'}</TableCell>
                      <TableCell>{sizeKw ? `${sizeKw} kW` : '—'}</TableCell>
                      <TableCell align="right">
                        {quote.finalPrice ? formatCurrency(quote.finalPrice) : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={toTitleLabel(quote.status)}
                          size="small"
                          color={CHIP_COLOR_MAP[badgeVariant] ?? 'default'}
                        />
                      </TableCell>
                      <TableCell>{formatDate(quote.quoteDate)}</TableCell>
                      <TableCell align="right">
                        <Button
                          component={NextLink}
                          href={buildRoute(ROUTES.QUOTES.DETAIL, { id: quote.id })}
                          size="small"
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                colSpan={7}
                count={total}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(event) => {
                  setRowsPerPage(parseInt(event.target.value, 10));
                  setPage(0);
                }}
              />
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Box>
  );
}
