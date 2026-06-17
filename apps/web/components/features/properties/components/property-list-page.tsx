'use client';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import PhoneIcon from '@mui/icons-material/Phone';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Autocomplete,
  Box,
  Button,
  IconButton,
  Link as MuiLink,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import { PropertySortField, SortOrder, ConnectionType } from '@tejas96/shared/types';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MarkAsLostModal } from './mark-as-lost-modal';
import {
  PROPERTY_STATUS_OPTIONS,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPE_OPTIONS,
  QUOTE_STATUS_OPTIONS,
  TEMP_DOT_MUI_COLOR,
} from '../constants';
import { type Property as PropertyBase, type PropertyFilters, useProperties } from '../hooks';

import { useEmployees } from '@/components/features/employees';
import {
  AdvancedTable,
  type BulkAction,
  type ColumnConfig,
} from '@/components/shared/advanced-table';
import { WhatsAppIcon } from '@/components/ui';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { type TableUrlFilterRecord, useTableUrlState } from '@/lib/hooks';
import { formatCurrency, formatPhoneForWhatsApp, getErrorMessage, toTitleLabel } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

// AdvancedTable requires TRow extends Record<string, unknown>.
// PropertyBase has explicit typed fields, so we widen it here for table usage only.
type PropertyRow = PropertyBase & Record<string, unknown>;
const EMPTY_PROPERTY_ROWS: PropertyRow[] = [];

const CONNECTION_TYPE_OPTIONS = Object.values(ConnectionType).map((value) => ({
  value,
  label: toTitleLabel(value),
}));

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
  if (typeof raw.connectionType === 'string' && raw.connectionType !== 'all') {
    result.connectionType = raw.connectionType as PropertyFilters['connectionType'];
  }
  if (typeof raw.latestQuoteStatus === 'string' && raw.latestQuoteStatus !== 'all') {
    result.quoteStatus = raw.latestQuoteStatus as PropertyFilters['quoteStatus'];
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

        {property.latestQuoteId && (
          <MenuItem
            onClick={() => {
              handleClose();
              void router.push(buildRoute(ROUTES.QUOTES.DETAIL, { id: property.latestQuoteId }));
            }}
          >
            <ListItemIcon>
              <VisibilityIcon fontSize="small" />
            </ListItemIcon>
            View Quote
          </MenuItem>
        )}

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
  creatorOptions: { value: string; label: string }[];
}

