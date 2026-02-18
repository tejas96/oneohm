'use client';

import { CustomerStatus, CustomerSortField, LeadSource, SortOrder } from '@oneohm-epc/shared-types';
import { ColumnDef } from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Download,
  Eye,
  Edit,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
  ChevronDown,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo, type JSX } from 'react';

import { DeleteCustomerModal } from './delete-customer-modal';
import { ImportCustomersModal } from './import-customers-modal';
import { useCustomers, type Customer } from '../hooks';

import { DataTable, EmptyState, FilterTabs, TablePagination, type FilterTab } from '@/components/shared';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Typography,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useDebounce } from '@/lib/hooks';
import { cn, getErrorMessage } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 500;

// ============================================================================
// Badge Mappings
// ============================================================================

const STATUS_BADGE_VARIANTS: Record<CustomerStatus, 'success' | 'warning' | 'info' | 'muted'> = {
  [CustomerStatus.ACTIVE]: 'success',
  [CustomerStatus.LEAD]: 'info',
  [CustomerStatus.PROSPECT]: 'warning',
  [CustomerStatus.INACTIVE]: 'muted',
};

const STATUS_LABELS: Record<CustomerStatus, string> = {
  [CustomerStatus.ACTIVE]: 'Active',
  [CustomerStatus.LEAD]: 'Lead',
  [CustomerStatus.PROSPECT]: 'Prospect',
  [CustomerStatus.INACTIVE]: 'Inactive',
};

const LEAD_SOURCE_COLORS: Record<LeadSource, string> = {
  [LeadSource.REFERRAL]: 'bg-pink-50 text-pink-700',
  [LeadSource.WEBSITE]: 'bg-purple-50 text-purple-700',
  [LeadSource.WALK_IN]: 'bg-emerald-50 text-emerald-700',
  [LeadSource.SOCIAL_MEDIA]: 'bg-orange-50 text-orange-700',
  [LeadSource.RESELLER]: 'bg-blue-50 text-blue-700',
  [LeadSource.ADVERTISEMENT]: 'bg-indigo-50 text-indigo-700',
  [LeadSource.EXHIBITION]: 'bg-cyan-50 text-cyan-700',
  [LeadSource.COLD_CALL]: 'bg-slate-50 text-slate-700',
  [LeadSource.OTHER]: 'bg-muted text-foreground-secondary',
};

const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  [LeadSource.REFERRAL]: 'Referral',
  [LeadSource.WEBSITE]: 'Website',
  [LeadSource.WALK_IN]: 'Walk-in',
  [LeadSource.SOCIAL_MEDIA]: 'Social Media',
  [LeadSource.RESELLER]: 'Reseller',
  [LeadSource.ADVERTISEMENT]: 'Advertisement',
  [LeadSource.EXHIBITION]: 'Exhibition',
  [LeadSource.COLD_CALL]: 'Cold Call',
  [LeadSource.OTHER]: 'Other',
};

// ============================================================================
// Filter Configuration
// ============================================================================

const STATUS_TABS: FilterTab<string>[] = [
  { id: 'all', label: 'All' },
  { id: CustomerStatus.LEAD, label: 'Lead' },
  { id: CustomerStatus.PROSPECT, label: 'Prospect' },
  { id: CustomerStatus.ACTIVE, label: 'Active' },
  { id: CustomerStatus.INACTIVE, label: 'Inactive' },
];

const LEAD_SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  ...Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({ value, label })),
];

// ============================================================================
// Helper Functions
// ============================================================================

// Type-safe URL param helpers
function getValidSortField(value: string | null): CustomerSortField {
  const validFields = Object.values(CustomerSortField);
  return validFields.includes(value as CustomerSortField)
    ? (value as CustomerSortField)
    : CustomerSortField.CREATED_AT;
}

function getValidSortOrder(value: string | null): SortOrder {
  return value === SortOrder.ASC ? SortOrder.ASC : SortOrder.DESC;
}

function getInitials(firstName: string, lastName?: string | null): string {
  const first = firstName.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  return `${first}${last}`.toUpperCase() || '?';
}

function formatPhoneForWhatsApp(phone: string): string {
  return phone.replace(/\D/g, '');
}

// ============================================================================
// Component
// ============================================================================

