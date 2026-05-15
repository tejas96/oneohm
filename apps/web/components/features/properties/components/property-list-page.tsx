'use client';

import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EditIcon from '@mui/icons-material/Edit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Box,
  Button,
  IconButton,
  Link as MuiLink,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import { PropertySortField, SortOrder } from '@oneohm-epc/shared/types';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MarkAsLostModal } from './mark-as-lost-modal';
import {
  LEAD_TEMPERATURE_OPTIONS,
  PROPERTY_STATUS_OPTIONS,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPE_OPTIONS,
  QUOTE_STATUS_OPTIONS,
  TEMP_DOT_MUI_COLOR,
} from '../constants';
import {
  type Property as PropertyBase,
  type PropertyFilters,
  useProperties,
  usePropertyTemperatureStats,
} from '../hooks';

import {
  AdvancedTable,
  type BulkAction,
  type ColumnConfig,
} from '@/components/shared/advanced-table';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { type TableUrlFilterRecord, useTableUrlState } from '@/lib/hooks';
import { formatCurrency, getErrorMessage, toTitleLabel } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

// AdvancedTable requires TRow extends Record<string, unknown>.
// PropertyBase has explicit typed fields, so we widen it here for table usage only.
type PropertyRow = PropertyBase & Record<string, unknown>;
const EMPTY_PROPERTY_ROWS: PropertyRow[] = [];

// ============================================================================
// Adapter functions — pure, module-level, no React deps
// ============================================================================

const SORT_FIELD_MAP: Record<string, PropertySortField> = {
  propertyCode: PropertySortField.PROPERTY_NAME,
  latestQuoteSystemSizeKw: PropertySortField.SYSTEM_SIZE,
  latestQuoteFinalPrice: PropertySortField.QUOTE_COST,
  createdAt: PropertySortField.CREATED_AT,
};

function toApiSortField(
  model: { field: string; direction: 'asc' | 'desc' } | null,
): PropertySortField {
  if (!model) return PropertySortField.CREATED_AT;
  return SORT_FIELD_MAP[model.field] ?? PropertySortField.CREATED_AT;
}

function toApiSortOrder(model: { field: string; direction: 'asc' | 'desc' } | null): SortOrder {
  return model?.direction === 'asc' ? SortOrder.ASC : SortOrder.DESC;
}