function buildColumns({
  onMarkAsLost,
  creatorOptions,
}: BuildColumnsArgs): ColumnConfig<PropertyRow>[] {
  return [
    {
      field: 'propertyCode',
      headerName: 'Property',
      sortable: true,
      flex: 3,
      cellSx: { whiteSpace: 'normal', verticalAlign: 'top', py: 1 },
      renderCell: ({ row }) => {
        const address = (row.address as string | undefined) ?? '';
        const tooltipText = address || '-';

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

            {/* Address (up to 2 lines) */}
            <Tooltip
              title={<span style={{ whiteSpace: 'pre-line' }}>{tooltipText}</span>}
              placement="bottom-start"
              enterDelay={500}
            >
              <Box sx={{ mt: 0.25, minWidth: 0 }}>
                {address ? (
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
                ) : (
                  <MUITypography variant="placeholder">-</MUITypography>
                )}
              </Box>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      field: 'customerName',
      headerName: 'Customer',
      flex: 2.5,
      renderCell: ({ row }) => {
        const name = row.customerName as string | undefined;
        const phone = row.customerPhone as string | undefined;
        const email = row.customerEmail as string | undefined;
        if (!name) return <MUITypography variant="placeholder">-</MUITypography>;
        const whatsappNumber = phone ? formatPhoneForWhatsApp(phone) : '';

        return (
          <Box>
            <MuiLink
              component={NextLink}
              href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: row.customerId })}
              underline="none"
              color="inherit"
              sx={{
                fontWeight: 500,
                display: 'block',
                '&:hover': { color: 'primary.main' },
              }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {name}
            </MuiLink>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
              {email && (
                <MUITypography variant="timestamp" noWrap sx={{ maxWidth: 150 }}>
                  {email}
                </MUITypography>
              )}
              {phone && (
                <>
                  {email && <MUITypography variant="timestamp">·</MUITypography>}
                  <MUITypography variant="timestamp">{phone}</MUITypography>
                  <Tooltip title="Call">
                    <IconButton
                      size="small"
                      component="a"
                      href={`tel:${phone}`}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      sx={{ p: 0.25 }}
                    >
                      <PhoneIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="WhatsApp">
                    <IconButton
                      size="small"
                      component="a"
                      href={`https://wa.me/${whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      sx={{ p: 0.25 }}
                    >
                      <WhatsAppIcon style={{ fontSize: 12, color: '#25D366' }} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Stack>
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
        const quoteId = row.latestQuoteId as string | undefined;
        if (!status) return <MUITypography variant="placeholder">None</MUITypography>;

        const chip = <MUIStatusChip label={toTitleLabel(status)} colorSeed={status} />;

        if (quoteId) {
          return (
            <MuiLink
              component={NextLink}
              href={buildRoute(ROUTES.QUOTES.DETAIL, { id: quoteId })}
              underline="none"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              sx={{ display: 'inline-flex' }}
            >
              {chip}
            </MuiLink>
          );
        }
        return chip;
      },
    },
    {
      field: 'connectionType',
      headerName: 'Discom / Load',
      filterable: true,
      filterType: 'select',
      filterOptions: CONNECTION_TYPE_OPTIONS,
      flex: 2,
      renderCell: ({ row }) => {
        const discom = row.discomName as string | undefined;
        const load = row.sanctionedLoad !== undefined ? Number(row.sanctionedLoad) : undefined;
        const connection = row.connectionType as string | undefined;

        if (!discom && load === undefined && !connection) {
          return <MUITypography variant="placeholder">-</MUITypography>;
        }

        const subtitleParts: string[] = [];
        if (load !== undefined) subtitleParts.push(`${load.toFixed(2)} kW`);
        if (connection) subtitleParts.push(toTitleLabel(connection));

        return (
          <Box>
            <MUITypography variant="body" noWrap sx={{ fontWeight: 500 }}>
              {discom ?? '-'}
            </MUITypography>
            {subtitleParts.length > 0 && (
              <MUITypography variant="timestamp" sx={{ mt: 0.25 }}>
                {subtitleParts.join(' · ')}
              </MUITypography>
            )}
          </Box>
        );
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
      field: 'createdBy',
      headerName: 'Created By',
      filterable: true,
      filterType: 'select',
      flex: 1,
      renderFilter: ({ value, onChange }) => {
        const selectedOption =
          creatorOptions.find((o) => String(o.value) === String(value)) || null;
        return (
          <Autocomplete
            size="small"
            fullWidth
            options={creatorOptions}
            value={selectedOption}
            disablePortal
            getOptionLabel={(option) => (typeof option === 'string' ? option : option.label || '')}
            isOptionEqualToValue={(option, val) => option.value === val?.value}
            onChange={(_, val) => {
              onChange(val?.value ?? '');
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search creator..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                  },
                }}
              />
            )}
          />
        );
      },
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

  const { data: employees = [] } = useEmployees();

  const creatorOptions = useMemo(() => {
    const baseOptions = employees.map((emp) => {
      const name = `${emp.user?.firstName ?? ''} ${emp.user?.lastName ?? ''}`.trim();
      return {
        value: emp.userId,
        label: name || emp.user?.email || 'Unknown Employee',
      };
    });
    const list = [{ label: 'Current User (Me)', value: 'me' }, ...baseOptions];
    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [employees]);

  const columns = useMemo(
    (): ColumnConfig<PropertyRow>[] =>
      buildColumns({
        onMarkAsLost: handleMarkAsLost,
        creatorOptions,
      }),
    [handleMarkAsLost, creatorOptions],
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