export function CustomerListPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL params for initial state
  const initialPage = Number(searchParams.get('page')) || 1;
  const initialLimit = Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE;
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = searchParams.get('status') || 'all';
  const initialLeadSource = searchParams.get('leadSource') || 'all';
  const initialSortBy = getValidSortField(searchParams.get('sortBy'));
  const initialSortOrder = getValidSortOrder(searchParams.get('sortOrder'));

  // Local state for pagination and search
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialLimit);
  const [searchInput, setSearchInput] = useState(initialSearch);

  // Filter state
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [leadSourceFilter, setLeadSourceFilter] = useState(initialLeadSource);
  const [sortBy, setSortBy] = useState<CustomerSortField>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);

  // Debounce all filter values to prevent rapid API calls
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);
  const debouncedStatusFilter = useDebounce(statusFilter, 300);
  const debouncedLeadSourceFilter = useDebounce(leadSourceFilter, 300);
  const debouncedSortBy = useDebounce(sortBy, 300);
  const debouncedSortOrder = useDebounce(sortOrder, 300);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Sync state to URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (pageSize !== DEFAULT_PAGE_SIZE) params.set('limit', String(pageSize));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (leadSourceFilter !== 'all') params.set('leadSource', leadSourceFilter);
    if (sortBy !== CustomerSortField.CREATED_AT) params.set('sortBy', sortBy);
    if (sortOrder !== SortOrder.DESC) params.set('sortOrder', sortOrder);

    const query = params.toString();
    const newUrl = query ? `?${query}` : window.location.pathname;

    // Use replaceState to avoid adding to history on every filter change
    window.history.replaceState({}, '', newUrl);
  }, [page, pageSize, debouncedSearch, statusFilter, leadSourceFilter, sortBy, sortOrder]);

  // Modal state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedRows, setSelectedRows] = useState<Customer[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Fetch customers with filters
  const {
    data: customerData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useCustomers({
    page,
    limit: pageSize,
    search: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
    status: debouncedStatusFilter !== 'all' ? (debouncedStatusFilter as CustomerStatus) : undefined,
    leadSource: debouncedLeadSourceFilter !== 'all' ? (debouncedLeadSourceFilter as LeadSource) : undefined,
    sortBy: debouncedSortBy,
    sortOrder: debouncedSortOrder,
  });

  // Derived values for render
  const customers = customerData?.data ?? [];

  // Handle page size change
  const handlePageSizeChange = (newSize: number): void => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when page size changes
  };

  const totalItems = customerData?.meta.total ?? 0;
  const totalPages = customerData?.meta.totalPages ?? 1;

  // Handle row selection - memoized to prevent infinite loop in DataTable's useEffect
  const handleRowSelectionChange = useCallback((rows: Customer[]) => {
    setSelectedRows(rows);
  }, []);

  // Clear selection
  const clearSelection = (): void => {
    setSelectedRows([]);
  };

  // Clear search
  const clearSearch = (): void => {
    setSearchInput('');
    setPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = statusFilter !== 'all' || leadSourceFilter !== 'all' || debouncedSearch;

  // Clear all filters
  const clearAllFilters = (): void => {
    setStatusFilter('all');
    setLeadSourceFilter('all');
    setSearchInput('');
    setSortBy(CustomerSortField.CREATED_AT);
    setSortOrder(SortOrder.DESC);
    setPage(1);
  };

  // Memoized sort handler for column headers
  const handleSort = useCallback((field: CustomerSortField) => {
    if (sortBy === field) {
      // Same column clicked - toggle sort order
      setSortOrder((current) => (current === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC));
    } else {
      // Different column clicked - switch to new column with ASC
      setSortBy(field);
      setSortOrder(SortOrder.ASC);
    }
    setPage(1);
  }, [sortBy]);

  // Sortable column header component
  const SortableHeader = useCallback(
    ({ field, label }: { field: CustomerSortField; label: string }) => {
      const isActive = sortBy === field;
      return (
        <button
          type="button"
          onClick={() => handleSort(field)}
          className="flex items-center gap-1 font-semibold text-2xs uppercase tracking-wider hover:text-foreground transition-colors"
        >
          {label}
          {isActive ? (
            sortOrder === SortOrder.ASC ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            )
          ) : (
            <ArrowUpDown className="size-3 text-foreground-tertiary" />
          )}
        </button>
      );
    },
    [sortBy, sortOrder, handleSort]
  );

  // Table columns matching UX spec
  const columns: ColumnDef<Customer>[] = useMemo(
    () => [
      // Customer column with avatar, name, email, property count
      {
        accessorKey: 'name',
        header: () => <SortableHeader field={CustomerSortField.FIRST_NAME} label="Customer" />,
        enableSorting: false, // Disable client-side sorting
        accessorFn: (row) => `${row.firstName} ${row.lastName || ''}`,
        cell: ({ row }) => {
          const customer = row.original;
          const initials = getInitials(customer.firstName, customer.lastName);

          return (
            <Link
              href={ROUTES.CUSTOMERS.DETAIL.replace('[id]', customer.id)}
              className="flex items-center gap-2.5 hover:text-primary transition-colors"
            >
              {/* Avatar */}
              <Avatar size="sm" className="shrink-0">
                <AvatarFallback name={customer.id}>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-medium text-foreground leading-tight">
                  {customer.firstName} {customer.lastName || ''}
                </div>
                <div className="text-foreground-tertiary text-2xs flex items-center gap-1.5 leading-tight mt-0.5">
                  <span className="truncate">{customer.email || '-'}</span>
                  <span className="inline-flex items-center gap-0.5 shrink-0">
                    <Building2 className="size-3" />
                    {customer.propertyCount}
                  </span>
                </div>
              </div>
            </Link>
          );
        },
      },

      // Contact column with phone number and icons
      {
        accessorKey: 'contact',
        header: 'Contact',
        enableSorting: false,
        cell: ({ row }) => {
          // Use phone, fallback to alternatePhone if phone is empty
          const phone = row.original.phone || row.original.alternatePhone;

          if (!phone) {
            return <span className="text-foreground-tertiary">-</span>;
          }

          const whatsappNumber = formatPhoneForWhatsApp(phone);

          return (
            <div className="flex items-center gap-2">
              {/* Phone number text */}
              <span className="text-foreground-secondary text-sm">{phone}</span>
              {/* Action icons */}
              <div className="flex items-center gap-0.5">
                <a
                  href={`tel:${phone}`}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Call"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="size-3.5 text-foreground-tertiary" />
                </a>
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-success/10 rounded transition-colors"
                  title="WhatsApp"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="size-3.5 text-success" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
              </div>
            </div>
          );
        },
      },

      // City column (sortable)
      {
        accessorKey: 'city',
        header: () => <SortableHeader field={CustomerSortField.CITY} label="City" />,
        enableSorting: false, // Disable client-side sorting
        cell: ({ row }) => (
          <span className="text-foreground-secondary">{row.original.city || '-'}</span>
        ),
      },

      // Lead Source column with colored badges
      {
        accessorKey: 'leadSource',
        header: 'Lead Source',
        enableSorting: false,
        cell: ({ row }) => {
          const source = row.original.leadSource as LeadSource | undefined;
          if (!source) return <span className="text-foreground-tertiary">-</span>;

          return (
            <span
              className={cn(
                'px-1.5 py-0.5 text-2xs font-medium rounded',
                LEAD_SOURCE_COLORS[source] || 'bg-muted text-foreground-secondary'
              )}
            >
              {LEAD_SOURCE_LABELS[source] || source}
            </span>
          );
        },
      },

      // Status column (sortable)
      {
        accessorKey: 'status',
        header: () => <SortableHeader field={CustomerSortField.STATUS} label="Status" />,
        enableSorting: false, // Disable client-side sorting
        cell: ({ row }) => (
          <Badge variant={STATUS_BADGE_VARIANTS[row.original.status]} size="xs">
            {STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },

      // Onboarded column (sortable by createdAt)
      {
        accessorKey: 'createdAt',
        header: () => <SortableHeader field={CustomerSortField.CREATED_AT} label="Onboarded" />,
        enableSorting: false,
        cell: ({ row }) => {
          const date = row.original.createdAt;
          return (
            <span className="text-foreground-secondary text-sm">
              {new Date(date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          );
        },
      },

      // Created By column
      {
        accessorKey: 'creatorName',
        header: 'Created By',
        enableSorting: false,
        cell: ({ row }) => {
          const creatorName = row.original.creatorName;
          return (
            <span
              className={cn(
                'text-sm',
                creatorName === 'Self' ? 'text-primary font-medium' : 'text-foreground-secondary'
              )}
            >
              {creatorName || '-'}
            </span>
          );
        },
      },

      // Actions column
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="size-8 p-0">
                <MoreHorizontal className="size-icon-sm" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  router.push(ROUTES.CUSTOMERS.DETAIL.replace('[id]', row.original.id))
                }
              >
                <Eye className="mr-2 size-icon-sm" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(buildRoute(ROUTES.CUSTOMERS.EDIT, { id: row.original.id }))
                }
              >
                <Edit className="mr-2 size-icon-sm" />
                Edit Customer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(ROUTES.CUSTOMERS.ADD_PROPERTY.replace('[id]', row.original.id))
                }
              >
                <Plus className="mr-2 size-icon-sm" />
                Add Property
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedCustomer(row.original);
                  setDeleteModalOpen(true);
                }}
                className="text-error"
              >
                <Trash2 className="mr-2 size-icon-sm" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [router, SortableHeader]
  );

  // Loading state (initial load only)
  if (isLoading) {
    return (
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <Typography variant="h2">All Customers</Typography>
            <Typography variant="body" color="muted" className="mt-1">
              Manage your customers and track their journey
            </Typography>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" disabled>
              <Upload className="mr-2 size-icon-sm" />
              Import
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Download className="mr-2 size-icon-sm" />
              Export
              <ChevronDown className="ml-2 size-icon-xs" />
            </Button>
            <Button size="sm" disabled>
              <Plus className="mr-2 size-icon-sm" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Loading Spinner */}
        <div className="bg-white rounded-lg border border-border-light p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-foreground-secondary">Loading customers...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <Typography variant="h2">All Customers</Typography>
            <Typography variant="body" color="muted" className="mt-1">
              Manage your customers and track their journey
            </Typography>
          </div>
        </div>

        {/* Error State */}
        <div className="bg-white rounded-lg border border-error/30 p-6">
          <div className="flex items-center gap-3 text-error">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load customers</p>
              <p className="text-sm text-foreground-secondary mt-1">{getErrorMessage(error)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <Typography variant="h2">All Customers</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage your customers and track their journey
          </Typography>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
            <Upload className="mr-2 size-icon-sm" />
            Import
          </Button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 size-icon-sm" />
                Export
                <ChevronDown className="ml-2 size-icon-xs" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem>Export as Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" onClick={() => router.push(ROUTES.CUSTOMERS.NEW)}>
            <Plus className="mr-2 size-icon-sm" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search & Filters Row */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative w-72">
          <Input
            type="text"
            placeholder="Search customers..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            leftIcon={<Search className="size-icon-sm" />}
            className="h-8 text-sm"
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
            >
              <X className="size-3.5 text-foreground-tertiary" />
            </button>
          )}
          {isFetching && debouncedSearch && (
            <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-foreground-tertiary" />
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border-light" />

        {/* Status Tabs */}
        <FilterTabs
          tabs={STATUS_TABS}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          size="xs"
        />

        {/* Lead Source Dropdown */}
        <Select
          value={leadSourceFilter}
          onValueChange={(value) => {
            setLeadSourceFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[130px] h-8 text-sm">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            {LEAD_SOURCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters - only show when filters active */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-foreground-secondary h-8"
          >
            <X className="mr-1 size-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-border-light overflow-hidden">
        {/* Bulk Actions Bar - shown when items selected */}
        {selectedRows.length > 0 && (
          <div className="px-4 py-2 bg-primary/5 border-b border-border-light flex items-center gap-4">
            <span className="text-sm text-foreground-secondary">
              <strong className="text-foreground">{selectedRows.length}</strong> selected
            </span>
            <Button variant="ghost" size="sm" className="text-foreground-secondary">
              Export Selected
            </Button>
            <Button variant="ghost" size="sm" className="text-error">
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-foreground-secondary"
              onClick={clearSelection}
            >
              Clear selection
            </Button>
          </div>
        )}

        {/* Show DataTable when fetching OR has data, show EmptyState when not fetching AND no data */}
        {isFetching || customers.length > 0 ? (
          <>
            <DataTable
              columns={columns}
              data={customers}
              enableSearch={false}
              enablePagination={false}
              enableRowSelection
              onRowSelectionChange={handleRowSelectionChange}
              isLoading={isFetching}
            />

            {customers.length > 0 && (
              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                itemLabel="customers"
                variant="full"
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </>
        ) : (
          <div className="p-8">
            {hasActiveFilters ? (
              <EmptyState
                title="No customers found"
                description={
                  debouncedSearch
                    ? `No results match your search and filters. Try adjusting your criteria.`
                    : 'No customers match the selected filters. Try different filter options.'
                }
                action={{
                  label: 'Clear Filters',
                  onClick: clearAllFilters,
                }}
              />
            ) : (
              <EmptyState
                title="No customers yet"
                description="Get started by adding your first customer"
                action={{
                  label: 'Add Customer',
                  onClick: () => router.push(ROUTES.CUSTOMERS.NEW),
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <DeleteCustomerModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        customer={selectedCustomer}
      />

      <ImportCustomersModal open={importModalOpen} onOpenChange={setImportModalOpen} />
    </div>
  );
}
