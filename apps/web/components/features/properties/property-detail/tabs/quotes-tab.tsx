'use client';

import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { QuoteStatus } from '@tejas96/shared/types';
import NextLink from 'next/link';
import { type JSX, useMemo } from 'react';

import { QUOTE_STATUS_BADGE_VARIANT } from '@/components/features/customers/constants';
import { usePropertyQuoteVersions } from '@/components/features/quotes';
import { usePropertyLockStatus } from '@/components/features/quotes/hooks/use-quotes';
import { SystemSizeDisplay } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { formatCurrency, formatDate, toTitleLabel } from '@/lib/utils';

interface QuotesTabProps {
  propertyId: string;
  enabled: boolean;
  isInactiveCustomer: boolean;
  onCreateQuote: () => void;
}

export function QuotesTab({
  propertyId,
  enabled,
  isInactiveCustomer,
  onCreateQuote,
}: QuotesTabProps): JSX.Element {
  const { data: quotes = [], isLoading } = usePropertyQuoteVersions(
    enabled ? propertyId : undefined,
  );
  const { data: lockStatus } = usePropertyLockStatus(enabled ? propertyId : undefined);

  const rows = useMemo(
    () =>
      quotes.map((quote) => ({
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        systemSizeKw: quote.systemSizeKw,
        actualSystemSizeKw: quote.actualSystemSizeKw,
        effectivePrice: quote.effectivePrice,
        status: quote.status,
        quoteDate: quote.quoteDate,
      })),
    [quotes],
  );

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'quoteNumber',
        headerName: 'Quote #',
        flex: 1.2,
        minWidth: 160,
        renderCell: (params) => (
          <Button
            component={NextLink}
            href={buildRoute(ROUTES.QUOTES.DETAIL, { id: params.row.id as string })}
            size="small"
            sx={{ textTransform: 'none' }}
          >
            {params.value as string}
          </Button>
        ),
      },
      {
        field: 'systemSizeKw',
        headerName: 'System Size',
        flex: 1,
        minWidth: 170,
        renderCell: (params) => (
          <SystemSizeDisplay
            requestedKw={params.row.systemSizeKw as number | undefined}
            actualKw={params.row.actualSystemSizeKw as number | undefined}
            size="sm"
            layout="inline"
          />
        ),
      },
      {
        field: 'effectivePrice',
        headerName: 'Value',
        width: 140,
        valueFormatter: (value) => (value ? formatCurrency(Number(value)) : '—'),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
        renderCell: (params) => (
          <Chip
            label={toTitleLabel(params.value as QuoteStatus)}
            size="small"
            color={
              (QUOTE_STATUS_BADGE_VARIANT[params.value as QuoteStatus] ?? 'default') as
                | 'default'
                | 'primary'
                | 'secondary'
                | 'error'
                | 'info'
                | 'success'
                | 'warning'
            }
          />
        ),
      },
      {
        field: 'quoteDate',
        headerName: 'Date',
        width: 140,
        valueFormatter: (value) => formatDate(String(value)),
      },
    ],
    [],
  );

  const createBlocked = isInactiveCustomer || lockStatus?.locked;

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack spacing={0.5}>
          <Typography variant="subtitle2" fontWeight={600}>
            Quotes ({rows.length})
          </Typography>
          {lockStatus?.locked && (
            <Typography variant="caption" color="warning.dark">
              New quotes locked: accepted quote {lockStatus.acceptedQuoteNumber || 'exists'}.
            </Typography>
          )}
        </Stack>
        <Button
          size="small"
          variant="contained"
          startIcon={<PostAddOutlinedIcon />}
          disabled={createBlocked}
          onClick={onCreateQuote}
        >
          Create Quote
        </Button>
      </Stack>

      <Box sx={{ height: 440 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          disableColumnMenu
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10, page: 0 },
            },
          }}
          sx={{ borderRadius: 1 }}
        />
      </Box>
    </Box>
  );
}
