'use client';

import AddIcon from '@mui/icons-material/Add';
import AlertIcon from '@mui/icons-material/ErrorOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import UploadIcon from '@mui/icons-material/Upload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Box,
  Button,
  IconButton,
  Link as MuiLink,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
} from '@mui/material';
import { QuoteStatus } from '@tejas96/shared/types';
import { FileText } from 'lucide-react';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type JSX, type MouseEvent, useCallback, useMemo, useState } from 'react';

import { QUOTE_STATUS_LABELS } from '../constants';
import { useQuoteStatusCounts, useDeleteQuote, type QuoteListItem } from '../hooks';
import { QuoteStatusDropdown } from './quote-status-dropdown';

import { StatsCard } from '@/components/shared';
import {
  AdvancedTable,
  type BulkAction,
  type ColumnConfig,
} from '@/components/shared/advanced-table';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { showToast } from '@/components/ui/sonner';
import { SystemSizeDisplay } from '@/components/ui/system-size-display';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useTableUrlState, type TableUrlFilterRecord } from '@/lib/hooks';
import { useQuoteListResource, type QuoteListFilters } from '@/lib/hooks/resources';
import { useGatedAction } from '@/lib/rbac';
import { formatCurrency, getErrorMessage } from '@/lib/utils';

// AdvancedTable requires TRow extends Record<string, unknown>.
// QuoteListItem has explicit typed fields, so we widen it here for table usage only.
type QuoteRow = QuoteListItem & Record<string, unknown>;

const EMPTY_ROWS: QuoteRow[] = [];

const STATUS_OPTIONS = Object.values(QuoteStatus).map((value) => ({
  value,
  label: QUOTE_STATUS_LABELS[value],
}));

// ============================================================================
// Adapter functions — pure, module-level, no React deps
// ============================================================================

// Maps AdvancedTable column field names → backend QuoteSortField enum values.
// Required when the column field name differs from the backend enum value string.
const COLUMN_TO_SORT_FIELD: Record<string, string> = {
  finalPrice: 'finalPrice',
  effectivePrice: 'effectivePrice',
  systemSizeKw: 'systemSizeKw',
  status: 'status',
  quoteDate: 'quoteDate',
  validUntil: 'validUntil',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  customerName: 'customerName',
};

function toApiSortField(
  model: { field: string; direction: 'asc' | 'desc' } | null,
): string | undefined {
  if (!model) return undefined;
  // Use explicit map to avoid sending unknown field names to the backend
  return COLUMN_TO_SORT_FIELD[model.field] ?? undefined;
}

function toApiSortOrder(
  model: { field: string; direction: 'asc' | 'desc' } | null,
): 'ASC' | 'DESC' {
  return model?.direction === 'asc' ? 'ASC' : 'DESC';
}

function toLocalDateString(raw: string): string | undefined {
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localDateToUtcDayRange(localDate: string): { fromIso: string; toIso: string } | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) return undefined;
  const yy = Number(match[1]);
  const mm = Number(match[2]);
  const dd = Number(match[3]);
  return {
    fromIso: new Date(yy, mm - 1, dd, 0, 0, 0, 0).toISOString(),
    toIso: new Date(yy, mm - 1, dd, 23, 59, 59, 999).toISOString(),
  };
}

function toQuoteFilters(filters: TableUrlFilterRecord): Partial<QuoteListFilters> {
  // The AdvancedTable date picker emits YYYY-MM-DD (local date, no time component).
  // We expand it to a full UTC day range so the backend's quoteDate range filter
  // covers the entire selected day in the user's local timezone (IST / UTC+5:30).
  const createdAtRaw =
    typeof filters.createdAt === 'string' && filters.createdAt
      ? toLocalDateString(filters.createdAt)
      : undefined;
  const createdAtRange = createdAtRaw ? localDateToUtcDayRange(createdAtRaw) : undefined;

  return {
    status:
      typeof filters.status === 'string' && filters.status
        ? (filters.status as QuoteStatus)
        : undefined,
    fromDate: createdAtRange?.fromIso,
    toDate: (typeof filters.toDate === 'string' && filters.toDate) || createdAtRange?.toIso,
  };
}

// ============================================================================
// Row Actions Menu (private sub-component)
// ============================================================================

