'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Box,
  Button,
  Divider,
  IconButton,
  Link as MuiLink,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
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

import { CustomerKpiCards } from './customer-kpi-cards';
import { CustomerPropertiesExpandedRow } from './customer-properties-expanded-row';
import { ImportCustomersModal } from './import-customers-modal';
import {
  CUSTOMER_STATUS_TONE,
  LEAD_SOURCE_TONE,
  PROPERTY_STATUS_BAR_ORDER,
  PROPERTY_STATUS_TONE,
} from '../constants';
import {
  Customer as CustomerBase,
  type CustomerFilters,
  useCustomerGroups,
  useCustomerOverviewStats,
  useCustomers,
  useCustomerStats,
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
import { ActiveTicketsChip } from '@/components/features/service-tickets';
import { FilterAutocomplete, type ColumnConfig } from '@/components/shared/advanced-table';
import {
  CRM_TONE_FILL,
  CrmStatusPill,
  CrmTable,
  type CrmBulkAction,
  type CrmColumn,
  type CrmQuickFilter,
} from '@/components/shared/crm-table';
import { DeleteConfirmationDialog } from '@/components/shared/delete-confirmation-dialog';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { type TableUrlFilterRecord, useTableUrlState } from '@/lib/hooks';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import { useGatedAction } from '@/lib/rbac';
import { color, crm, radius } from '@/lib/theme/tokens';
import { formatCurrency, getErrorMessage, toTitleLabel } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

// CrmTable is generic over TRow with no Record constraint, but the filter
// helpers below index arbitrary fields, so the row type is widened here.
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
//
// UNCHANGED from the pre-v2 list. The table beneath them was replaced; the
// contract between URL filter state and the customers API was not, so the same
// deep links, saved URLs and backend semantics keep working.
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
    hasActiveTickets:
      filters.hasActiveTickets === 'true' || filters.hasActiveTickets === true ? true : undefined,
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
    propertyConsumerNumber:
      typeof raw.propertyConsumerNumber === 'string' && raw.propertyConsumerNumber
        ? raw.propertyConsumerNumber
        : undefined,
    needsFollowup:
      filters.needsFollowup === 'true' || filters.needsFollowup === true ? true : undefined,
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
  'propertyConsumerNumber',
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
  const deleteCustomer = useGatedAction(
    'customers.delete',
    () => onRequestDelete?.(customer),
    'Delete customer',
  );
  const deleteTooltip = formatDeleteBlockTooltip(deleteReasons);
  const editCustomer = useGatedAction(
    'customers.edit',
    () => {
      handleClose();
      void router.push(buildRoute(ROUTES.CUSTOMERS.EDIT, { id: customer.id }));
    },
    'Edit customer',
  );
  // Same route as the "new customer" wizard, so its own gate cannot tell this
  // apart — see the note on the other "Add site" buttons.
  const addProperty = useGatedAction(
    'properties.create',
    () => {
      handleClose();
      void router.push(buildRoute(ROUTES.ONBOARDING.NEW, undefined, { customerId: customer.id }));
    },
    'Add property',
  );

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}
        aria-label="Row actions"
        sx={{ width: crm['row-action-size'], height: crm['row-action-size'] }}
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
          onClick={editCustomer.onGatedClick}
          aria-disabled={!editCustomer.allowed}
          sx={{ opacity: editCustomer.allowed ? 1 : 0.5 }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit Customer
        </MenuItem>

        <MenuItem
          onClick={addProperty.onGatedClick}
          aria-disabled={!addProperty.allowed}
          sx={{ opacity: addProperty.allowed ? 1 : 0.5 }}
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
                  deleteCustomer.onGatedClick();
                }}
                aria-disabled={!deleteCustomer.allowed}
                sx={{ color: 'error.main', ...(deleteCustomer.allowed ? {} : { opacity: 0.5 }) }}
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
// Cell renderers
// ============================================================================

const ellipsisSx = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;

