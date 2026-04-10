'use client';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HouseOutlinedIcon from '@mui/icons-material/HouseOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PhoneIcon from '@mui/icons-material/Phone';
import UploadIcon from '@mui/icons-material/Upload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Link as MuiLink,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { CustomerSortField, CustomerStatus, LeadSource, SortOrder } from '@oneohm-epc/shared/types';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { type JSX, useMemo, useState } from 'react';

import { DeleteCustomerModal } from './delete-customer-modal';
import { ImportCustomersModal } from './import-customers-modal';
import {
  Customer as CustomerBase,
  type CustomerFilters,
  useCustomers,
} from '../hooks/use-customers';

import {
  AdvancedTable,
  type BulkAction,
  type ColumnConfig,
} from '@/components/shared/advanced-table';
import { WhatsAppIcon } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { type TableUrlFilterRecord, useTableUrlState } from '@/lib/hooks';
import {
  formatPhoneForWhatsApp,
  getInitials,
  getErrorMessage,
  pickDeterministic,
  toTitleLabel,
} from '@/lib/utils';

// AdvancedTable requires TRow extends Record<string, unknown>.
// Customer has explicit typed fields, so we widen it here for table usage only.
type Customer = CustomerBase & Record<string, unknown>;
const EMPTY_CUSTOMER_ROWS: Customer[] = [];

type ChipColor = 'default' | 'primary' | 'secondary' | 'warning' | 'error' | 'info' | 'success';
const CHIP_COLOR_POOL: readonly ChipColor[] = [
  'primary',
  'secondary',
  'info',
  'success',
  'warning',
];

function getStableChipColor(value: string): ChipColor {
  return pickDeterministic(value, CHIP_COLOR_POOL, 'default') as ChipColor;
}

const LEAD_SOURCE_OPTIONS = Object.values(LeadSource).map((value) => ({
  value,
  label: toTitleLabel(value),
}));

