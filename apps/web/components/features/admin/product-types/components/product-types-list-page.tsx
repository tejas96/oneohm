'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { type JSX, useCallback, useMemo, useState } from 'react';

import { CreateProductTypeModal } from './create-product-type-modal';
import { EditProductTypeModal } from './edit-product-type-modal';
import { PRODUCT_TYPE_STATUS_TABS } from '../constants';

import { DataTable, EmptyState, FilterTabs, TablePagination } from '@/components/shared';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Switch,
  Typography,
} from '@/components/ui';
import {
  useProductTypeList,
  useProductTypeMutations,
  type ProductType,
  type ProductTypeFilters,
} from '@/lib/hooks/resources';
import { formatDate, getErrorMessage } from '@/lib/utils';

export function ProductTypesListPage(): JSX.Element {
  const {
    items: productTypes,
    meta,
    search,
    setSearch,
    debouncedSearch,
    clearSearch,
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
    pagination,
    sorting,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useProductTypeList();

  const mutations = useProductTypeMutations();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProductType | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [disableTarget, setDisableTarget] = useState<ProductType | null>(null);
  const [isDisabling, setIsDisabling] = useState(false);

  const statusTabValue =
    filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive';

  const handleStatusTabChange = useCallback(
    (value: string): void => {
      if (value === 'all') {
        setFilters({ isActive: undefined } as Partial<ProductTypeFilters>);
        return;
      }
      setFilters({ isActive: value === 'active' } as Partial<ProductTypeFilters>);
    },
    [setFilters],
  );

  const handleClearAll = useCallback(() => {
    clearFilters();
    sorting.clearSort();
  }, [clearFilters, sorting]);

  const handleToggleActive = useCallback(
    async (item: ProductType, nextValue: boolean) => {
      setTogglingId(item.id);
      try {
        await mutations.update.mutateAsync({
          id: item.id,
          data: { isActive: nextValue },
        });
      } catch {
        // Toast handled by mutation config
      } finally {
        setTogglingId(null);
      }
    },
    [mutations.update],
  );

  const SortableHeader = useCallback(
    ({ field, label }: { field: string; label: string }): JSX.Element => {
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

  const columns: ColumnDef<ProductType>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: () => <SortableHeader field="name" label="Type" />,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium text-foreground leading-tight">{row.original.name}</div>
            <div className="text-foreground-tertiary text-2xs leading-tight mt-0.5">
              {row.original.code}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'defaultPricingBasis',
        header: 'Pricing Basis',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="secondary" size="xs" shape="rounded">
            {row.original.defaultPricingBasis}
          </Badge>
        ),
      },
      {
        accessorKey: 'defaultUnitOfMeasure',
        header: 'Unit',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="secondary" size="xs" shape="rounded">
            {row.original.defaultUnitOfMeasure}
          </Badge>
        ),
      },
      {
        accessorKey: 'defaultGstRate',
        header: () => <SortableHeader field="defaultGstRate" label="GST" />,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">{row.original.defaultGstRate}%</span>
        ),
      },
      {
        accessorKey: 'sortOrder',
        header: () => <SortableHeader field="sortOrder" label="Order" />,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">{row.original.sortOrder}</span>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Active',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={row.original.isActive}
              disabled={togglingId === row.original.id}
              onCheckedChange={(value) => void handleToggleActive(row.original, value)}
            />
            {togglingId === row.original.id && (
              <Loader2 className="size-3.5 animate-spin text-foreground-tertiary" />
            )}
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: () => <SortableHeader field="createdAt" label="Created" />,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">
            {formatDate(row.original.createdAt)}
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
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditTarget(row.original)}>
                <Pencil className="mr-2 size-icon-sm" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-error"
                onClick={() => setDisableTarget(row.original)}
              >
                <Ban className="mr-2 size-icon-sm" /> Disable
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [SortableHeader, handleToggleActive, togglingId],
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <Typography variant="h2">Product Types</Typography>
            <Typography variant="body" color="muted" className="mt-1">
              Define product categories and pricing defaults
            </Typography>
          </div>
          <Button size="sm" disabled>
            <Plus className="mr-2 size-icon-sm" />
            Add Product Type
          </Button>
        </div>
        <div className="bg-white rounded-lg border border-border-light p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-foreground-secondary">Loading product types...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-5">
        <div>
          <Typography variant="h2">Product Types</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Define product categories and pricing defaults
          </Typography>
        </div>
        <div className="bg-white rounded-lg border border-error/30 p-6">
          <div className="flex items-center gap-3 text-error">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load product types</p>
              <p className="text-sm text-foreground-secondary mt-1">{getErrorMessage(error)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <Typography variant="h2">Product Types</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Define product categories and pricing defaults
          </Typography>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-icon-sm" />
          Add Product Type
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Input
            type="text"
            placeholder="Search product types..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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
          {isFetching && debouncedSearch && (
            <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-foreground-tertiary" />
          )}
        </div>
        <div className="h-5 w-px bg-border-light" />
        <FilterTabs
          tabs={PRODUCT_TYPE_STATUS_TABS}
          value={statusTabValue}
          onChange={handleStatusTabChange}
          size="xs"
        />
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-foreground-secondary h-8"
          >
            <X className="mr-1 size-3" /> Clear
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-border-light overflow-hidden">
        {isFetching || productTypes.length > 0 ? (
          <>
            <DataTable
              columns={columns}
              data={productTypes}
              enableSearch={false}
              enablePagination={false}
              isLoading={isFetching}
            />
            {productTypes.length > 0 && (
              <TablePagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={meta?.total ?? 0}
                itemLabel="product types"
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
                title="No product types found"
                description={
                  debouncedSearch
                    ? 'No results match your search and filters. Try adjusting your criteria.'
                    : 'No product types match the selected filters.'
                }
                action={{ label: 'Clear Filters', onClick: handleClearAll }}
              />
            ) : (
              <EmptyState
                title="No product types yet"
                description="Get started by adding your first product type"
                action={{ label: 'Add Product Type', onClick: () => setCreateOpen(true) }}
              />
            )}
          </div>
        )}
      </div>

      <CreateProductTypeModal open={createOpen} onOpenChange={setCreateOpen} />
      <EditProductTypeModal
        open={!!editTarget}
        target={editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      />

      <Dialog
        open={!!disableTarget}
        onOpenChange={(open) => {
          if (!open) setDisableTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Disable Product Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to disable{' '}
              <span className="font-medium">{disableTarget?.name}</span>? It will be hidden from
              product selection.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableTarget(null)} disabled={isDisabling}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!disableTarget) return;
                setIsDisabling(true);
                void mutations.update
                  .mutateAsync({ id: disableTarget.id, data: { isActive: false } })
                  .finally(() => {
                    setIsDisabling(false);
                    setDisableTarget(null);
                  });
              }}
              disabled={isDisabling}
            >
              {isDisabling ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                'Disable'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
