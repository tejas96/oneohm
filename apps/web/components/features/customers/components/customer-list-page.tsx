'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Autocomplete,
  Box,
  Button,
  Divider,
  IconButton,
  Link as MuiLink,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  ConnectionType,
  CustomerSortField,
  CustomerStatus,
  LeadSource,
  SortOrder,
} from '@tejas96/shared/types';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type JSX, useCallback, useMemo, useRef, useState } from 'react';

import { CustomerPropertiesExpandedRow } from './customer-properties-expanded-row';
import {
  Customer as CustomerBase,
  type CustomerFilters,
  useCustomers,
  useCustomerGroups,
  useDeleteCustomer,
} from '../hooks/use-customers';

import { useEmployees } from '@/components/features/employees';
import {
  LEAD_TEMPERATURE_OPTIONS,
  PROPERTY_STATUS_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  QUOTE_STATUS_OPTIONS,
} from '@/components/features/properties/constants';
import {
  formatDeleteBlockTooltip,
  getCustomerDeleteBlockReasons,
  ORG_ADMIN_ROLES,
} from '@/components/features/properties/utils/delete-eligibility';
import {
  AdvancedTable,
  type BulkAction,
  type ColumnConfig,
} from '@/components/shared/advanced-table';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { MUIStatusChip } from '@/components/ui/mui-status-chip';
import { MUITypography } from '@/components/ui/mui-typography';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { type TableUrlFilterRecord, useTableUrlState } from '@/lib/hooks';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import { getErrorMessage, toTitleLabel } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

// AdvancedTable requires TRow extends Record<string, unknown>.
// Customer has explicit typed fields, so we widen it here for table usage only.
type Customer = CustomerBase & Record<string, unknown>;
const EMPTY_CUSTOMER_ROWS: Customer[] = [];

const LEAD_SOURCE_OPTIONS = Object.values(LeadSource).map((value) => ({
  value,
  label: toTitleLabel(value),
}));

const STATUS_OPTIONS = Object.values(CustomerStatus).map((value) => ({
  value,
  label: toTitleLabel(value),
}));

const CONNECTION_TYPE_OPTIONS = Object.values(ConnectionType).map((value) => ({
  value,
  label: toTitleLabel(value),
}));

// ============================================================================
// Adapter functions — pure, module-level, no React deps
// ============================================================================

const SORT_FIELD_MAP: Record<string, CustomerSortField> = {
  name: CustomerSortField.FIRST_NAME,
  city: CustomerSortField.CITY,
  createdAt: CustomerSortField.CREATED_AT,
};

function toApiSortField(
  model: { field: string; direction: 'asc' | 'desc' } | null,
): CustomerSortField {
  if (!model) return CustomerSortField.CREATED_AT;
  return SORT_FIELD_MAP[model.field] ?? CustomerSortField.CREATED_AT;
}

