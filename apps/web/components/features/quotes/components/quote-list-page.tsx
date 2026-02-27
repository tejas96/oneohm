'use client';

import { QuoteSortField, QuoteStatus, SortOrder } from '@oneohm-epc/shared-types';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Copy,
  Download,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback, type JSX } from 'react';

import {
  QUOTE_FILTER_TABS,
  DEFAULT_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
} from '../constants';
import {
  useQuotes,
  useQuoteStatusCounts,
  useDeleteQuote,
  type QuoteListItem,
} from '../hooks';
import { QuoteStatusDropdown } from './quote-status-dropdown';

import {
  DataTable,
  EmptyState,
  FilterTabs,
  StatsCard,
  TablePagination,
  type FilterTab,
} from '@/components/shared';
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Typography,
  showToast,
} from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useDebounce } from '@/lib/hooks';
import { getErrorMessage, getInitials, formatCurrency, formatDate } from '@/lib/utils';

// ============================================================================
// Helper Functions
// ============================================================================

function getValidSortField(value: string | null): QuoteSortField {
  const validFields = Object.values(QuoteSortField);
  return validFields.includes(value as QuoteSortField)
    ? (value as QuoteSortField)
    : QuoteSortField.CREATED_AT;
}

function getValidSortOrder(value: string | null): SortOrder {
  return value === SortOrder.ASC ? SortOrder.ASC : SortOrder.DESC;
}

// ============================================================================
// Component
// ============================================================================

