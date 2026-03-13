'use client';

import { LeadTemperature, PropertySortField, PropertyType } from '@oneohm-epc/shared-types';
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
  Plus,
  Search,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo, type JSX } from 'react';

import { MarkAsLostModal } from './mark-as-lost-modal';

import {
  DataTable,
  EmptyState,
  FilterTabs,
  TablePagination,
  type FilterTab,
} from '@/components/shared';
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
} from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import {
  usePropertyList,
  usePropertyTemperatureStats,
  type PropertyItem,
} from '@/lib/hooks/resources';
import { cn, formatCurrency } from '@/lib/utils';

// ============================================================================
// Constants
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

const TEMPERATURE_TABS: FilterTab<string>[] = [
  { id: 'all', label: 'All' },
  { id: LeadTemperature.HOT, label: 'Hot' },
  { id: LeadTemperature.WARM, label: 'Warm' },
  { id: LeadTemperature.COLD, label: 'Cold' },
];

// ============================================================================
// Component
// ============================================================================

export function PropertyListPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  // FDAL hooks — handles pagination, filters, sorting, search, URL sync
  const {
    items: properties,
    meta,
    search,
    setSearch,
    clearSearch,
    filters,
    setFilter,
    clearFilters,
    hasActiveFilters,
    pagination,
    sorting,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = usePropertyList();

  const { stats } = usePropertyTemperatureStats();

  // Sync sidebar navigation: Next.js <Link> with ?leadTemperature=hot
  // does NOT trigger popstate, so FDAL's useQueryState won't pick it up.
  // IMPORTANT: Only depend on searchParamsString — NOT filters.leadTemperature.
  // FDAL writes URL via replaceState which doesn't update searchParams,
  // so this only fires on actual Next.js navigations (sidebar <Link> clicks).
  const searchParamsString = searchParams.toString();
  useEffect(() => {
    const urlTemp = searchParams.get('leadTemperature') ?? 'all';
    setFilter('leadTemperature', urlTemp);
  }, [searchParamsString]); // intentionally omit filters/setFilter to avoid reset loop

  // Local UI state (not part of FDAL)
  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null);
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<PropertyItem[]>([]);

  // Build tabs with counts
  const temperatureTabsWithCounts: FilterTab<string>[] = useMemo(() => {
    if (!stats) return TEMPERATURE_TABS;
    const s = stats as Record<string, number>;
    const total = (s.hot ?? 0) + (s.warm ?? 0) + (s.cold ?? 0);
    return [
      { id: 'all', label: 'All', count: total },
      { id: LeadTemperature.HOT, label: 'Hot', count: s.hot ?? 0 },
      { id: LeadTemperature.WARM, label: 'Warm', count: s.warm ?? 0 },
      { id: LeadTemperature.COLD, label: 'Cold', count: s.cold ?? 0 },
    ];
  }, [stats]);

  const handleRowSelectionChange = useCallback((rows: PropertyItem[]) => {
    setSelectedRows(rows);
  }, []);

  const clearSelection = (): void => {
    setSelectedRows([]);
  };

  // Sortable column header component
  const SortableHeader = useCallback(
    ({ field, label }: { field: string; label: string }) => {
      const isActive = sorting.sortBy === field;
      return (
        <button
          type="button"
          onClick={() => sorting.toggleSort(field)}
          className="flex items-center gap-1 font-semibold text-2xs uppercase tracking-wider hover:text-foreground transition-colors"
        >
          {label}
          {isActive ? (
            sorting.sortOrder === 'ASC' ? (
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
    [sorting],
  );

  // Table columns
  const columns: ColumnDef<PropertyItem>[] = useMemo(
    () => [
      {
        accessorKey: 'propertyCode',
        header: () => <SortableHeader field={PropertySortField.PROPERTY_NAME} label="Property" />,
        enableSorting: false,
        cell: ({ row }) => {
          const property = row.original;
          return (
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href={buildRoute(ROUTES.PROPERTIES.DETAIL, { id: property.id })}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {property.propertyCode || property.propertyName || 'Unnamed Property'}
                </Link>
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
                  <span
                    className="text-primary font-semibold text-xs shrink-0"
                    title="Loan Required"
                  >
                    $
                  </span>
                )}
              </div>
              <div className="text-foreground-tertiary text-2xs leading-tight mt-0.5">
                {property.address || '-'}{' '}
                {property.customerName ? `• ${property.customerName}` : ''} •{' '}
                {PROPERTY_TYPE_LABELS[property.propertyType]}
              </div>
            </div>
          );
        },
      },

      {
        accessorKey: 'latestQuoteSystemSizeKw',
        header: () => <SortableHeader field={PropertySortField.SYSTEM_SIZE} label="System Size" />,
        enableSorting: false,
        cell: ({ row }) => {
          const size = row.original.latestQuoteSystemSizeKw;
          if (size == null) {
            return <span className="text-foreground-tertiary">-</span>;
          }
          return (
            <span className="text-sm text-foreground-secondary font-medium">
              {Number(size).toFixed(2)} kW
            </span>
          );
        },
      },

      {
        accessorKey: 'latestQuoteFinalPrice',
        header: () => <SortableHeader field={PropertySortField.QUOTE_COST} label="Quote Cost" />,
        enableSorting: false,
        cell: ({ row }) => {
          const price = row.original.latestQuoteFinalPrice;
          if (price == null) {
            return <span className="text-foreground-tertiary">-</span>;
          }
          return (
            <span className="text-sm text-foreground-secondary font-medium">
              {formatCurrency(price)}
            </span>
          );
        },
      },

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
                  router.push(
                    `${ROUTES.QUOTES.NEW}?propertyId=${row.original.id}&customerId=${row.original.customerId}`,
                  )
                }
              >
                <FileText className="mr-2 size-icon-sm" />
                Create Quote
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`${ROUTES.FOLLOWUPS.NEW}?propertyId=${row.original.id}`)}
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
              <p className="text-sm text-foreground-secondary mt-1">{error?.message}</p>
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
            placeholder="Search by name, address, city, or consumer no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="size-icon-sm" />}
            className="h-8 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
            >
              <X className="size-3.5 text-foreground-tertiary" />
            </button>
          )}
          {isFetching && search && (
            <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-foreground-tertiary" />
          )}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border-light" />

        {/* Temperature Tabs */}
        <FilterTabs
          tabs={temperatureTabsWithCounts}
          value={filters.leadTemperature ?? 'all'}
          onChange={(value) => setFilter('leadTemperature', value)}
          size="xs"
        />

        {/* Property Type Dropdown */}
        <Select
          value={filters.propertyType ?? 'all'}
          onValueChange={(value) => setFilter('propertyType', value)}
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
            onClick={clearFilters}
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
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={meta?.total ?? 0}
                itemLabel="properties"
                variant="full"
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
              />
            )}
          </>
        ) : (
          <div className="p-8">
            {hasActiveFilters ? (
              <EmptyState
                title="No properties found"
                description={
                  search
                    ? 'No results match your search and filters. Try adjusting your criteria.'
                    : 'No properties match the selected filters. Try different filter options.'
                }
                action={{
                  label: 'Clear Filters',
                  onClick: clearFilters,
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