/** Convert any date value to a YYYY-MM-DD local string, or undefined if invalid. */
function toLocalDateString(raw: string): string | undefined {
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Convert a YYYY-MM-DD local date string to UTC start-of-day / end-of-day ISO range. */
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

/**
 * Map AdvancedTable URL filter record to PropertyFilters for the API.
 *
 * Rules:
 * - Strip 'all' values — backend @IsEnum rejects them (400).
 * - createdAt date column → fromDate/toDate ISO day range.
 * - systemSize range stored as {min?, max?} under 'latestQuoteSystemSizeKw'.
 * - quoteStatus is filterable via backend after Phase-2 backend param was added.
 * - createdBy is passed as userId (or 'me' — backend resolves to current user id).
 */
function toPropertyFilters(filters: TableUrlFilterRecord): Partial<PropertyFilters> {
  const raw = filters as Record<string, unknown>;
  const result: Partial<PropertyFilters> = {};

  if (typeof raw.leadTemperature === 'string' && raw.leadTemperature !== 'all') {
    result.leadTemperature = raw.leadTemperature as PropertyFilters['leadTemperature'];
  }
  if (typeof raw.propertyType === 'string' && raw.propertyType !== 'all') {
    result.propertyType = raw.propertyType as PropertyFilters['propertyType'];
  }
  if (typeof raw.status === 'string' && raw.status !== 'all') {
    result.status = raw.status as PropertyFilters['status'];
  }
  if (typeof raw.quoteStatus === 'string' && raw.quoteStatus !== 'all') {
    result.quoteStatus = raw.quoteStatus as PropertyFilters['quoteStatus'];
  }
  if (typeof raw.city === 'string' && raw.city) result.city = raw.city;
  if (typeof raw.state === 'string' && raw.state) result.state = raw.state;
  if (typeof raw.createdBy === 'string' && raw.createdBy) result.createdBy = raw.createdBy;

  // Numeric range for system size (stored as { min?, max? } object by 'range' filterType)
  const sizeRange = raw.latestQuoteSystemSizeKw as { min?: string; max?: string } | undefined;
  if (sizeRange?.min !== undefined && sizeRange.min !== '') {
    const n = Number(sizeRange.min);
    if (!Number.isNaN(n)) result.systemSizeMin = n;
  }
  if (sizeRange?.max !== undefined && sizeRange.max !== '') {
    const n = Number(sizeRange.max);
    if (!Number.isNaN(n)) result.systemSizeMax = n;
  }

  // Date range from the createdAt date column filter
  const rawDate = typeof raw.createdAt === 'string' ? raw.createdAt : undefined;
  const localDate = rawDate ? toLocalDateString(rawDate) : undefined;
  const utcRange = localDate ? localDateToUtcDayRange(localDate) : undefined;
  if (utcRange) {
    result.fromDate = utcRange.fromIso;
    result.toDate = utcRange.toIso;
  }

  return result;
}

// ============================================================================
// Bulk actions (stable module-level constant — no re-creation on render)
// ============================================================================

const BULK_ACTIONS: BulkAction<PropertyRow>[] = [
  {
    label: 'Export Selected',
    onClick: (_rows) => {
      // placeholder — export API pending
    },
  },
  {
    label: 'Change Temperature',
    disabled: true,
    disabledTooltip: 'Coming in Phase 2',
    onClick: () => undefined,
  },
  {
    label: 'Mark as Lost',
    color: 'error',
    disabled: true,
    disabledTooltip: 'Coming in Phase 2',
    onClick: () => undefined,
  },
];

// ============================================================================
// Row Actions Menu (private sub-component — keeps PropertyListPage clean)
// ============================================================================

interface RowActionsMenuProps {
  property: PropertyRow;
  onMarkAsLost: (property: PropertyRow) => void;
}

function RowActionsMenu({ property, onMarkAsLost }: RowActionsMenuProps): JSX.Element {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleClose = (): void => setAnchorEl(null);

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
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
            void router.push(buildRoute(ROUTES.PROPERTIES.DETAIL, { id: property.id }));
          }}
        >
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          View Details
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            void router.push(buildRoute(ROUTES.PROPERTIES.EDIT, { id: property.id }));
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit Property
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            void router.push(
              `${ROUTES.QUOTES.NEW}?propertyId=${property.id}&customerId=${property.customerId}`,
            );
          }}
        >
          <ListItemIcon>
            <NoteAddIcon fontSize="small" />
          </ListItemIcon>
          Create Quote
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            void router.push(`${ROUTES.FOLLOWUPS.NEW}?propertyId=${property.id}`);
          }}
        >
          <ListItemIcon>
            <CalendarTodayIcon fontSize="small" />
          </ListItemIcon>
          Schedule Followup
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            onMarkAsLost(property);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <WarningAmberIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          Mark as Lost
        </MenuItem>
      </Menu>
    </>
  );
}

// ============================================================================
// Column factory (receives callbacks + stats — defined outside component to
// prevent reference churn; only rebuilt when deps change via useMemo)
// ============================================================================

interface BuildColumnsArgs {
  onMarkAsLost: (property: PropertyRow) => void;
  tempStats: Record<string, number> | undefined;
}