export function QuoteListPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ---------------------------------------------------------------------------
  // URL State
  // ---------------------------------------------------------------------------

  const initialPage = Number(searchParams.get('page')) || 1;
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = searchParams.get('status') || 'all';
  const initialSortBy = getValidSortField(searchParams.get('sortBy'));
  const initialSortOrder = getValidSortOrder(searchParams.get('sortOrder'));

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [sortBy, setSortBy] = useState<QuoteSortField>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);

  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);
  const debouncedStatusFilter = useDebounce(statusFilter, SEARCH_DEBOUNCE_MS);

  // Sync state from URL when external navigation occurs (e.g. sidebar link clicks).
  // window.history.replaceState (used internally) does NOT update searchParams,
  // so this only fires on actual Next.js navigations, avoiding infinite loops.
  const searchParamsString = searchParams.toString();
  useEffect(() => {
    setPage(Number(searchParams.get('page')) || 1);
    setSearchInput(searchParams.get('search') || '');
    setStatusFilter(searchParams.get('status') || 'all');
    setSortBy(getValidSortField(searchParams.get('sortBy')));
    setSortOrder(getValidSortOrder(searchParams.get('sortOrder')));
  }, [searchParamsString]);

  // Reset page on filter/search change (skip on initial mount)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setPage(1);
  }, [debouncedSearch, debouncedStatusFilter]);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (sortBy !== QuoteSortField.CREATED_AT) params.set('sortBy', sortBy);
    if (sortOrder !== SortOrder.DESC) params.set('sortOrder', sortOrder);

    const query = params.toString();
    const newUrl = query ? `?${query}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [page, debouncedSearch, statusFilter, sortBy, sortOrder]);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const {
    data: quoteData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuotes({
    page,
    limit: pageSize,
    search: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
    status: debouncedStatusFilter !== 'all' ? (debouncedStatusFilter as QuoteStatus) : undefined,
    sortBy,
    sortOrder,
  });

  const { data: statusCounts } = useQuoteStatusCounts();

  const deleteQuoteMutation = useDeleteQuote();

  // Derived values
  const quotes = quoteData?.data ?? [];
  const totalItems = quoteData?.meta.total ?? 0;
  const totalPages = quoteData?.meta.totalPages ?? 1;

  const hasActiveFilters =
    debouncedStatusFilter !== 'all' ||
    debouncedSearch.length >= 2 ||
    sortBy !== QuoteSortField.CREATED_AT ||
    sortOrder !== SortOrder.DESC;

  // ---------------------------------------------------------------------------
  // Filter tabs with counts
  // ---------------------------------------------------------------------------

  const filterTabsWithCounts: FilterTab<string>[] = useMemo(() => {
    if (!statusCounts) return QUOTE_FILTER_TABS;
    return [
      { id: 'all', label: 'All', count: statusCounts.total },
      { id: QuoteStatus.DRAFT, label: 'Draft', count: statusCounts.draft },
      { id: QuoteStatus.SENT, label: 'Sent', count: statusCounts.sent },
      { id: QuoteStatus.VIEWED, label: 'Viewed', count: statusCounts.viewed },
      { id: QuoteStatus.ACCEPTED, label: 'Accepted', count: statusCounts.accepted },
      { id: QuoteStatus.REJECTED, label: 'Rejected', count: statusCounts.rejected },
    ];
  }, [statusCounts]);

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const pendingCount =
    (statusCounts?.draft ?? 0) + (statusCounts?.sent ?? 0) + (statusCounts?.viewed ?? 0);
  const conversionRate =
    statusCounts && statusCounts.total > 0
      ? Math.round((statusCounts.accepted / statusCounts.total) * 100)
      : 0;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePageSizeChange = (newSize: number): void => {
    setPageSize(newSize);
    setPage(1);
  };

  const clearSearch = (): void => {
    setSearchInput('');
    setPage(1);
  };

  const clearAllFilters = (): void => {
    setStatusFilter('all');
    setSearchInput('');
    setSortBy(QuoteSortField.CREATED_AT);
    setSortOrder(SortOrder.DESC);
    setPage(1);
  };

  const handleDeleteQuote = useCallback(
    (quoteId: string) => {
      deleteQuoteMutation.mutate(quoteId, {
        onSuccess: () => showToast.success('Quote deleted'),
        onError: (err) => showToast.error(getErrorMessage(err)),
      });
    },
    [deleteQuoteMutation],
  );

  // ---------------------------------------------------------------------------
  // Sorting
  // ---------------------------------------------------------------------------

  const handleSort = useCallback(
    (field: QuoteSortField) => {
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

  const SortableHeader = useCallback(
    ({ field, label }: { field: QuoteSortField; label: string }) => {
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

  // ---------------------------------------------------------------------------
  // Table Columns
  // ---------------------------------------------------------------------------

  const columns: ColumnDef<QuoteListItem>[] = useMemo(
    () => [
      {
        accessorKey: 'quoteNumber',
        header: 'Quote #',
        cell: ({ row }) => (
          <div>
            <Link
              href={buildRoute(ROUTES.QUOTES.DETAIL, { id: row.original.id })}
              className="text-sm font-medium text-primary hover:underline"
            >
              {row.original.quoteNumber}
            </Link>
            {row.original.currentVersion > 1 && (
              <p className="text-2xs text-foreground-tertiary">v{row.original.currentVersion}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'customerName',
        header: () => <SortableHeader field={QuoteSortField.CUSTOMER_NAME} label="Customer" />,
        enableSorting: false,
        cell: ({ row }) => {
          const name = row.original.customerName || 'Unknown';
          return (
            <div className="flex items-center gap-2.5">
              <Avatar size="sm">
                <AvatarFallback size="sm" name={name}>
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <Link
                href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: row.original.customerId })}
                className="font-medium text-foreground text-sm hover:text-primary transition-colors leading-tight"
              >
                {name}
              </Link>
            </div>
          );
        },
      },
      {
        accessorKey: 'propertyName',
        header: 'Property',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-foreground-secondary">
            {row.original.propertyName || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'systemSizeKw',
        header: () => <SortableHeader field={QuoteSortField.SYSTEM_SIZE} label="System" />,
        enableSorting: false,
        cell: ({ row }) => <span className="text-sm">{row.original.systemSizeKw} kW</span>,
      },
      {
        accessorKey: 'effectivePrice',
        header: () => <SortableHeader field={QuoteSortField.EFFECTIVE_PRICE} label="Value" />,
        enableSorting: false,
        cell: ({ row }) => {
          const effective = row.original.effectivePrice;
          const finalPrice = row.original.finalPrice;
          return (
            <div>
              <p className="text-sm font-medium">
                {effective != null ? formatCurrency(effective) : '-'}
              </p>
              {effective != null && finalPrice != null && effective < finalPrice && (
                <p className="text-2xs text-foreground-tertiary line-through">
                  {formatCurrency(finalPrice)}
                </p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <QuoteStatusDropdown
            quoteId={row.original.id}
            status={row.original.status}
          />
        ),
      },
      {
        accessorKey: 'createdAt',
        header: () => <SortableHeader field={QuoteSortField.CREATED_AT} label="Created" />,
        enableSorting: false,
        cell: ({ row }) => {
          const date = row.original.createdAt;
          if (!date) return <span className="text-foreground-tertiary">-</span>;
          return (
            <span className="text-sm text-foreground-secondary">{formatDate(date, 'medium')}</span>
          );
        },
      },
      {
        accessorKey: 'validUntil',
        header: () => <SortableHeader field={QuoteSortField.VALID_UNTIL} label="Valid Until" />,
        enableSorting: false,
        cell: ({ row }) => {
          const validUntil = row.original.validUntil;
          if (!validUntil) return <span className="text-foreground-tertiary">-</span>;
          const isExpired = new Date(validUntil) < new Date();
          return isExpired ? (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="size-3.5 text-error" />
              <span className="text-sm font-medium text-error">
                {formatDate(validUntil, 'medium')}
              </span>
            </div>
          ) : (
            <span className="text-sm text-foreground-secondary">
              {formatDate(validUntil, 'medium')}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const quote = row.original;
          const isAccepted = quote.status === QuoteStatus.ACCEPTED;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="size-8 p-0">
                  <MoreHorizontal className="size-icon-sm" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => router.push(buildRoute(ROUTES.QUOTES.DETAIL, { id: quote.id }))}
                >
                  <Eye className="mr-2 size-icon-sm" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => showToast.info('Coming Soon')}>
                  <Copy className="mr-2 size-icon-sm" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => showToast.info('Coming Soon')}>
                  <Download className="mr-2 size-icon-sm" />
                  Download PDF
                </DropdownMenuItem>
                {!isAccepted && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDeleteQuote(quote.id)}
                      className="text-error"
                    >
                      <Trash2 className="mr-2 size-icon-sm" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [router, handleDeleteQuote, SortableHeader],
  );

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <Typography variant="h2">Quotations</Typography>
            <Typography variant="body" color="muted" className="mt-1">
              Create and manage customer quotations
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <Upload className="mr-2 size-icon-sm" />
              Export
            </Button>
            <Button size="sm" disabled>
              <Plus className="mr-2 size-icon-sm" />
              Create Quote
            </Button>
          </div>
        </div>
        <div className="bg-background rounded-lg border border-border-light p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-foreground-secondary">Loading quotes...</p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error State
  // ---------------------------------------------------------------------------

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <Typography variant="h2">Quotations</Typography>
            <Typography variant="body" color="muted" className="mt-1">
              Create and manage customer quotations
            </Typography>
          </div>
        </div>
        <div className="bg-background rounded-lg border border-error/30 p-6">
          <div className="flex items-center gap-3 text-error">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load quotes</p>
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

  // ---------------------------------------------------------------------------
  // Main Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <Typography variant="h2">Quotations</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Create and manage customer quotations
          </Typography>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => showToast.info('Export coming soon')}>
            <Upload className="mr-2 size-icon-sm" />
            Export
          </Button>
          <Button size="sm" onClick={() => router.push(ROUTES.QUOTES.NEW)}>
            <Plus className="mr-2 size-icon-sm" />
            Create Quote
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Input
            type="text"
            placeholder="Search by quote #, customer..."
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

        <div className="h-5 w-px bg-border-light" />

        <FilterTabs
          tabs={filterTabsWithCounts}
          value={statusFilter}
          onChange={setStatusFilter}
          size="xs"
        />

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
      <div className="bg-background rounded-lg border border-border-light overflow-hidden">
        {isFetching || quotes.length > 0 ? (
          <>
            <DataTable
              columns={columns}
              data={quotes}
              enableSearch={false}
              enablePagination={false}
              enableRowSelection
              isLoading={isFetching}
            />

            {quotes.length > 0 && (
              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                itemLabel="quotes"
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
                title="No quotes found"
                description={
                  debouncedSearch
                    ? 'No results match your search and filters. Try adjusting your criteria.'
                    : 'No quotes match the selected filters. Try different filter options.'
                }
                action={{
                  label: 'Clear Filters',
                  onClick: clearAllFilters,
                }}
              />
            ) : (
              <EmptyState
                icon={<FileText className="size-icon-lg" />}
                title="No quotes yet"
                description="Get started by creating your first quote"
                action={{
                  label: 'Create Quote',
                  onClick: () => router.push(ROUTES.QUOTES.NEW),
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