function CustomerCell({ row }: { row: Customer }): JSX.Element {
  const fullName = `${row.firstName} ${row.lastName ?? ''}`.trim();
  const groupLabel = row.groupCode
    ? row.groupName
      ? `${row.groupName} (${row.groupCode})`
      : row.groupCode
    : null;

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
        gap: 1.25,
        minWidth: 0,
        pr: 1.5,
        '&:hover .crm-customer-name': { color: color['accent-ink'] },
      }}
    >
      <MUIAvatar
        name={fullName}
        size={Number.parseInt(crm['avatar-size'], 10)}
        sx={{ flexShrink: 0 }}
      />
      <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <Box
          className="crm-customer-name"
          sx={{
            fontSize: crm['text-row-title'],
            fontWeight: 700,
            letterSpacing: '-0.01em',
            transition: 'color var(--dur-micro) var(--ease-standard)',
            ...ellipsisSx,
          }}
        >
          {fullName}
        </Box>
        {groupLabel ? (
          <Box
            component="span"
            title={groupLabel}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              alignSelf: 'flex-start',
              maxWidth: crm['group-chip-max-width'],
              height: crm['group-chip-height'],
              px: 1,
              borderRadius: radius.pill,
              backgroundColor: color['info-bg'],
              color: color.info,
              fontSize: crm['text-row-2xs'],
              fontWeight: 500,
              ...ellipsisSx,
            }}
          >
            {groupLabel}
          </Box>
        ) : null}
        <ActiveTicketsChip count={row.activeTicketCount} />
      </Box>
    </MuiLink>
  );
}

function ContactCell({ row }: { row: Customer }): JSX.Element {
  const phone = (row.phone as string | undefined) || row.alternatePhone;

  if (!phone) {
    return (
      <Box component="span" sx={{ fontSize: crm['text-row'], color: color['text-tertiary'] }}>
        —
      </Box>
    );
  }

  // wa.me wants a bare country-code + number. Indian numbers are stored E.164
  // or loosely formatted, so strip to digits and keep the trailing 10.
  const waHref = `https://wa.me/91${phone.replace(/\D/g, '').slice(-10)}`;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Box
        component="span"
        sx={{
          fontFamily: 'var(--font-mono)',
          fontSize: crm['text-row'],
          color: color['text-secondary'],
          fontVariantNumeric: 'tabular-nums',
          ...ellipsisSx,
        }}
      >
        {phone}
      </Box>
      <MuiLink
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        title="Message on WhatsApp"
        aria-label="Message on WhatsApp"
        sx={{
          display: 'inline-flex',
          flexShrink: 0,
          width: crm['whatsapp-size'],
          height: crm['whatsapp-size'],
          borderRadius: '50%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color['accent-subtle'],
          color: color['accent-ink'],
        }}
      >
        <WhatsAppIcon style={{ width: 13, height: 13 }} />
      </MuiLink>
    </Box>
  );
}

