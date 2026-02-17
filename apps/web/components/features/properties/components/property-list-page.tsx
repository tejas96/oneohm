'use client';

import {
  ConnectionType,
  LeadTemperature,
  PropertySortField,
  PropertyType,
  SortOrder,
} from '@oneohm-epc/shared-types';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Edit,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo, type JSX } from 'react';

import { MarkAsLostModal } from './mark-as-lost-modal';
import { useProperties, usePropertyStats, type Property } from '../hooks';

import { DataTable, EmptyState, FilterTabs, TablePagination, type FilterTab } from '@/components/shared';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Typography,
  WhatsAppIcon,
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
// Badge / Label Mappings
// ============================================================================

const TEMPERATURE_LABELS: Record<LeadTemperature, string> = {
  [LeadTemperature.HOT]: 'Hot',
  [LeadTemperature.WARM]: 'Warm',
  [LeadTemperature.COLD]: 'Cold',
};

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  [PropertyType.RESIDENTIAL]: 'Residential',
  [PropertyType.RESIDENTIAL_APARTMENT]: 'Apartment',
  [PropertyType.COMMERCIAL]: 'Commercial',
  [PropertyType.INDUSTRIAL]: 'Industrial',
  [PropertyType.AGRICULTURAL]: 'Agricultural',
  [PropertyType.INSTITUTIONAL]: 'Institutional',
};

const CONNECTION_TYPE_LABELS: Record<ConnectionType, string> = {
  [ConnectionType.SINGLE_PHASE]: '1-Phase',
  [ConnectionType.THREE_PHASE]: '3-Phase',
};

const PROPERTY_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  ...Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

const QUOTE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-foreground-secondary',
  sent: 'bg-info/10 text-info',
  pending: 'bg-warning/10 text-warning',
  accepted: 'bg-success/10 text-success',
  rejected: 'bg-error/10 text-error',
};

// ============================================================================
// Filter Configuration
// ============================================================================