const STATUS_OPTIONS = Object.values(CustomerStatus).map((value) => ({
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
  const startLocal = new Date(yy, mm - 1, dd, 0, 0, 0, 0);
  const endLocal = new Date(yy, mm - 1, dd, 23, 59, 59, 999);
  return { fromIso: startLocal.toISOString(), toIso: endLocal.toISOString() };
}

function toCustomerFilters(filters: TableUrlFilterRecord): Partial<CustomerFilters> {
  const createdAtLocalDate =
    typeof filters.createdAt === 'string' ? toLocalDateString(filters.createdAt) : undefined;
  const createdAtUtcRange = createdAtLocalDate
    ? localDateToUtcDayRange(createdAtLocalDate)
    : undefined;
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
  };
}

// ============================================================================
// Row Actions Menu (private sub-component)
// ============================================================================

function RowActionsMenu({ customer }: { customer: Customer }): JSX.Element {
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
            router.push(buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: customer.id }));
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
            router.push(buildRoute(ROUTES.CUSTOMERS.EDIT, { id: customer.id }));
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
            router.push(buildRoute(ROUTES.CUSTOMERS.ADD_PROPERTY, { id: customer.id }));
          }}
        >
          <ListItemIcon>
            <PersonAddIcon fontSize="small" />
          </ListItemIcon>
          Add Property
        </MenuItem>

        <Divider />

        <MenuItem disabled sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>
    </>
  );
}

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
      const initials = getInitials(`${row.firstName} ${row.lastName ?? ''}`.trim());
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
          <Avatar
            sx={{
              width: 32,
              height: 32,
              fontSize: '0.6875rem',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={500} noWrap>
              {row.firstName} {row.lastName ?? ''}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 160 }}>
                {row.email ?? '-'}
              </Typography>
              <Tooltip title="Properties">
                <Stack direction="row" spacing={0.25} alignItems="center">
                  <HouseOutlinedIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.disabled">
                    {row.propertyCount}
                  </Typography>
                </Stack>
              </Tooltip>
            </Stack>
            {row.groupCode && (
              <Chip
                label={row.groupName ? `${row.groupName} (${row.groupCode})` : row.groupCode}
                size="small"
                color="info"
                variant="outlined"
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
      const phone = row.phone || row.alternatePhone;
      if (!phone) return <Typography color="text.disabled">-</Typography>;
      const whatsappNumber = formatPhoneForWhatsApp(phone);
      return (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {phone}
          </Typography>
          <Tooltip title="Call">
            <IconButton
              size="small"
              component="a"
              href={`tel:${phone}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              sx={{ p: 0.5 }}
            >
              <PhoneIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
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
              sx={{ p: 0.5 }}
            >
              <WhatsAppIcon className="size-3.5 text-success" />
            </IconButton>
          </Tooltip>
        </Stack>
      );
    },
  },
  {
    field: 'city',
    headerName: 'City',
    sortable: true,
    filterable: true,
    filterType: 'text',
    filterDebounceMs: 400,
    flex: 1,
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {row.city ?? '-'}
      </Typography>
    ),
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
      if (!rawSrc) return <Typography color="text.disabled">-</Typography>;
      const knownSrc = Object.values(LeadSource).find((v) => (v as string) === rawSrc);
      const label = knownSrc ? toTitleLabel(knownSrc) : toTitleLabel(rawSrc);
      const color = getStableChipColor(knownSrc ?? rawSrc);
      return <Chip label={label} size="small" color={color} variant="outlined" />;
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
      const knownStatus = Object.values(CustomerStatus).find((v) => (v as string) === rawStatus);
      const label = knownStatus
        ? toTitleLabel(knownStatus)
        : rawStatus
          ? toTitleLabel(rawStatus)
          : '-';
      const color = knownStatus ? getStableChipColor(knownStatus) : ('default' as const);
      return <Chip label={label} size="small" color={color} variant="filled" />;
    },
  },
  {
    // pseudo-column for group search filter — hidden from table display
    field: 'groupSearch',
    headerName: 'Group',
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
    renderCell: ({ row }) => (
      <Typography variant="body2" color="text.secondary">
        {new Date(row.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </Typography>
    ),
  },
  {
    field: 'creatorName',
    headerName: 'Created By',
    flex: 1,
    renderCell: ({ row }) => (
      <Typography
        variant="body2"
        color={row.creatorName === 'Self' ? 'primary.main' : 'text.secondary'}
        fontWeight={row.creatorName === 'Self' ? 600 : 400}
      >
        {row.creatorName ?? '-'}
      </Typography>
    ),
  },
  {
    field: 'actions',
    headerName: '',
    hideable: false,
    width: 48,
    actions: (row) => <RowActionsMenu customer={row} />,
  },
];

// ============================================================================
// Main component
// ============================================================================

export function CustomerListPage(): JSX.Element {
  const router = useRouter();

  // URL-synced table state — single source of truth for all pagination/sort/filter/search
  const urlState = useTableUrlState({ prefix: 'customers', defaultPageSize: 10 });

  // Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

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

  const bulkActions: BulkAction<Customer>[] = [
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
          <Typography variant="h5" fontWeight={700}>
            All Customers
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Manage your customers and track their journey
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            startIcon={<UploadIcon />}
            onClick={() => setImportModalOpen(true)}
          >
            Import
          </Button>

          {/* Export placeholder — future API */}
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
            Export
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => router.push(ROUTES.CUSTOMERS.NEW)}
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
            <Typography variant="body2" fontWeight={600} color="error.main">
              Failed to load customers
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {getErrorMessage(error)}
            </Typography>
          </Box>
          <Button variant="outlined" color="error" size="small" onClick={() => void refetch()}>
            Retry
          </Button>
        </Box>
      )}

      {/* ── Table ── */}
      <AdvancedTable<Customer>
        columns={COLUMNS}
        rows={tableRows}
        rowIdField="id"
        paginationMode="server"
        loading={isLoading}
        refetching={isFetching && !isLoading}
        // Controlled props — driven by urlState
        page={urlState.state.page}
        pageSize={urlState.state.pageSize}
        totalRowCount={customerData?.meta.total ?? 0}
        sortModel={urlState.state.sortModel}
        filterModel={urlState.state.filters}
        // Callbacks — each writes to URL, which re-drives useCustomers
        onPageChange={urlState.setPage}
        onPageSizeChange={urlState.setPageSize}
        onSortChange={urlState.setSortModel}
        onFilterChange={urlState.setFilters}
        onSearchChange={urlState.setSearch}
        // Row interaction
        onRowClick={(row) => router.push(buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: row.id }))}
        // Row selection
        enableRowSelection
        bulkActions={bulkActions}
        // Features
        enableSearch
        enableFilters
        enablePagination
        enableColumnVisibility
        searchPlaceholder="Search by name, phone, email, city..."
        itemLabel="customers"
        // Custom empty states
        renderEmptyState={(hasActiveFilters) =>
          hasActiveFilters ? (
            <Box
              sx={{
                py: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No customers match your search and filters.
              </Typography>
              <Button size="small" variant="outlined" onClick={urlState.resetAll}>
                Clear all filters
              </Button>
            </Box>
          ) : (
            <Box
              sx={{
                py: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No customers yet. Get started by adding your first customer.
              </Typography>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => router.push(ROUTES.CUSTOMERS.NEW)}
              >
                Add Customer
              </Button>
            </Box>
          )
        }
      />

      {/* ── Modals ── */}
      <DeleteCustomerModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        customer={null}
      />
      <ImportCustomersModal open={importModalOpen} onOpenChange={setImportModalOpen} />
    </Box>
  );
}