function buildColumns({ onMarkAsLost, tempStats }: BuildColumnsArgs): ColumnConfig<PropertyRow>[] {
  // Augment lead temperature options with live counts from the stats API
  const leadTempOptions = LEAD_TEMPERATURE_OPTIONS.map(({ value, label }) => {
    const count = tempStats?.[value];
    return { value, label: count !== undefined ? `${label} (${count})` : label };
  });

  return [
    {
      field: 'propertyCode',
      headerName: 'Property',
      sortable: true,
      flex: 3,
      cellSx: { whiteSpace: 'normal', verticalAlign: 'top', py: 1 },
      renderCell: ({ row }) => {
        const address = (row.address as string | undefined) ?? '';
        const customer = (row.customerName as string | undefined) ?? '';
        const tooltipText = [address, customer].filter(Boolean).join('\n') || '-';

        return (
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              <MuiLink
                component={NextLink}
                href={buildRoute(ROUTES.PROPERTIES.DETAIL, { id: row.id })}
                prefetch={false}
                underline="hover"
                color="inherit"
                noWrap
                sx={{
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  '&:hover': { color: 'primary.main' },
                }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                {row.propertyCode ?? row.propertyName ?? 'Unnamed Property'}
              </MuiLink>

              {/* Temperature dot — uses theme color tokens from constants */}
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: TEMP_DOT_MUI_COLOR[row.leadTemperature] ?? 'text.disabled',
                  flexShrink: 0,
                }}
                title={`${toTitleLabel(row.leadTemperature)} Lead`}
              />

              {/* Loan indicator */}
              {row.wantsLoan && (
                <MUITypography
                  variant="inherit"
                  component="span"
                  color="primary.main"
                  sx={{ fontWeight: 600, flexShrink: 0, fontSize: '0.75rem' }}
                  title="Loan Required"
                >
                  $
                </MUITypography>
              )}
            </Box>

            {/* Address (up to 2 lines) + customer name (always visible below) */}
            <Tooltip
              title={<span style={{ whiteSpace: 'pre-line' }}>{tooltipText}</span>}
              placement="bottom-start"
              enterDelay={500}
            >
              <Box sx={{ mt: 0.25, minWidth: 0 }}>
                {address && (
                  <MUITypography
                    variant="timestamp"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      lineHeight: 1.4,
                    }}
                  >
                    {address}
                  </MUITypography>
                )}
                {customer && (
                  <MUITypography
                    variant="timestamp"
                    noWrap
                    sx={{ color: 'text.disabled', fontStyle: 'italic', mt: 0.125 }}
                  >
                    {customer}
                  </MUITypography>
                )}
                {!address && !customer && <MUITypography variant="placeholder">-</MUITypography>}
              </Box>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      field: 'latestQuoteSystemSizeKw',
      headerName: 'System Size',
      sortable: true,
      filterable: true,
      filterType: 'range',
      flex: 1,
      renderCell: ({ row }) => {
        const size = row.latestQuoteSystemSizeKw;
        if (size == null) return <MUITypography variant="placeholder">-</MUITypography>;
        return <MUITypography variant="bodyPrimary">{Number(size).toFixed(2)} kW</MUITypography>;
      },
    },
    {
      field: 'latestQuoteFinalPrice',
      headerName: 'Quote Cost',
      sortable: true,
      flex: 1,
      renderCell: ({ row }) => {
        const price = row.latestQuoteFinalPrice;
        if (price == null) return <MUITypography variant="placeholder">-</MUITypography>;
        return <MUITypography variant="bodyPrimary">{formatCurrency(Number(price))}</MUITypography>;
      },
    },
    {
      field: 'latestQuoteStatus',
      headerName: 'Quote Status',
      filterable: true,
      filterType: 'select',
      filterOptions: QUOTE_STATUS_OPTIONS,
      flex: 1,
      renderCell: ({ row }) => {
        const status = row.latestQuoteStatus as string | undefined;
        if (!status) return <MUITypography variant="placeholder">None</MUITypography>;
        return <MUIStatusChip label={toTitleLabel(status)} colorSeed={status} />;
      },
    },
    {
      field: 'leadTemperature',
      headerName: 'Temperature',
      filterable: true,
      filterType: 'select',
      filterOptions: leadTempOptions,
      flex: 1,
      renderCell: ({ row }) => {
        const temp = row.leadTemperature as string;
        const color = temp === 'hot' ? 'error' : temp === 'warm' ? 'warning' : ('info' as const);
        return <MUIStatusChip label={toTitleLabel(temp)} color={color} autoColor={false} />;
      },
    },
    {
      field: 'propertyType',
      headerName: 'Type',
      filterable: true,
      filterType: 'select',
      filterOptions: PROPERTY_TYPE_OPTIONS,
      flex: 1,
      renderCell: ({ row }) => (
        <MUIStatusChip
          label={PROPERTY_TYPE_LABELS[row.propertyType] ?? toTitleLabel(row.propertyType)}
          colorSeed={row.propertyType}
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      filterable: true,
      filterType: 'select',
      filterOptions: PROPERTY_STATUS_OPTIONS,
      flex: 1,
      renderCell: ({ row }) => {
        const status = row.status as string | undefined;
        if (!status) return <MUITypography variant="placeholder">-</MUITypography>;
        return <MUIStatusChip label={toTitleLabel(status)} colorSeed={status} variant="filled" />;
      },
    },
    {
      field: 'createdAt',
      headerName: 'Added',
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
      field: 'creatorName',
      headerName: 'Created By',
      filterable: true,
      filterType: 'text',
      flex: 1,
      renderCell: ({ row }) => {
        const name = (row.creatorName as string | undefined) ?? '';
        if (!name) return <MUITypography variant="placeholder">-</MUITypography>;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MUIAvatar name={name} size="sm" sx={{ flexShrink: 0 }} />
            <MUITypography variant="body" noWrap>
              {name}
            </MUITypography>
          </Box>
        );
      },
    },
    {
      field: 'actions',
      headerName: '',
      hideable: false,
      width: 48,
      actions: (row) => <RowActionsMenu property={row} onMarkAsLost={onMarkAsLost} />,
    },
  ];
}