function toApiSortOrder(model: { field: string; direction: 'asc' | 'desc' } | null): SortOrder {
  return model?.direction === 'asc' ? SortOrder.ASC : SortOrder.DESC;
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

function toCustomerFilters(filters: TableUrlFilterRecord): Partial<CustomerFilters> {
  const raw = filters as Record<string, unknown>;
  const createdAtLocalDate =
    typeof filters.createdAt === 'string' ? toLocalDateString(filters.createdAt) : undefined;
  const createdAtUtcRange = createdAtLocalDate
    ? localDateToUtcDayRange(createdAtLocalDate)
    : undefined;

  const sizeRange = raw.latestQuoteSystemSizeKw as { min?: string; max?: string } | undefined;
  let propertySystemSizeMin: number | undefined;
  let propertySystemSizeMax: number | undefined;
  if (sizeRange?.min !== undefined && sizeRange.min !== '') {
    const n = Number(sizeRange.min);
    if (!Number.isNaN(n)) propertySystemSizeMin = n;
  }
  if (sizeRange?.max !== undefined && sizeRange.max !== '') {
    const n = Number(sizeRange.max);
    if (!Number.isNaN(n)) propertySystemSizeMax = n;
  }

  return {
    status:
      typeof filters.status === 'string' && filters.status
        ? (filters.status as CustomerStatus)
        : undefined,
    leadSource:
      typeof filters.leadSource === 'string' && filters.leadSource
        ? (filters.leadSource as LeadSource)
        : undefined,
    groupSearch:
      typeof filters.groupSearch === 'string' && filters.groupSearch
        ? filters.groupSearch
        : undefined,
    fromDate:
      typeof filters.fromDate === 'string' && filters.fromDate
        ? filters.fromDate
        : createdAtUtcRange?.fromIso,
    toDate:
      typeof filters.toDate === 'string' && filters.toDate
        ? filters.toDate
        : createdAtUtcRange?.toIso,
    city: typeof filters.city === 'string' && filters.city ? filters.city : undefined,
    hasProperty:
      filters.hasProperty === 'true' || filters.hasProperty === true
        ? true
        : filters.hasProperty === 'false' || filters.hasProperty === false
          ? false
          : // legacy: has-property filter was previously stored on the name field
            filters.name === 'true' || filters.name === true
            ? true
            : filters.name === 'false' || filters.name === false
              ? false
              : undefined,
    createdBy:
      typeof filters.createdBy === 'string' && filters.createdBy ? filters.createdBy : undefined,
    assigneeId:
      typeof filters.assigneeId === 'string' && filters.assigneeId ? filters.assigneeId : undefined,
    propertyType:
      typeof raw.propertyType === 'string' && raw.propertyType && raw.propertyType !== 'all'
        ? (raw.propertyType as CustomerFilters['propertyType'])
        : undefined,
    propertyStatus:
      typeof raw.propertyStatus === 'string' && raw.propertyStatus && raw.propertyStatus !== 'all'
        ? (raw.propertyStatus as CustomerFilters['propertyStatus'])
        : undefined,
    connectionType:
      typeof raw.connectionType === 'string' && raw.connectionType && raw.connectionType !== 'all'
        ? (raw.connectionType as CustomerFilters['connectionType'])
        : undefined,
    leadTemperature:
      typeof raw.leadTemperature === 'string' &&
      raw.leadTemperature &&
      raw.leadTemperature !== 'all'
        ? (raw.leadTemperature as CustomerFilters['leadTemperature'])
        : undefined,
    quoteStatus:
      typeof raw.quoteStatus === 'string' && raw.quoteStatus && raw.quoteStatus !== 'all'
        ? (raw.quoteStatus as CustomerFilters['quoteStatus'])
        : typeof raw.latestQuoteStatus === 'string' &&
            raw.latestQuoteStatus &&
            raw.latestQuoteStatus !== 'all'
          ? (raw.latestQuoteStatus as CustomerFilters['quoteStatus'])
          : undefined,
    propertySystemSizeMin,
    propertySystemSizeMax,
    propertyCity:
      typeof raw.propertyCity === 'string' && raw.propertyCity ? raw.propertyCity : undefined,
    propertyState:
      typeof raw.propertyState === 'string' && raw.propertyState ? raw.propertyState : undefined,
  };
}

const PROPERTY_LEVEL_FILTER_FIELDS = [
  'propertyType',
  'propertyStatus',
  'connectionType',
  'quoteStatus',
  'leadTemperature',
  'latestQuoteSystemSizeKw',
  'propertyCity',
  'propertyState',
] as const;

function hasActivePropertyLevelFilter(filters: TableUrlFilterRecord): boolean {
  const raw = filters as Record<string, unknown>;
  return PROPERTY_LEVEL_FILTER_FIELDS.some((field) => {
    const value = raw[field];
    if (value === '' || value == null) return false;
    if (field === 'latestQuoteSystemSizeKw' && typeof value === 'object') {
      const range = value as { min?: string | number; max?: string | number };
      return (
        (range.min !== undefined && range.min !== '') ||
        (range.max !== undefined && range.max !== '')
      );
    }
    return value !== 'all';
  });
}

function isHasPropertyFalse(filters: TableUrlFilterRecord): boolean {
  return (
    filters.hasProperty === 'false' ||
    filters.hasProperty === false ||
    filters.name === 'false' ||
    filters.name === false
  );
}

function normalizeCustomerFilterState(filters: TableUrlFilterRecord): TableUrlFilterRecord {
  const next = { ...filters };
  const legacyHasProperty =
    next.name === 'true' || next.name === true
      ? 'true'
      : next.name === 'false' || next.name === false
        ? 'false'
        : undefined;

  if (legacyHasProperty && next.hasProperty == null) {
    next.hasProperty = legacyHasProperty;
  }
  if (next.name === 'true' || next.name === 'false' || next.name === true || next.name === false) {
    delete next.name;
  }
  return next;
}

function reconcileContradictoryCustomerFilters(
  filters: TableUrlFilterRecord,
  changedField?: string,
): TableUrlFilterRecord {
  const next = normalizeCustomerFilterState(filters);
  // Only reconcile interactive changes; URL/deep-link loads keep both and backend returns 0.
  if (changedField == null) {
    return next;
  }
  if (!isHasPropertyFalse(next) || !hasActivePropertyLevelFilter(next)) {
    return next;
  }

  if (changedField === 'hasProperty') {
    for (const field of PROPERTY_LEVEL_FILTER_FIELDS) {
      delete next[field];
    }
    return next;
  }

  delete next.hasProperty;
  return next;
}

// ============================================================================
// Row Actions Menu (private sub-component)
// ============================================================================

function RowActionsMenu({
  customer,
  showDelete = false,
  onRequestDelete,
}: {
  customer: Customer;
  showDelete?: boolean;
  onRequestDelete?: (customer: Customer) => void;
}): JSX.Element {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleClose = (): void => setAnchorEl(null);
  const deleteReasons = getCustomerDeleteBlockReasons(customer);
  const deleteDisabled = deleteReasons.length > 0;
  const deleteTooltip = formatDeleteBlockTooltip(deleteReasons);

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
            void router.push(buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: customer.id }));
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
            void router.push(buildRoute(ROUTES.CUSTOMERS.EDIT, { id: customer.id }));
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit Customer
        </MenuItem>

        <MenuItem
          onClick={() => {
            handleClose();
            void router.push(buildRoute(ROUTES.CUSTOMERS.ADD_PROPERTY, { id: customer.id }));
          }}
        >
          <ListItemIcon>
            <PersonAddIcon fontSize="small" />
          </ListItemIcon>
          Add Property
        </MenuItem>

        <Divider />

        {showDelete ? (
          <Tooltip title={deleteTooltip ?? ''}>
            <span>
              <MenuItem
                disabled={deleteDisabled}
                onClick={() => {
                  if (deleteDisabled) return;
                  handleClose();
                  onRequestDelete?.(customer);
                }}
                sx={{ color: 'error.main' }}
              >
                <ListItemIcon>
                  <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
                </ListItemIcon>
                Delete Customer
              </MenuItem>
            </span>
          </Tooltip>
        ) : null}
      </Menu>
    </>
  );
}