function LocationCell({ row }: { row: Customer }): JSX.Element {
  const { city, pincode } = row;

  if (!city && !pincode) {
    return (
      <Box component="span" sx={{ fontSize: crm['text-row'], color: color['text-tertiary'] }}>
        —
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
      <Box
        component="span"
        sx={{ fontSize: crm['text-row'], color: color['text-secondary'], ...ellipsisSx }}
      >
        {city ?? '—'}
      </Box>
      {pincode ? (
        <Box
          component="span"
          sx={{
            fontFamily: 'var(--font-mono)',
            fontSize: crm['text-row-2xs'],
            color: color['text-tertiary'],
          }}
        >
          {pincode}
        </Box>
      ) : null}
    </Box>
  );
}

/**
 * The site-portfolio summary: count · capacity, a status distribution bar, and
 * what the sites are worth.
 *
 * That last figure used to read "₹X quoted" and sum each site's quote price. A
 * converted site now counts at its CONTRACT instead, because a quote price
 * stops moving the moment it is signed while the contract rises every time
 * material added on site is billed — so this total drifted below the customer's
 * own Outstanding tile with nothing explaining the gap. The word "quoted" went
 * with it: the number is no longer only quotes.
 *
 * Every figure comes from the list payload's server-computed `sitePortfolio`,
 * so a page of 25 customers costs zero extra requests. `propertyCount` is the
 * fallback for a cached response written before that aggregate existed.
 */
function PortfolioCell({
  row,
  onAddSite,
}: {
  row: Customer;
  onAddSite: (customerId: string) => void;
}): JSX.Element {
  const portfolio = row.sitePortfolio;
  const siteCount = portfolio?.siteCount ?? (row.propertyCount as number | undefined) ?? 0;

  // Declared above the early return: this component returns different trees for
  // zero sites and some sites, and a hook below the branch would run on only
  // one of them ("Rendered more hooks than during the previous render").
  const addSite = useGatedAction('properties.create', () => onAddSite(row.id), 'Add site');

  if (siteCount === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '3px', pr: 2 }}>
        <Box component="span" sx={{ fontSize: crm['text-row'], color: color['text-tertiary'] }}>
          No site yet
        </Box>
        <Box
          component="button"
          type="button"
          onClick={addSite.onGatedClick}
          aria-disabled={!addSite.allowed}
          sx={{
            alignSelf: 'flex-start',
            border: 'none',
            background: 'none',
            p: 0,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            fontSize: crm['text-row-sm'],
            fontWeight: 500,
            color: color['accent-ink'],
            opacity: addSite.allowed ? 1 : 0.5,
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          + Add site
        </Box>
      </Box>
    );
  }

  const statusCounts = portfolio?.statusCounts ?? {};
  const segments = PROPERTY_STATUS_BAR_ORDER.map((status) => ({
    status,
    count: statusCounts[status] ?? 0,
  })).filter((segment) => segment.count > 0);

  const capacity = portfolio?.totalSystemSizeKw ?? 0;
  const portfolioValue = portfolio?.totalPortfolioAmount ?? 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.625, minWidth: 0, pr: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 0.75,
          fontSize: crm['text-row'],
          color: color['text-primary'],
        }}
      >
        <Box component="span" sx={{ fontWeight: 700 }}>
          {siteCount === 1 ? '1 site' : `${siteCount} sites`}
        </Box>
        <Box component="span" sx={{ color: color['text-tertiary'] }}>
          ·
        </Box>
        <Box
          component="span"
          sx={{
            fontFamily: 'var(--font-mono)',
            color: color['text-secondary'],
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {capacity.toFixed(2)} kWp
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          height: crm['portfolio-bar-height'],
          borderRadius: radius.pill,
          overflow: 'hidden',
          backgroundColor: color['neutral-bg'],
        }}
      >
        {segments.map((segment) => (
          <Box
            key={segment.status}
            title={`${toTitleLabel(segment.status)}: ${segment.count}`}
            sx={{
              width: `${(segment.count / siteCount) * 100}%`,
              backgroundColor: CRM_TONE_FILL[PROPERTY_STATUS_TONE[segment.status] ?? 'neutral'],
            }}
          />
        ))}
      </Box>

      <Box
        component="span"
        sx={{
          fontFamily: 'var(--font-mono)',
          fontSize: crm['text-row-2xs'],
          color: color['text-tertiary'],
          fontVariantNumeric: 'tabular-nums',
          ...ellipsisSx,
        }}
      >
        {portfolioValue > 0 ? formatCurrency(portfolioValue) : 'Not quoted yet'}
      </Box>
    </Box>
  );
}

function PersonCell({ name }: { name?: string }): JSX.Element {
  if (!name) {
    return (
      <Box component="span" sx={{ fontSize: crm['text-row'], color: color['text-tertiary'] }}>
        —
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.875, minWidth: 0 }}>
      <MUIAvatar
        name={name}
        size={Number.parseInt(crm['owner-avatar-size'], 10)}
        sx={{ flexShrink: 0 }}
      />
      <Box
        component="span"
        sx={{
          fontSize: 12,
          color: name === 'Self' ? color['accent-ink'] : color['text-secondary'],
          fontWeight: name === 'Self' ? 600 : 400,
          ...ellipsisSx,
        }}
      >
        {name}
      </Box>
    </Box>
  );
}

// ============================================================================
// Filter columns
//
// The filter contract, handed verbatim to the shared TableFilters popover.
// Every field the customers API accepts is declared here — including the
// property-level pseudo-fields that have no visible column of their own.
// ============================================================================

