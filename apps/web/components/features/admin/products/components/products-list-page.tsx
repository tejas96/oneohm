'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Tags,
  X,
} from 'lucide-react';
import { type JSX, useCallback, useMemo, useState } from 'react';

import { CreateProductModal } from './create-product-modal';
import { EditProductModal } from './edit-product-modal';
import { ProductPricesDrawer } from './product-prices-drawer';
import { PRODUCT_STATUS_TABS, PRODUCT_STATUS_VARIANTS } from '../constants';

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
import { useDeleteConfirmation } from '@/lib/hooks/core';
import {
  useBrandList,
  useProductAdminMutations,
  useProductsAdmin,
  useProductTypeList,
  type ProductAdminFilters,
  type ProductAdminItem,
} from '@/lib/hooks/resources';
import { formatDate, getErrorMessage } from '@/lib/utils';

export function ProductsListPage(): JSX.Element {
  const {
    items: products,
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
  } = useProductsAdmin();

  const mutations = useProductAdminMutations();
  const productTypes = useProductTypeList({ syncToUrl: false, defaultPageSize: 200 });
  const brands = useBrandList({ syncToUrl: false, defaultPageSize: 200 });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProductAdminItem | null>(null);
  const [pricingTarget, setPricingTarget] = useState<ProductAdminItem | null>(null);

  const deleteConfirmation = useDeleteConfirmation<ProductAdminItem>({
    mutation: mutations.remove,
    getId: (item) => item.id,
    entityName: 'product',
  });

  const statusTabValue = filters.status ?? 'all';

  const handleStatusTabChange = useCallback(
    (value: string): void => {
      if (value === 'all') {
        setFilters({ status: undefined } as Partial<ProductAdminFilters>);
        return;
      }
      setFilters({ status: value as ProductAdminFilters['status'] });
    },
    [setFilters],
  );

  const handleClearAll = useCallback(() => {
    clearFilters();
    sorting.clearSort();
  }, [clearFilters, sorting]);

  const productTypeMap = useMemo(
    () => new Map(productTypes.items.map((item) => [item.id, item.name] as const)),
    [productTypes.items],
  );

  const brandMap = useMemo(
    () => new Map(brands.items.map((item) => [item.id, item.name] as const)),
    [brands.items],
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

  const columns: ColumnDef<ProductAdminItem>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: () => <SortableHeader field="name" label="Product" />,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium text-foreground leading-tight">{row.original.name}</div>
            <div className="text-foreground-tertiary text-2xs leading-tight mt-0.5 truncate">
              {row.original.code}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'productTypeId',
        header: 'Type',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="secondary" size="xs" shape="rounded">
            {productTypeMap.get(row.original.productTypeId) ?? '—'}
          </Badge>
        ),
      },
      {
        accessorKey: 'brandId',
        header: 'Brand',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">
            {row.original.brand?.name ?? brandMap.get(row.original.brandId) ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={PRODUCT_STATUS_VARIANTS[row.original.status]} size="xs" shape="pill">
            {row.original.status}
          </Badge>
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
              <DropdownMenuItem onClick={() => setPricingTarget(row.original)}>
                <Tags className="mr-2 size-icon-sm" /> Manage Pricing
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setEditTarget(row.original)}>
                <Pencil className="mr-2 size-icon-sm" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-error"
                onClick={() => deleteConfirmation.requestDelete(row.original)}
              >
                <X className="mr-2 size-icon-sm" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [SortableHeader, brandMap, deleteConfirmation, productTypeMap],
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <Typography variant="h2">Products</Typography>
            <Typography variant="body" color="muted" className="mt-1">
              Manage product models and specifications
            </Typography>
          </div>
          <Button size="sm" disabled>
            <Plus className="mr-2 size-icon-sm" />
            Add Product
          </Button>
        </div>
        <div className="bg-white rounded-lg shadow-e2 p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-foreground-secondary">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-5">
        <div>
          <Typography variant="h2">Products</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage product models and specifications
          </Typography>
        </div>
        <div className="bg-white rounded-lg border border-error/30 p-6">
          <div className="flex items-center gap-3 text-error">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load products</p>
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
          <Typography variant="h2">Products</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage product models and specifications
          </Typography>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-icon-sm" />
          Add Product
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Input
            type="text"
            placeholder="Search products..."
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
          tabs={PRODUCT_STATUS_TABS}
          value={statusTabValue}
          onChange={handleStatusTabChange}
          size="xs"
        />

        <Select
          value={filters.productTypeId ?? 'all'}
          onValueChange={(value) =>
            setFilters({
              productTypeId: value === 'all' ? undefined : value,
            } as Partial<ProductAdminFilters>)
          }
        >
          <SelectTrigger className="h-8 text-xs w-[180px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {productTypes.items.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.brandId ?? 'all'}
          onValueChange={(value) =>
            setFilters({
              brandId: value === 'all' ? undefined : value,
            } as Partial<ProductAdminFilters>)
          }
        >
          <SelectTrigger className="h-8 text-xs w-[180px]">
            <SelectValue placeholder="All brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.items.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

      <div className="bg-white rounded-lg shadow-e2 overflow-hidden">
        {isFetching || products.length > 0 ? (
          <>
            <DataTable
              columns={columns}
              data={products}
              enableSearch={false}
              enablePagination={false}
              isLoading={isFetching}
            />
            {products.length > 0 && (
              <TablePagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={meta?.total ?? 0}
                itemLabel="products"
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
                title="No products found"
                description={
                  debouncedSearch
                    ? 'No results match your search and filters. Try adjusting your criteria.'
                    : 'No products match the selected filters.'
                }
                action={{ label: 'Clear Filters', onClick: handleClearAll }}
              />
            ) : (
              <EmptyState
                title="No products yet"
                description="Get started by adding your first product"
                action={{ label: 'Add Product', onClick: () => setCreateOpen(true) }}
              />
            )}
          </div>
        )}
      </div>

      {/* TODO: Add active price indicator once backend supports batch price status. */}

      <CreateProductModal open={createOpen} onOpenChange={setCreateOpen} />
      <EditProductModal
        open={!!editTarget}
        target={editTarget}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditTarget(null);
        }}
      />
      <ProductPricesDrawer
        open={!!pricingTarget}
        product={pricingTarget}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPricingTarget(null);
        }}
      />

      <Dialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) => {
          if (!open) deleteConfirmation.cancel();
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium">{deleteConfirmation.target?.name}</span>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={deleteConfirmation.cancel}
              disabled={deleteConfirmation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deleteConfirmation.confirm()}
              disabled={deleteConfirmation.isPending}
            >
              {deleteConfirmation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