// ============================================================================
// Bulk actions (module-level constant — never recreated on render)
// ============================================================================

const BULK_ACTIONS: BulkAction<Customer>[] = [
  {
    label: 'Export Selected',
    onClick: (_rows) => {
      // placeholder — export API pending
    },
  },
  {
    label: 'Delete',
    color: 'error',
    disabled: true,
    disabledTooltip: 'Bulk delete is not yet available',
    onClick: () => undefined,
  },
];

// ============================================================================
// Column definitions
// ============================================================================

const COLUMNS: ColumnConfig<Customer>[] = [
  {
    field: 'name',
    headerName: 'Customer',
    sortable: true,
    flex: 3,
    renderCell: ({ row }) => {
      const fullName = `${row.firstName} ${row.lastName ?? ''}`.trim();
      return (
        <MuiLink
          component={NextLink}
          href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: row.id })}
          prefetch={false}
          underline="none"
          color="inherit"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            '&:hover': { color: 'primary.main' },
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <MUIAvatar name={fullName} size="md" sx={{ flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <MUITypography variant="bodyPrimary" noWrap sx={{ fontWeight: 500 }}>
              {fullName}
            </MUITypography>
            {row.groupCode && (
              <MUIStatusChip
                label={
                  row.groupName ? `${row.groupName} (${row.groupCode})` : (row.groupCode as string)
                }
                color="info"
                sx={{ mt: 0.25 }}
              />
            )}
          </Box>
        </MuiLink>
      );
    },
  },
  {
    field: 'contact',
    headerName: 'Contact',
    flex: 2,
    renderCell: ({ row }) => {
      const phone = (row.phone as string | undefined) || (row.alternatePhone as string | undefined);
      if (!phone) return <MUITypography variant="placeholder">-</MUITypography>;
      return <MUITypography variant="body">{phone}</MUITypography>;
    },
  },
  {
    field: 'city',
    headerName: 'City',
    sortable: true,
    filterable: true,
    filterType: 'text',
    filterDebounceMs: 400,
    flex: 1.2,
    renderCell: ({ row }) => {
      const city = row.city as string | undefined;
      const pincode = row.pincode as string | undefined;

      if (!city && !pincode) {
        return <MUITypography variant="placeholder">-</MUITypography>;
      }

      if (!city && pincode) {
        return <MUITypography variant="body">PIN: {pincode}</MUITypography>;
      }

      return (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <MUITypography variant="body">{city}</MUITypography>
          {pincode && (
            <MUITypography variant="timestamp" sx={{ mt: 0.25 }}>
              {pincode}
            </MUITypography>
          )}
        </Box>
      );
    },
  },
  {
    field: 'leadSource',
    headerName: 'Lead Source',
    filterable: true,
    filterType: 'select',
    filterOptions: LEAD_SOURCE_OPTIONS,
    flex: 1.5,
    renderCell: ({ row }) => {
      const rawSrc = row.leadSource as string | undefined;
      if (!rawSrc) return <MUITypography variant="placeholder">-</MUITypography>;
      return <MUIStatusChip label={toTitleLabel(rawSrc)} colorSeed={rawSrc} />;
    },
  },
  {
    field: 'status',
    headerName: 'Status',
    filterable: true,
    filterType: 'select',
    filterOptions: STATUS_OPTIONS,
    flex: 1,
    renderCell: ({ row }) => {
      const rawStatus = row.status as string | undefined;
      if (!rawStatus) return <MUITypography variant="placeholder">-</MUITypography>;
      return (
        <MUIStatusChip label={toTitleLabel(rawStatus)} colorSeed={rawStatus} variant="filled" />
      );
    },
  },
  {
    // pseudo-column for group search filter — hidden from table display
    field: 'groupSearch',
    headerName: 'Group',
    filterable: true,
    filterType: 'select',
    defaultHidden: true,
    hideable: false,
  },
  {
    field: 'hasProperty',
    headerName: 'Has property',
    filterable: true,
    filterType: 'select',
    filterOptions: [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' },
    ],
    defaultHidden: true,
    hideable: false,
  },
  {
    field: 'propertyType',
    headerName: 'Property Type',
    filterable: true,
    filterType: 'select',
    filterOptions: PROPERTY_TYPE_OPTIONS,
    defaultHidden: true,
    hideable: false,
  },
  {
    field: 'propertyStatus',
    headerName: 'Property Status',
    filterable: true,
    filterType: 'select',
    filterOptions: PROPERTY_STATUS_OPTIONS,
    defaultHidden: true,
    hideable: false,
  },
  {
    field: 'connectionType',
    headerName: 'Connection Type',
    filterable: true,
    filterType: 'select',
    filterOptions: CONNECTION_TYPE_OPTIONS,
    defaultHidden: true,
    hideable: false,
  },
  {
    field: 'quoteStatus',
    headerName: 'Quote Status',
    filterable: true,
    filterType: 'select',
    filterOptions: QUOTE_STATUS_OPTIONS,
    defaultHidden: true,
    hideable: false,
  },
  {
    field: 'leadTemperature',
    headerName: 'Lead Temperature',
    filterable: true,
    filterType: 'select',
    filterOptions: LEAD_TEMPERATURE_OPTIONS,
    defaultHidden: true,
    hideable: false,
  },
  {
    field: 'latestQuoteSystemSizeKw',
    headerName: 'System Size (kW)',
    filterable: true,
    filterType: 'range',
    defaultHidden: true,
    hideable: false,
  },
  {
    field: 'propertyCity',
    headerName: 'Property City',
    filterable: true,
    filterType: 'text',
    filterDebounceMs: 400,
    defaultHidden: true,
    hideable: false,
  },
  {
    field: 'propertyState',
    headerName: 'Property State',
    filterable: true,
    filterType: 'text',
    filterDebounceMs: 400,
    defaultHidden: true,
    hideable: false,
  },
  {
    field: 'createdAt',
    headerName: 'Onboarded',
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
    flex: 1,
    renderCell: ({ row }) => {
      const name = (row.creatorName as string | undefined) ?? '';
      if (!name) return <MUITypography variant="placeholder">-</MUITypography>;
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MUIAvatar name={name} size="sm" sx={{ flexShrink: 0 }} />
          <MUITypography
            variant="body"
            noWrap
            color={name === 'Self' ? 'primary.main' : undefined}
            sx={name === 'Self' ? { fontWeight: 600 } : undefined}
          >
            {name}
          </MUITypography>
        </Box>
      );
    },
  },
  {
    field: 'assigneeId',
    headerName: 'Assigned To',
    filterable: true,
    flex: 1,
    renderCell: ({ row }) => {
      const name = (row.assigneeName as string | undefined) ?? '';
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
    actions: (row) => (
      <RowActionsMenu customer={row} showDelete={false} onRequestDelete={undefined} />
    ),
  },
];