// ============================================================================
// Main component
// ============================================================================

export function PropertyListPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL-synced table state — single source of truth for all table interactions
  const urlState = useTableUrlState({ prefix: 'properties', defaultPageSize: 10 });

  // Bridge for Next.js <Link> sidebar navigation (e.g. ?leadTemperature=hot).
  // App Router <Link> does NOT fire `popstate`, so useTableUrlState cannot detect it.
  // We use refs to hold the latest setters to satisfy react-hooks/exhaustive-deps.
  const setFiltersRef = useRef(urlState.setFilters);
  setFiltersRef.current = urlState.setFilters;
  const filtersRef = useRef(urlState.state.filters);
  filtersRef.current = urlState.state.filters;

  useEffect(() => {
    const urlTemp = searchParams.get('leadTemperature');
    if (urlTemp && urlTemp !== 'all') {
      // Absorb the bare ?leadTemperature param into the managed filter state,
      // then immediately strip it from the URL so it cannot re-trigger this effect.
      // Without stripping, every searchParams change (e.g. clearing properties_filters)
      // would re-fire this effect and re-apply the filter, creating an infinite loop.
      const next = new URLSearchParams(window.location.search);
      next.delete('leadTemperature');
      const qs = next.toString();
      window.history.replaceState(
        null,
        '',
        qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
      );

      setFiltersRef.current({ ...filtersRef.current, leadTemperature: urlTemp });
    }
  }, [searchParams]);

  // Temperature stats for filter option count labels (e.g. "Hot (12)")
  const { stats } = usePropertyTemperatureStats();

  // Server-side data fetch — driven entirely by URL state
  const {
    data: propertyData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useProperties({
    page: urlState.state.page + 1, // 0-based internal → 1-based API
    limit: urlState.state.pageSize,
    search: urlState.state.search || undefined,
    sortBy: toApiSortField(urlState.state.sortModel),
    sortOrder: toApiSortOrder(urlState.state.sortModel),
    ...toPropertyFilters(urlState.state.filters),
  });

  const tableRows = useMemo<PropertyRow[]>(
    () => (propertyData?.data as PropertyRow[] | undefined) ?? EMPTY_PROPERTY_ROWS,
    [propertyData?.data],
  );

  // Modal state
  const [selectedProperty, setSelectedProperty] = useState<PropertyRow | null>(null);
  const [lostModalOpen, setLostModalOpen] = useState(false);

  const handleMarkAsLost = useCallback((property: PropertyRow): void => {
    setSelectedProperty(property);
    setLostModalOpen(true);
  }, []);

  const columns = useMemo(
    (): ColumnConfig<PropertyRow>[] =>
      buildColumns({
        onMarkAsLost: handleMarkAsLost,
        tempStats: stats as Record<string, number> | undefined,
      }),
    [handleMarkAsLost, stats],
  );

  const renderEmptyState = useCallback(
    (hasActiveFilters: boolean): JSX.Element =>
      hasActiveFilters ? (
        <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <RadioButtonUncheckedIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
          <MUITypography variant="body">No properties match your search and filters.</MUITypography>
          <Button size="small" variant="outlined" onClick={urlState.resetAll}>
            Clear all filters
          </Button>
        </Box>
      ) : (
        <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <RadioButtonUncheckedIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
          <MUITypography variant="body">
            No properties yet. Get started by adding your first property.
          </MUITypography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              void router.push(ROUTES.PROPERTIES.NEW);
            }}
          >
            Add Property
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
            All Properties
          </MUITypography>
          <MUITypography variant="body" sx={{ mt: 0.25 }}>
            Track properties and their lead status
          </MUITypography>
        </Box>

        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => {
            void router.push(ROUTES.PROPERTIES.NEW);
          }}
        >
          Add Property
        </Button>
      </Box>

      {/* ── Error Banner ── */}
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
          <ErrorOutlineIcon color="error" />
          <Box sx={{ flex: 1 }}>
            <MUITypography variant="alertTitle" sx={{ color: 'error.main' }}>
              Failed to load properties
            </MUITypography>
            <MUITypography variant="finePrint">{getErrorMessage(error)}</MUITypography>
          </Box>
          <Button variant="outlined" color="error" size="small" onClick={() => void refetch()}>
            Retry
          </Button>
        </Box>
      )}

      {/* ── Table ── */}
      <AdvancedTable<PropertyRow>
        key="properties-table"
        columns={columns}
        rows={tableRows}
        rowIdField="id"
        paginationMode="server"
        loading={isLoading}
        refetching={isFetching && !isLoading}
        // Controlled state from URL
        page={urlState.state.page}
        pageSize={urlState.state.pageSize}
        totalRowCount={propertyData?.meta.total ?? 0}
        sortModel={urlState.state.sortModel}
        filterModel={urlState.state.filters}
        // Callbacks write back to URL → trigger new API call
        onPageChange={urlState.setPage}
        onPageSizeChange={urlState.setPageSize}
        onSortChange={urlState.setSortModel}
        onFilterChange={urlState.setFilters}
        onSearchChange={urlState.setSearch}
        // Row interaction
        onRowClick={(row) => {
          void router.push(buildRoute(ROUTES.PROPERTIES.DETAIL, { id: row.id }));
        }}
        // Row selection
        enableRowSelection
        bulkActions={BULK_ACTIONS}
        // Features
        enableSearch
        enableFilters
        enablePagination
        enableColumnVisibility
        searchPlaceholder="Search by name, address, city, consumer no..."
        itemLabel="properties"
        renderEmptyState={renderEmptyState}
      />

      {/* ── Modals ── */}
      <MarkAsLostModal
        open={lostModalOpen}
        onOpenChange={setLostModalOpen}
        property={selectedProperty}
      />
    </Box>
  );
}