const FILTER_COLUMNS: ColumnConfig<Customer>[] = [
  {
    field: 'city',
    headerName: 'City',
    filterable: true,
    filterType: 'text',
    filterDebounceMs: 400,
  },
  {
    field: 'leadSource',
    headerName: 'Lead Source',
    filterable: true,
    filterType: 'select',
    filterOptions: LEAD_SOURCE_OPTIONS,
  },
  {
    field: 'status',
    headerName: 'Status',
    filterable: true,
    filterType: 'select',
    filterOptions: STATUS_OPTIONS,
  },
  {
    // Declared so the active-filter chip reads "Service tickets: Has active
    // tickets" rather than a bare "true", and so the filter is reachable from
    // the popover as well as the quick-filter chip — the same dual path status
    // already has.
    field: 'hasActiveTickets',
    headerName: 'Service tickets',
    filterable: true,
    filterType: 'select',
    filterOptions: [{ label: 'Has active tickets', value: 'true' }],
  },
  {
    // Options injected at render time from useCustomerGroups().
    field: 'groupSearch',
    headerName: 'Group',
    filterable: true,
    filterType: 'select',
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
  },
  {
    field: 'propertyType',
    headerName: 'Property Type',
    filterable: true,
    filterType: 'select',
    filterOptions: PROPERTY_TYPE_OPTIONS,
  },
  {
    field: 'propertyStatus',
    headerName: 'Property Status',
    filterable: true,
    filterType: 'select',
    filterOptions: PROPERTY_STATUS_OPTIONS,
  },
  {
    field: 'connectionType',
    headerName: 'Connection Type',
    filterable: true,
    filterType: 'select',
    filterOptions: CONNECTION_TYPE_OPTIONS,
  },
  {
    field: 'quoteStatus',
    headerName: 'Quote Status',
    filterable: true,
    filterType: 'select',
    filterOptions: QUOTE_STATUS_OPTIONS,
  },
  {
    field: 'leadTemperature',
    headerName: 'Lead Temperature',
    filterable: true,
    filterType: 'select',
    filterOptions: LEAD_TEMPERATURE_OPTIONS,
  },
  {
    field: 'latestQuoteSystemSizeKw',
    headerName: 'System Size (kW)',
    filterable: true,
    filterType: 'range',
  },
  {
    field: 'propertyCity',
    headerName: 'Property City',
    filterable: true,
    filterType: 'text',
    filterDebounceMs: 400,
  },
  {
    field: 'propertyState',
    headerName: 'Property State',
    filterable: true,
    filterType: 'text',
    filterDebounceMs: 400,
  },
  {
    field: 'propertyConsumerNumber',
    headerName: 'Consumer Number',
    filterable: true,
    filterType: 'text',
    filterDebounceMs: 400,
  },
  {
    field: 'createdAt',
    headerName: 'Onboarded',
    filterable: true,
    filterType: 'date',
  },
  {
    // Options injected at render time from useEmployees().
    field: 'createdBy',
    headerName: 'Created By',
    filterable: true,
  },
  {
    field: 'assigneeId',
    headerName: 'Assigned To',
    filterable: true,
  },
];

// ============================================================================
// Bulk actions (module-level constant — never recreated on render)
// ============================================================================