// ============================================================================
// Main component
// ============================================================================

export function CustomerListPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasAnyRole } = useAuth();
  const isOrgAdmin = hasAnyRole([...ORG_ADMIN_ROLES]);
  const deleteCustomerMutation = useDeleteCustomer();
  const deleteConfirmation = useDeleteConfirmation<Customer>({
    mutation: deleteCustomerMutation,
    getId: (customer) => customer.id,
  });

  const rawLeadTemperature = searchParams.get('leadTemperature');
  const initialFilters = useMemo(() => {
    if (!rawLeadTemperature || rawLeadTemperature === 'all') return undefined;
    return normalizeCustomerFilterState({ leadTemperature: rawLeadTemperature });
  }, [rawLeadTemperature]);

  // URL-synced table state — single source of truth for all pagination/sort/filter/search
  const urlState = useTableUrlState({ prefix: 'customers', defaultPageSize: 10, initialFilters });

  const filtersRef = useRef(urlState.state.filters);
  filtersRef.current = urlState.state.filters;

  const handleFilterChange = useCallback(
    (nextFilters: TableUrlFilterRecord) => {
      const normalizedNext = normalizeCustomerFilterState(nextFilters);
      const prevFilters = filtersRef.current;
      const changedField = Object.keys({ ...prevFilters, ...normalizedNext }).find(
        (field) => prevFilters[field] !== normalizedNext[field],
      );
      urlState.setFilters(reconcileContradictoryCustomerFilters(normalizedNext, changedField));
    },
    [urlState.setFilters],
  );

  // Fetch active employees
  const { data: employees = [] } = useEmployees();

  // Fetch customer groups
  const { data: groups = [] } = useCustomerGroups();

  // Memoize sorted base employee options
  const baseEmployeeOptions = useMemo(() => {
    const list = employees.map((emp) => {
      const name = `${emp.user?.firstName ?? ''} ${emp.user?.lastName ?? ''}`.trim();
      return {
        label: name || emp.user?.email || 'Unknown Employee',
        value: emp.userId,
      };
    });
    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [employees]);

  // Options for 'Created By' filter (includes 'Self-Registered')
  const creatorOptions = useMemo(
    () => [
      { label: 'Current User (Me)', value: 'me' },
      { label: 'Self-Registered', value: 'self' },
      ...baseEmployeeOptions,
    ],
    [baseEmployeeOptions],
  );

  // Options for 'Assigned To' filter (excludes 'Self-Registered')
  const assigneeOptions = useMemo(
    () => [{ label: 'Current User (Me)', value: 'me' }, ...baseEmployeeOptions],
    [baseEmployeeOptions],
  );

  // Memoize customer group options
  const groupOptions = useMemo(() => {
    return groups.map((g) => ({
      label: g.groupName ? `${g.groupName} (${g.groupCode})` : g.groupCode,
      value: g.groupCode,
    }));
  }, [groups]);

  // Memoize columns to include dynamic filter options
  const columns = useMemo(() => {
    return COLUMNS.map((col) => {
      if (col.field === 'actions') {
        return {
          ...col,
          actions: (row: Customer) => (
            <RowActionsMenu
              customer={row}
              showDelete={isOrgAdmin}
              onRequestDelete={deleteConfirmation.requestDelete}
            />
          ),
        };
      }
      if (col.field === 'groupSearch') {
        return {
          ...col,
          filterOptions: groupOptions,
          renderFilter: ({
            value,
            onChange,
          }: {
            value: unknown;
            onChange: (v: unknown) => void;
          }) => {
            const selectedOption =
              groupOptions.find((o) => String(o.value) === String(value)) || null;
            return (
              <Autocomplete
                size="small"
                fullWidth
                options={groupOptions}
                value={selectedOption}
                disablePortal
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : option.label || ''
                }
                isOptionEqualToValue={(option, val) => option.value === val?.value}
                onChange={(_, val) => {
                  onChange(val?.value ?? '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search group..."
                    sx={{
                      '& .MuiOutlinedInput-root': {},
                    }}
                  />
                )}
              />
            );
          },
        };
      }
      if (col.field === 'createdBy') {
        return {
          ...col,
          renderFilter: ({
            value,
            onChange,
          }: {
            value: unknown;
            onChange: (v: unknown) => void;
          }) => {
            const selectedOption =
              creatorOptions.find((o) => String(o.value) === String(value)) || null;
            return (
              <Autocomplete
                size="small"
                fullWidth
                options={creatorOptions}
                value={selectedOption}
                disablePortal
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : option.label || ''
                }
                isOptionEqualToValue={(option, val) => option.value === val?.value}
                onChange={(_, val) => {
                  onChange(val?.value ?? '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search creator..."
                    sx={{
                      '& .MuiOutlinedInput-root': {},
                    }}
                  />
                )}
              />
            );
          },
        };
      }
      if (col.field === 'assigneeId') {
        return {
          ...col,
          renderFilter: ({
            value,
            onChange,
          }: {
            value: unknown;
            onChange: (v: unknown) => void;
          }) => {
            const selectedOption =
              assigneeOptions.find((o) => String(o.value) === String(value)) || null;
            return (
              <Autocomplete
                size="small"
                fullWidth
                options={assigneeOptions}
                value={selectedOption}
                disablePortal
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : option.label || ''
                }
                isOptionEqualToValue={(option, val) => option.value === val?.value}
                onChange={(_, val) => {
                  onChange(val?.value ?? '');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search assignee..."
                    sx={{
                      '& .MuiOutlinedInput-root': {},
                    }}
                  />
                )}
              />
            );
          },
        };
      }
      return col;
    });
  }, [creatorOptions, assigneeOptions, groupOptions, isOrgAdmin, deleteConfirmation.requestDelete]);

  const renderEmptyState = useCallback(
    (hasActiveFilters: boolean): JSX.Element =>
      hasActiveFilters ? (
        <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <MUITypography variant="body">No customers match your search and filters.</MUITypography>
          <Button size="small" variant="outlined" onClick={urlState.resetAll}>
            Clear all filters
          </Button>
        </Box>
      ) : (
        <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <MUITypography variant="body">
            No customers yet. Get started by adding your first customer.
          </MUITypography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              void router.push(ROUTES.CUSTOMERS.NEW);
            }}
          >
            Add Customer
          </Button>
        </Box>
      ),
    [router, urlState.resetAll],
  );

  // Server-side data fetch — driven entirely by URL state
  const {
    data: customerData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useCustomers({
    page: urlState.state.page + 1,
    limit: urlState.state.pageSize,
    search: urlState.state.search || undefined,
    sortBy: toApiSortField(urlState.state.sortModel),
    sortOrder: toApiSortOrder(urlState.state.sortModel),
    ...toCustomerFilters(urlState.state.filters),
  });

  const tableRows = useMemo<Customer[]>(
    () => (customerData?.data as Customer[] | undefined) ?? EMPTY_CUSTOMER_ROWS,
    [customerData?.data],
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
            All Customers
          </MUITypography>
          <MUITypography variant="body" sx={{ mt: 0.25 }}>
            Manage your customers and track their journey
          </MUITypography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              void router.push(ROUTES.CUSTOMERS.NEW);
            }}
          >
            Add Customer
          </Button>
        </Stack>
      </Box>

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
          <ErrorOutlineIcon color="error" />
          <Box sx={{ flex: 1 }}>
            <MUITypography variant="alertTitle" sx={{ color: 'error.main' }}>
              Failed to load customers
            </MUITypography>
            <MUITypography variant="finePrint">{getErrorMessage(error)}</MUITypography>
          </Box>
          <Button variant="outlined" color="error" size="small" onClick={() => void refetch()}>
            Retry
          </Button>
        </Box>
      )}

      {/* ── Table ── */}
      <AdvancedTable<Customer>
        key="customers-table"
        columns={columns}
        rows={tableRows}
        rowIdField="id"
        paginationMode="server"
        loading={isLoading}
        refetching={isFetching && !isLoading}
        page={urlState.state.page}
        pageSize={urlState.state.pageSize}
        totalRowCount={customerData?.meta.total ?? 0}
        sortModel={urlState.state.sortModel}
        filterModel={urlState.state.filters}
        onPageChange={urlState.setPage}
        onPageSizeChange={urlState.setPageSize}
        onSortChange={urlState.setSortModel}
        onFilterChange={handleFilterChange}
        onSearchChange={urlState.setSearch}
        onRowClick={(row) => {
          void router.push(buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: row.id }));
        }}
        enableRowSelection
        bulkActions={BULK_ACTIONS}
        enableSearch
        enableFilters
        enablePagination
        enableColumnVisibility
        searchPlaceholder="Search by name, phone, email, city..."
        itemLabel="customers"
        renderExpandedRow={(row) => <CustomerPropertiesExpandedRow customerId={row.id} />}
        renderEmptyState={renderEmptyState}
      />

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        title="Delete Customer"
        itemName={
          [deleteConfirmation.target?.firstName, deleteConfirmation.target?.lastName]
            .filter(Boolean)
            .join(' ') || 'this customer'
        }
        isPending={deleteConfirmation.isPending}
        onCancel={deleteConfirmation.cancel}
        onConfirm={() => void deleteConfirmation.confirm()}
      />
    </Box>
  );
}