const TEMPERATURE_TABS: FilterTab<string>[] = [
  { id: 'all', label: 'All' },
  { id: LeadTemperature.HOT, label: 'Hot' },
  { id: LeadTemperature.WARM, label: 'Warm' },
  { id: LeadTemperature.COLD, label: 'Cold' },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getValidSortField(value: string | null): PropertySortField {
  const validFields = Object.values(PropertySortField);
  return validFields.includes(value as PropertySortField)
    ? (value as PropertySortField)
    : PropertySortField.CREATED_AT;
}

function getValidSortOrder(value: string | null): SortOrder {
  return value === SortOrder.ASC ? SortOrder.ASC : SortOrder.DESC;
}

function formatPhoneForWhatsApp(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

// ============================================================================
// Component
// ============================================================================

export function PropertyListPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL params for initial state
  const initialPage = Number(searchParams.get('page')) || 1;
  const initialLimit = Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE;
  const initialSearch = searchParams.get('search') || '';
  const initialTemperature = searchParams.get('leadTemperature') || 'all';
  const initialPropertyType = searchParams.get('propertyType') || 'all';
  const initialSortBy = getValidSortField(searchParams.get('sortBy'));
  const initialSortOrder = getValidSortOrder(searchParams.get('sortOrder'));

  // Local state for pagination and search
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialLimit);
  const [searchInput, setSearchInput] = useState(initialSearch);

  // Filter state
  const [temperatureFilter, setTemperatureFilter] = useState(initialTemperature);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState(initialPropertyType);
  const [sortBy, setSortBy] = useState<PropertySortField>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);

  // Debounce values
  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);
  const debouncedTemperatureFilter = useDebounce(temperatureFilter, 300);
  const debouncedPropertyTypeFilter = useDebounce(propertyTypeFilter, 300);
  const debouncedSortBy = useDebounce(sortBy, 300);
  const debouncedSortOrder = useDebounce(sortOrder, 300);

  // Sync state from URL when external navigation occurs (e.g. sidebar link clicks).
  // window.history.replaceState (used internally) does NOT update searchParams,
  // so this only fires on actual Next.js navigations, avoiding infinite loops.
  const searchParamsString = searchParams.toString();
  useEffect(() => {
    const urlTemperature = searchParams.get('leadTemperature') || 'all';
    const urlSearch = searchParams.get('search') || '';
    const urlPage = Number(searchParams.get('page')) || 1;
    const urlLimit = Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE;
    const urlPropertyType = searchParams.get('propertyType') || 'all';
    const urlSortBy = getValidSortField(searchParams.get('sortBy'));
    const urlSortOrder = getValidSortOrder(searchParams.get('sortOrder'));

    setTemperatureFilter(urlTemperature);
    setSearchInput(urlSearch);
    setPage(urlPage);
    setPageSize(urlLimit);
    setPropertyTypeFilter(urlPropertyType);
    setSortBy(urlSortBy);
    setSortOrder(urlSortOrder);
  }, [searchParamsString]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (pageSize !== DEFAULT_PAGE_SIZE) params.set('limit', String(pageSize));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (temperatureFilter !== 'all') params.set('leadTemperature', temperatureFilter);
    if (propertyTypeFilter !== 'all') params.set('propertyType', propertyTypeFilter);
    if (sortBy !== PropertySortField.CREATED_AT) params.set('sortBy', sortBy);
    if (sortOrder !== SortOrder.DESC) params.set('sortOrder', sortOrder);

    const query = params.toString();
    const newUrl = query ? `?${query}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [page, pageSize, debouncedSearch, temperatureFilter, propertyTypeFilter, sortBy, sortOrder]);

  // Modal state
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Property[]>([]);

  // Fetch properties with filters
  const {
    data: propertyData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useProperties({
    page,
    limit: pageSize,
    search: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
    leadTemperature:
      debouncedTemperatureFilter !== 'all'
        ? (debouncedTemperatureFilter as LeadTemperature)
        : undefined,
    propertyType:
      debouncedPropertyTypeFilter !== 'all'
        ? (debouncedPropertyTypeFilter as PropertyType)
        : undefined,
    sortBy: debouncedSortBy,
    sortOrder: debouncedSortOrder,
  });

  // Fetch temperature stats for FilterTabs counts
  const { data: stats } = usePropertyStats();

  // Build tabs with counts
  const temperatureTabsWithCounts: FilterTab<string>[] = useMemo(() => {
    if (!stats) return TEMPERATURE_TABS;
    const total = stats.hot + stats.warm + stats.cold;
    return [
      { id: 'all', label: 'All', count: total },
      { id: LeadTemperature.HOT, label: 'Hot', count: stats.hot },
      { id: LeadTemperature.WARM, label: 'Warm', count: stats.warm },
      { id: LeadTemperature.COLD, label: 'Cold', count: stats.cold },
    ];
  }, [stats]);

  // Derived values
  const properties = propertyData?.data ?? [];
  const totalItems = propertyData?.meta.total ?? 0;
  const totalPages = propertyData?.meta.totalPages ?? 1;

  // Handlers
  const handlePageSizeChange = (newSize: number): void => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleRowSelectionChange = useCallback((rows: Property[]) => {
    setSelectedRows(rows);
  }, []);

  const clearSelection = (): void => {
    setSelectedRows([]);
  };

  const clearSearch = (): void => {
    setSearchInput('');
    setPage(1);
  };

  const hasActiveFilters =
    temperatureFilter !== 'all' || propertyTypeFilter !== 'all' || debouncedSearch.length >= 2;

  const clearAllFilters = (): void => {
    setTemperatureFilter('all');
    setPropertyTypeFilter('all');
    setSearchInput('');
    setSortBy(PropertySortField.CREATED_AT);
    setSortOrder(SortOrder.DESC);
    setPage(1);
  };

  // Sort handler for column headers
  const handleSort = useCallback(
    (field: PropertySortField) => {
      if (sortBy === field) {
        setSortOrder((current) => (current === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC));
      } else {
        setSortBy(field);
        setSortOrder(SortOrder.ASC);
      }
      setPage(1);
    },
    [sortBy],
  );

  // Sortable column header component
  const SortableHeader = useCallback(
    ({ field, label }: { field: PropertySortField; label: string }) => {
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
    [sortBy, sortOrder, handleSort],
  );

  // Table columns
  const columns: ColumnDef<Property>[] = useMemo(
    () => [
      // Property column: name + temp dot, address + customerName + type
      {
        accessorKey: 'propertyName',
        header: () => (
          <SortableHeader field={PropertySortField.PROPERTY_NAME} label="Property" />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const property = row.original;
          return (
            <Link
              href={buildRoute(ROUTES.PROPERTIES.DETAIL, { id: property.id })}
              className="block hover:text-primary transition-colors"
            >
              <div className="flex items-center gap-2 leading-tight">
                <span className="font-medium text-foreground">
                  {property.propertyName || 'Unnamed Property'}
                </span>
                <span
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    property.leadTemperature === LeadTemperature.HOT && 'bg-error',
                    property.leadTemperature === LeadTemperature.WARM && 'bg-warning',
                    property.leadTemperature === LeadTemperature.COLD && 'bg-info',
                  )}
                  title={`${TEMPERATURE_LABELS[property.leadTemperature]} Lead`}
                />
                {property.wantsLoan && (
                  <span className="text-primary font-semibold text-xs shrink-0" title="Loan Required">
                    $
                  </span>
                )}
              </div>
              <div className="text-foreground-tertiary text-2xs leading-tight mt-0.5">
                {property.address || '-'} {property.customerName ? `• ${property.customerName}` : ''}{' '}
                • {PROPERTY_TYPE_LABELS[property.propertyType]}
              </div>
            </Link>
          );
        },
      },

      // Contact column with phone/WhatsApp icons
      {
        accessorKey: 'customerPhone',
        header: 'Contact',
        enableSorting: false,
        cell: ({ row }) => {
          const phone = row.original.customerPhone;
          if (!phone) {
            return <span className="text-foreground-tertiary">-</span>;
          }
          const whatsappNumber = formatPhoneForWhatsApp(phone);
          return (
            <div className="flex items-center gap-1">
              <span className="text-foreground-secondary text-sm">{phone}</span>
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
                  <WhatsAppIcon className="size-3.5 text-success" />
                </a>
              </div>
            </div>
          );
        },
      },

      // Consumer No.
      {
        accessorKey: 'consumerNumber',
        header: 'Consumer No.',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-2xs font-mono text-foreground-secondary">
            {row.original.consumerNumber || '-'}
          </span>
        ),
      },

      // Connection Type
      {
        accessorKey: 'connectionType',
        header: 'Connection',
        enableSorting: false,
        cell: ({ row }) => {
          const type = row.original.connectionType;
          if (!type) {
            return <span className="text-foreground-tertiary">-</span>;
          }
          return (
            <span className="text-sm text-foreground-secondary">
              {CONNECTION_TYPE_LABELS[type] ?? type}
            </span>
          );
        },
      },

      // Quote Status
      {
        accessorKey: 'latestQuoteStatus',
        header: 'Quote Status',
        enableSorting: false,
        cell: ({ row }) => {
          const status = row.original.latestQuoteStatus;
          if (!status) {
            return <span className="text-foreground-tertiary text-2xs">None</span>;
          }
          return (
            <span
              className={cn(
                'px-1.5 py-0.5 text-2xs font-medium rounded',
                QUOTE_STATUS_COLORS[status] || 'bg-muted text-foreground-secondary',
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          );
        },
      },

      // Created date (sortable)
      {
        accessorKey: 'createdAt',
        header: () => <SortableHeader field={PropertySortField.CREATED_AT} label="Added" />,
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

      // Created By
      {
        accessorKey: 'creatorName',
        header: 'Created By',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-foreground-secondary">
            {row.original.creatorName || '-'}
          </span>
        ),
      },

      // Actions
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
                  router.push(buildRoute(ROUTES.PROPERTIES.DETAIL, { id: row.original.id }))
                }
              >
                <Eye className="mr-2 size-icon-sm" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(buildRoute(ROUTES.PROPERTIES.EDIT, { id: row.original.id }))
                }
              >
                <Edit className="mr-2 size-icon-sm" />
                Edit Property
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(`${ROUTES.QUOTES.NEW}?propertyId=${row.original.id}`)
                }
              >
                <FileText className="mr-2 size-icon-sm" />
                Create Quote
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(`${ROUTES.FOLLOWUPS.NEW}?propertyId=${row.original.id}`)
                }
              >
                <Calendar className="mr-2 size-icon-sm" />
                Schedule Followup
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedProperty(row.original);
                  setLostModalOpen(true);
                }}
                className="text-error"
              >
                <AlertCircle className="mr-2 size-icon-sm" />
                Mark as Lost
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [router, SortableHeader],
  );

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <Typography variant="h2">All Properties</Typography>
            <Typography variant="body" color="muted" className="mt-1">
              Track properties and their lead status
            </Typography>
          </div>
          <Button size="sm" disabled>
            <Plus className="mr-2 size-icon-sm" />
            Add Property
          </Button>
        </div>
        <div className="bg-white rounded-lg border border-border-light p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-foreground-secondary">Loading properties...</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Error State
  // ============================================================================

  if (isError) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <Typography variant="h2">All Properties</Typography>
            <Typography variant="body" color="muted" className="mt-1">
              Track properties and their lead status
            </Typography>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-error/30 p-6">
          <div className="flex items-center gap-3 text-error">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load properties</p>
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

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <Typography variant="h2">All Properties</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Track properties and their lead status
          </Typography>
        </div>
        <Button size="sm" onClick={() => router.push(ROUTES.PROPERTIES.NEW)}>
          <Plus className="mr-2 size-icon-sm" />
          Add Property
        </Button>
      </div>

      {/* Search & Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Bar */}
        <div className="relative w-72">
          <Input
            type="text"
            placeholder="Search properties..."
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

        {/* Temperature Tabs */}
        <FilterTabs
          tabs={temperatureTabsWithCounts}
          value={temperatureFilter}
          onChange={(value) => {
            setTemperatureFilter(value);
            setPage(1);
          }}
          size="xs"
        />

        {/* Property Type Dropdown */}
        <Select
          value={propertyTypeFilter}
          onValueChange={(value) => {
            setPropertyTypeFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[130px] h-8 text-sm">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {PROPERTY_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
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
        {/* Bulk Actions Bar */}
        {selectedRows.length > 0 && (
          <div className="px-4 py-2 bg-primary/5 border-b border-border-light flex items-center gap-4">
            <span className="text-sm text-foreground-secondary">
              <strong className="text-foreground">{selectedRows.length}</strong> selected
            </span>
            {/* TODO: Phase 2 - Implement bulk temperature change */}
            <Button variant="ghost" size="sm" className="text-foreground-secondary" disabled>
              Change Temperature
            </Button>
            {/* TODO: Phase 2 - Implement bulk export */}
            <Button variant="ghost" size="sm" className="text-foreground-secondary" disabled>
              Export
            </Button>
            {/* TODO: Phase 2 - Implement bulk mark as lost */}
            <Button variant="ghost" size="sm" className="text-error" disabled>
              Mark as Lost
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

        {isFetching || properties.length > 0 ? (
          <>
            <DataTable
              columns={columns}
              data={properties}
              enableSearch={false}
              enablePagination={false}
              enableRowSelection
              onRowSelectionChange={handleRowSelectionChange}
              isLoading={isFetching}
            />

            {properties.length > 0 && (
              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                itemLabel="properties"
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
                title="No properties found"
                description={
                  debouncedSearch
                    ? 'No results match your search and filters. Try adjusting your criteria.'
                    : 'No properties match the selected filters. Try different filter options.'
                }
                action={{
                  label: 'Clear Filters',
                  onClick: clearAllFilters,
                }}
              />
            ) : (
              <EmptyState
                title="No properties yet"
                description="Get started by adding your first property"
                action={{
                  label: 'Add Property',
                  onClick: () => router.push(ROUTES.PROPERTIES.NEW),
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <MarkAsLostModal
        open={lostModalOpen}
        onOpenChange={setLostModalOpen}
        property={selectedProperty}
      />
    </div>
  );
}