function RowActionsMenu({ quote }: { quote: QuoteRow }): JSX.Element {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const deleteQuoteMutation = useDeleteQuote();

  const handleClose = (): void => setAnchorEl(null);
  const removeQuote = useGatedAction('quotes.delete', () => undefined, 'Delete quote');

  const handleDelete = (): void => {
    handleClose();
    if (!removeQuote.allowed) {
      removeQuote.onGatedClick();
      return;
    }
    deleteQuoteMutation.mutate(quote.id, {
      onSuccess: () => showToast.success('Quote deleted'),
      onError: (err) => showToast.error(getErrorMessage(err)),
    });
  };

  const isAccepted = quote.status === QuoteStatus.ACCEPTED;

  return (
    <>
      <IconButton
        size="small"
        onClick={(e: MouseEvent) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget as HTMLElement);
        }}
        aria-label="Row actions"
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { elevation: 2, sx: { minWidth: 180 } } }}
      >
        <MenuItem
          onClick={() => {
            handleClose();
            void router.push(buildRoute(ROUTES.QUOTES.DETAIL, { id: quote.id }));
          }}
        >
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          View Details
        </MenuItem>

        {!isAccepted && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <AlertIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            Delete
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

// ============================================================================
// Bulk actions (module-level — never recreated on render)
// ============================================================================

const BULK_ACTIONS: BulkAction<QuoteRow>[] = [
  {
    label: 'Export Selected',
    onClick: (_rows) => {
      // placeholder — export API pending
    },
  },
];

// ============================================================================
// Column definitions (module-level — never recreated on render)
// ============================================================================

const COLUMNS: ColumnConfig<QuoteRow>[] = [
  {
    field: 'quoteNumber',
    headerName: 'Quote #',
    sortable: true,
    flex: 1.5,
    renderCell: ({ row }) => (
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
        <MuiLink
          component={NextLink}
          href={buildRoute(ROUTES.QUOTES.DETAIL, { id: row.id })}
          prefetch={false}
          underline="hover"
          onClick={(e) => e.stopPropagation()}
          sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}
        >
          {row.quoteNumber}
        </MuiLink>
      </Box>
    ),
  },
  {
    field: 'customerName',
    headerName: 'Customer',
    sortable: true,
    flex: 2,
    renderCell: ({ row }) => {
      const name = (row.customerName as string | undefined) ?? 'Unknown';
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <MUIAvatar name={name} size="sm" sx={{ flexShrink: 0 }} />
          <MUITypography variant="bodyPrimary" noWrap sx={{ fontWeight: 500 }}>
            {name}
          </MUITypography>
        </Box>
      );
    },
  },
  {
    field: 'propertyName',
    headerName: 'Property',
    flex: 1.5,
    renderCell: ({ row }) => (
      <MUITypography variant="body">
        {(row.propertyName as string | undefined) ?? '-'}
      </MUITypography>
    ),
  },
  {
    field: 'systemSizeKw',
    headerName: 'System',
    sortable: true,
    flex: 1,
    renderCell: ({ row }) => (
      <SystemSizeDisplay
        actualKw={row.actualSystemSizeKw}
        requestedKw={row.systemSizeKw}
        layout="stacked"
      />
    ),
  },
  {
    field: 'finalPrice',
    headerName: 'Value',
    sortable: true,
    flex: 1.5,
    renderCell: ({ row }) => {
      const finalPrice = row.finalPrice as number | undefined;
      return (
        <Box>
          <MUITypography variant="bodyPrimary" sx={{ fontWeight: 500 }}>
            {finalPrice != null ? formatCurrency(finalPrice) : '-'}
          </MUITypography>
        </Box>
      );
    },
  },
  {
    field: 'status',
    headerName: 'Status',
    filterable: true,
    filterType: 'select',
    filterOptions: STATUS_OPTIONS,
    flex: 1.5,
    renderCell: ({ row }) => (
      <QuoteStatusDropdown quoteId={row.id} status={row.status as QuoteStatus} size="xs" />
    ),
  },
  {
    field: 'createdAt',
    headerName: 'Created',
    sortable: true,
    filterable: true,
    filterType: 'date',
    flex: 1.5,
    renderCell: ({ row }) => {
      const ts = row.createdAt as string | undefined;
      if (!ts) return <MUITypography variant="placeholder">-</MUITypography>;
      return (
        <MUITypography variant="body">
          {new Date(ts).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </MUITypography>
      );
    },
  },
  {
    field: 'validUntil',
    headerName: 'Valid Until',
    sortable: true,
    flex: 1.5,
    renderCell: ({ row }) => {
      const validUntil = row.validUntil as string | undefined;
      if (!validUntil) return <MUITypography variant="placeholder">-</MUITypography>;
      const isExpired = new Date(validUntil) < new Date();
      return (
        <MUIStatusChip
          label={new Date(validUntil).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
          color={isExpired ? 'error' : 'default'}
        />
      );
    },
  },
  {
    field: 'actions',
    headerName: '',
    hideable: false,
    width: 48,
    actions: (row) => <RowActionsMenu quote={row} />,
  },
];

// ============================================================================
// Main component
// ============================================================================

export function QuoteListPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Shared by both empty states below. `/quotes/new` is route-gated too, but a
  // button that navigates to a deny page is a worse answer than one that says
  // which permission is missing without leaving the list.
  const createQuote = useGatedAction(
    'quotes.create',
    () => void router.push(ROUTES.QUOTES.NEW),
    'Create quote',
  );

  // Bridge bare `?status=draft` sidebar links into the table's initial filter state.
  // Sidebar nav uses unprefixed params; useTableUrlState only reads prefixed keys
  // (quotes_filters). We pass initialFilters so the very first render is already
  // filtered — no post-mount effect, no race condition, no hard-refresh needed.
  const rawStatusParam = searchParams.get('status');
  const rawToDateParam = searchParams.get('toDate');

  const initialFilters = useMemo(() => {
    const filters: TableUrlFilterRecord = {};
    if (rawStatusParam) filters.status = rawStatusParam;
    if (rawToDateParam) filters.toDate = rawToDateParam;
    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [rawStatusParam, rawToDateParam]);

  // URL-synced table state — single source of truth for all pagination/sort/filter/search
  const urlState = useTableUrlState({ prefix: 'quotes', defaultPageSize: 10, initialFilters });

  const { data: statusCounts } = useQuoteStatusCounts();

  // Derived stats
  const pendingCount =
    (statusCounts?.draft ?? 0) + (statusCounts?.sent ?? 0) + (statusCounts?.viewed ?? 0);
  const conversionRate =
    statusCounts && statusCounts.total > 0
      ? Math.round((statusCounts.accepted / statusCounts.total) * 100)
      : 0;

  // Server-side data fetch — driven entirely by URL state via FDAL resource hook
  const {
    data: quoteData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuoteListResource({
    page: urlState.state.page + 1,
    limit: urlState.state.pageSize,
    search: urlState.state.search || undefined,
    sortBy: toApiSortField(urlState.state.sortModel),
    sortOrder: toApiSortOrder(urlState.state.sortModel),
    ...toQuoteFilters(urlState.state.filters),
  });

  const tableRows = useMemo<QuoteRow[]>(
    () => (quoteData?.data as QuoteRow[] | undefined) ?? EMPTY_ROWS,
    [quoteData?.data],
  );

  const renderEmptyState = useCallback(
    (hasActiveFilters: boolean): JSX.Element =>
      hasActiveFilters ? (
        <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <MUITypography variant="body">No quotes match your search and filters.</MUITypography>
          <Button size="small" variant="outlined" onClick={urlState.resetAll}>
            Clear all filters
          </Button>
        </Box>
      ) : (
        <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <MUITypography variant="body">
            No quotes yet. Get started by creating your first quote.
          </MUITypography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={createQuote.onGatedClick}
            aria-disabled={!createQuote.allowed}
            sx={{ opacity: createQuote.allowed ? 1 : 0.5 }}
          >
            Create Quote
          </Button>
        </Box>
      ),
    [router, urlState.resetAll],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* ── Page Header ── */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: { lg: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box>
          <MUITypography variant="drawerTitle" component="h1">
            Quotations
          </MUITypography>
          <MUITypography variant="body" sx={{ mt: 0.25 }}>
            Create and manage customer quotations
          </MUITypography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button variant="outlined" size="small" startIcon={<UploadIcon />} disabled>
            Export
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={createQuote.onGatedClick}
            aria-disabled={!createQuote.allowed}
            sx={{ opacity: createQuote.allowed ? 1 : 0.5 }}
          >
            Create Quote
          </Button>
        </Stack>
      </Box>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Quotes"
          value={statusCounts?.total ?? 0}
          icon={<FileText className="size-icon text-primary" />}
        />
        <StatsCard
          title="Pending"
          value={pendingCount}
          icon={<FileText className="size-icon text-info" />}
        />
        <StatsCard
          title="Accepted"
          value={statusCounts?.accepted ?? 0}
          icon={<FileText className="size-icon text-success" />}
        />
        <StatsCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={<FileText className="size-icon text-warning" />}
        />
      </div>

      {/* ── Error banner ── */}
      {isError && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            borderRadius: '6px',
            border: '1px solid',
            borderColor: 'error.light',
            backgroundColor: 'rgba(220,38,38,0.06)',
          }}
        >
          <AlertIcon color="error" />
          <Box sx={{ flex: 1 }}>
            <MUITypography variant="alertTitle" sx={{ color: 'error.main' }}>
              Failed to load quotes
            </MUITypography>
            <MUITypography variant="finePrint">{getErrorMessage(error)}</MUITypography>
          </Box>
          <Button variant="outlined" color="error" size="small" onClick={() => void refetch()}>
            Retry
          </Button>
        </Box>
      )}

      {/* ── Table ── */}
      <AdvancedTable<QuoteRow>
        key="quotes-table"
        columns={COLUMNS}
        rows={tableRows}
        rowIdField="id"
        paginationMode="server"
        loading={isLoading}
        refetching={isFetching && !isLoading}
        page={urlState.state.page}
        pageSize={urlState.state.pageSize}
        totalRowCount={quoteData?.meta.total ?? 0}
        sortModel={urlState.state.sortModel}
        filterModel={urlState.state.filters}
        onPageChange={urlState.setPage}
        onPageSizeChange={urlState.setPageSize}
        onSortChange={urlState.setSortModel}
        onFilterChange={urlState.setFilters}
        onSearchChange={urlState.setSearch}
        onRowClick={(row) => {
          void router.push(buildRoute(ROUTES.QUOTES.DETAIL, { id: row.id }));
        }}
        enableRowSelection
        bulkActions={BULK_ACTIONS}
        enableSearch
        enableFilters
        enablePagination
        enableColumnVisibility
        searchPlaceholder="Search by quote #, customer..."
        itemLabel="quotes"
        renderEmptyState={renderEmptyState}
      />
    </Box>
  );
}