const BULK_ACTIONS: CrmBulkAction<Customer>[] = [
  {
    label: 'Export',
    onClick: (_rows) => {
      // placeholder — export API pending
    },
  },
  {
    label: 'Delete',
    disabled: true,
    disabledTooltip: 'Bulk delete is not yet available',
    onClick: () => undefined,
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

  const [importOpen, setImportOpen] = useState(false);

  const addCustomer = useGatedAction(
    'customers.create',
    () => {
      void router.push(ROUTES.ONBOARDING.NEW);
    },
    'Add customer',
  );
  const importCustomers = useGatedAction(
    'customers.create',
    () => setImportOpen(true),
    'Import customers',
  );

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

  /**
   * Status quick-filter chips write to the same `status` filter field the
   * popover uses — they are a shortcut into the filter model, never a second
   * copy of it. Selecting a chip and selecting Status in the popover are
   * therefore the same action, and each reflects the other.
   */
  const activeStatusFilter =
    typeof urlState.state.filters.status === 'string' ? urlState.state.filters.status : '';

  const handleQuickFilterChange = useCallback(
    (key: string) => {
      const next = { ...filtersRef.current };
      if (key) next.status = key;
      else delete next.status;
      urlState.setFilters(reconcileContradictoryCustomerFilters(next, 'status'));
    },
    [urlState.setFilters],
  );

  // Fetch active employees
  const { data: employees = [] } = useEmployees();

  // Fetch customer groups
  const { data: groups = [] } = useCustomerGroups();

  // Per-status counts for the quick-filter chips
  const { data: statusStats } = useCustomerStats();

  const quickFilters = useMemo<CrmQuickFilter[]>(() => {
    const total = statusStats
      ? Object.values(statusStats).reduce((sum, n) => sum + n, 0)
      : undefined;

    return [
      { key: '', label: 'All', count: total, tone: 'neutral', dot: false },
      ...Object.values(CustomerStatus).map((status) => ({
        key: status,
        label: toTitleLabel(status),
        count: statusStats?.[status],
        tone: CUSTOMER_STATUS_TONE[status] ?? 'neutral',
        dot: true,
      })),
    ];
  }, [statusStats]);

  // Company-wide roll-up used for the KPI cards below — also rendered on this
  // page by CustomerKpiCards, so TanStack Query dedupes the request.
  const { data: overviewStats } = useCustomerOverviewStats();

  /** Count comes from the same filtered query the chip applies, so the two agree. */
  const { data: activeTicketCustomers } = useCustomers({ hasActiveTickets: true, limit: 1 });

  /**
   * The secondary chip row holds the worklist views — "who needs my attention"
   * — as opposed to the status row above, which describes what a customer *is*.
   *
   * Both worklists share this one row because CrmTable tracks a single
   * `activeSecondaryQuickFilter`, so they are mutually exclusive by
   * construction. That is the right semantic anyway: they are two different
   * worklists, and the leading "All customers" chip is how you leave either.
   */
  const secondaryQuickFilters = useMemo<CrmQuickFilter[]>(
    () => [
      { key: '', label: 'All customers', tone: 'neutral', dot: false },
      {
        key: 'needs-followup',
        label: 'Needs follow-up',
        count: overviewStats?.needsFollowup,
        tone: 'danger',
        dot: true,
      },
      {
        key: 'active-tickets',
        label: 'Has active tickets',
        count: activeTicketCustomers?.meta?.total,
        tone: 'warning',
        dot: true,
      },
    ],
    [overviewStats?.needsFollowup, activeTicketCustomers?.meta?.total],
  );

  /**
   * Both chips are shortcuts into the same URL filter state as every other
   * filter on this page — not parallel React state — so they inherit the
   * page-0 reset and URL persistence `urlState.setFilters` already provides.
   */
  const activeSecondaryQuickFilter =
    urlState.state.filters.needsFollowup === 'true' || urlState.state.filters.needsFollowup === true
      ? 'needs-followup'
      : urlState.state.filters.hasActiveTickets === 'true'
        ? 'active-tickets'
        : '';

  const handleSecondaryQuickFilterChange = useCallback(
    (key: string) => {
      const next = { ...filtersRef.current };
      // Selecting either worklist clears the other — one row, one selection.
      delete next.needsFollowup;
      delete next.hasActiveTickets;
      if (key === 'needs-followup') next.needsFollowup = 'true';
      else if (key === 'active-tickets') next.hasActiveTickets = 'true';
      urlState.setFilters(reconcileContradictoryCustomerFilters(next, key || undefined));
    },
    [urlState.setFilters],
  );

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

  const filterColumns = useMemo<ColumnConfig<Customer>[]>(() => {
    return FILTER_COLUMNS.map((col) => {
      if (col.field === 'groupSearch') {
        return {
          ...col,
          filterOptions: groupOptions,
          renderFilter: ({ value, onChange }) => (
            <FilterAutocomplete
              options={groupOptions}
              value={value}
              onChange={onChange}
              placeholder="Search group..."
            />
          ),
        };
      }
      if (col.field === 'createdBy') {
        return {
          ...col,
          filterOptions: creatorOptions,
          renderFilter: ({ value, onChange }) => (
            <FilterAutocomplete
              options={creatorOptions}
              value={value}
              onChange={onChange}
              placeholder="Search creator..."
            />
          ),
        };
      }
      if (col.field === 'assigneeId') {
        return {
          ...col,
          filterOptions: assigneeOptions,
          renderFilter: ({ value, onChange }) => (
            <FilterAutocomplete
              options={assigneeOptions}
              value={value}
              onChange={onChange}
              placeholder="Search assignee..."
            />
          ),
        };
      }
      return col;
    });
  }, [creatorOptions, assigneeOptions, groupOptions]);

  const handleAddSite = useCallback(
    (customerId: string) => {
      void router.push(buildRoute(ROUTES.ONBOARDING.NEW, undefined, { customerId }));
    },
    [router],
  );

  const columns = useMemo<CrmColumn<Customer>[]>(
    () => [
      {
        field: 'name',
        header: 'Customer',
        track: crm['col-customer'],
        sortable: true,
        sortField: 'name',
        stopPropagation: true,
        hideable: false,
        renderCell: (row) => <CustomerCell row={row} />,
      },
      {
        field: 'contact',
        header: 'Contact',
        track: crm['col-contact'],
        stopPropagation: true,
        renderCell: (row) => <ContactCell row={row} />,
      },
      {
        field: 'city',
        header: 'Location',
        track: crm['col-location'],
        sortable: true,
        sortField: 'city',
        renderCell: (row) => <LocationCell row={row} />,
      },
      {
        field: 'leadSource',
        header: 'Source',
        track: crm['col-source'],
        renderCell: (row) => {
          const source = row.leadSource as string | undefined;
          if (!source) {
            return (
              <Box
                component="span"
                sx={{ fontSize: crm['text-row'], color: color['text-tertiary'] }}
              >
                Not set
              </Box>
            );
          }
          return (
            <CrmStatusPill
              label={toTitleLabel(source)}
              tone={LEAD_SOURCE_TONE[source] ?? 'neutral'}
              dot={false}
              size="sm"
            />
          );
        },
      },
      {
        field: 'portfolio',
        header: 'Site portfolio',
        track: crm['col-portfolio'],
        stopPropagation: true,
        renderCell: (row) => <PortfolioCell row={row} onAddSite={handleAddSite} />,
      },
      {
        field: 'status',
        header: 'Status',
        track: crm['col-status'],
        renderCell: (row) => {
          const status = row.status as CustomerStatus | undefined;
          if (!status) {
            return (
              <Box
                component="span"
                sx={{ fontSize: crm['text-row'], color: color['text-tertiary'] }}
              >
                —
              </Box>
            );
          }
          return (
            <CrmStatusPill
              label={toTitleLabel(status)}
              tone={CUSTOMER_STATUS_TONE[status] ?? 'neutral'}
            />
          );
        },
      },
      {
        field: 'createdAt',
        header: 'Onboarded',
        track: crm['col-onboarded'],
        sortable: true,
        sortField: 'createdAt',
        renderCell: (row) => {
          const ts = row.createdAt as string | undefined;
          return (
            <Box
              component="span"
              sx={{
                fontSize: 12,
                color: ts ? color['text-secondary'] : color['text-tertiary'],
                whiteSpace: 'nowrap',
              }}
            >
              {ts
                ? new Date(ts).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </Box>
          );
        },
      },
      {
        field: 'owner',
        header: 'Owner',
        track: crm['col-owner'],
        renderCell: (row) => (
          <PersonCell
            name={
              (row.assigneeName as string | undefined) ?? (row.creatorName as string | undefined)
            }
          />
        ),
      },
      {
        // The pre-v2 list had separate "Created By" and "Assigned To" columns.
        // "Owner" above shows the assignee (falling back to the creator), and
        // this keeps the creator independently reachable rather than dropping it.
        field: 'creator',
        header: 'Created by',
        track: crm['col-creator'],
        defaultHidden: true,
        renderCell: (row) => <PersonCell name={row.creatorName as string | undefined} />,
      },
      {
        field: 'actions',
        header: '',
        track: crm['col-actions'],
        align: 'right',
        hideable: false,
        stopPropagation: true,
        renderCell: (row) => (
          <RowActionsMenu
            customer={row}
            showDelete={isOrgAdmin}
            onRequestDelete={deleteConfirmation.requestDelete}
          />
        ),
      },
    ],
    [handleAddSite, isOrgAdmin, deleteConfirmation.requestDelete],
  );

  const renderEmptyState = useCallback(
    (hasActiveFilters: boolean): JSX.Element =>
      hasActiveFilters ? (
        <Box
          sx={{ py: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25 }}
        >
          <Box sx={{ fontSize: 14, fontWeight: 700 }}>No customers match</Box>
          <Box sx={{ fontSize: crm['text-row'], color: color['text-secondary'] }}>
            Try another name, phone number or site code.
          </Box>
          <Button size="small" variant="outlined" onClick={urlState.resetAll} sx={{ mt: 0.5 }}>
            Clear all filters
          </Button>
        </Box>
      ) : (
        <Box
          sx={{ py: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.25 }}
        >
          <Box sx={{ fontSize: 14, fontWeight: 700 }}>No customers yet</Box>
          <Box sx={{ fontSize: crm['text-row'], color: color['text-secondary'] }}>
            Get started by adding your first customer.
          </Box>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ mt: 0.5 }}
            onClick={addCustomer.onGatedClick}
            aria-disabled={!addCustomer.allowed}
          >
            Add customer
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

  const getRowId = useCallback((row: Customer) => row.id, []);

  const renderExpandedRow = useCallback(
    (row: Customer) => (
      <CustomerPropertiesExpandedRow
        customerId={row.id}
        expectedSiteCount={
          row.sitePortfolio?.siteCount ?? (row.propertyCount as number | undefined)
        }
      />
    ),
    [],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      {/* ── Page Header ── */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: { lg: 'flex-start' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Box
            component="span"
            sx={{
              fontSize: 'var(--text-overline-size)',
              fontWeight: 700,
              letterSpacing: 'var(--text-overline-track)',
              textTransform: 'uppercase',
              color: color['text-tertiary'],
            }}
          >
            Sales &amp; CRM
          </Box>
          <Box
            component="h1"
            sx={{
              m: 0,
              mt: '5px',
              mb: '3px',
              fontSize: crm['text-page-title'],
              fontWeight: 700,
              letterSpacing: crm['text-page-title-track'],
            }}
          >
            All customers
          </Box>
          <Box
            component="p"
            sx={{ m: 0, fontSize: crm['text-row-title'], color: color['text-secondary'] }}
          >
            Every customer with their sites nested inside — expand a row to work the portfolio.
          </Box>
        </Box>

        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ pt: { lg: 2.25 } }}>
          <Button
            variant="outlined"
            size="small"
            onClick={importCustomers.onGatedClick}
            aria-disabled={!importCustomers.allowed}
          >
            Import
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addCustomer.onGatedClick}
            aria-disabled={!addCustomer.allowed}
          >
            Add customer
          </Button>
        </Stack>
      </Box>

      {/* ── KPI cards ── */}
      <CustomerKpiCards />

      {/* ── Error banner ── */}
      {isError && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            borderRadius: radius['rf-sm'],
            border: '1px solid',
            borderColor: 'error.light',
            backgroundColor: 'rgba(220,38,38,0.06)',
          }}
        >
          <ErrorOutlineIcon color="error" />
          <Box sx={{ flex: 1 }}>
            <Box sx={{ fontSize: crm['text-row-title'], fontWeight: 700, color: color.danger }}>
              Failed to load customers
            </Box>
            <Box sx={{ fontSize: crm['text-row-sm'], color: color['text-secondary'] }}>
              {getErrorMessage(error)}
            </Box>
          </Box>
          <Button variant="outlined" color="error" size="small" onClick={() => void refetch()}>
            Retry
          </Button>
        </Box>
      )}

      {/* ── Table ── */}
      <CrmTable<Customer>
        columns={columns}
        rows={tableRows}
        getRowId={getRowId}
        loading={isLoading}
        refetching={isFetching && !isLoading}
        initialSearch={urlState.state.search}
        onSearchChange={urlState.setSearch}
        searchPlaceholder="Search name, phone, site code"
        quickFilters={quickFilters}
        activeQuickFilter={activeStatusFilter}
        onQuickFilterChange={handleQuickFilterChange}
        secondaryQuickFilters={secondaryQuickFilters}
        activeSecondaryQuickFilter={activeSecondaryQuickFilter}
        onSecondaryQuickFilterChange={handleSecondaryQuickFilterChange}
        filterColumns={filterColumns}
        filterModel={urlState.state.filters}
        onFilterChange={handleFilterChange}
        sortModel={urlState.state.sortModel}
        onSortChange={urlState.setSortModel}
        page={urlState.state.page}
        pageSize={urlState.state.pageSize}
        totalRowCount={customerData?.meta.total ?? 0}
        onPageChange={urlState.setPage}
        onPageSizeChange={urlState.setPageSize}
        enableRowSelection
        bulkActions={BULK_ACTIONS}
        selectionLabel={(count) =>
          count === 1 ? '1 customer selected' : `${count} customers selected`
        }
        renderExpandedRow={renderExpandedRow}
        renderEmptyState={renderEmptyState}
        itemLabel="customers"
      />

      <ImportCustomersModal open={importOpen} onOpenChange={setImportOpen} />

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
