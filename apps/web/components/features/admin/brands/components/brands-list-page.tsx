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
  Trash2,
  X,
} from 'lucide-react';
import { type JSX, useCallback, useMemo, useState } from 'react';

import { CreateBrandModal } from './create-brand-modal';
import { EditBrandModal } from './edit-brand-modal';
import { BRAND_STATUS_LABELS, BRAND_STATUS_TABS, BRAND_STATUS_VARIANTS } from '../constants';

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
  Typography,
} from '@/components/ui';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import {
  useBrandList,
  useBrandMutations,
  type Brand,
  type BrandFilters,
} from '@/lib/hooks/resources';
import { formatDate, getErrorMessage } from '@/lib/utils';

export function BrandsListPage(): JSX.Element {
  const {
    items: brands,
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
  } = useBrandList();

  const mutations = useBrandMutations();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Brand | null>(null);

  const deleteConfirmation = useDeleteConfirmation<Brand>({
    mutation: mutations.remove,
    getId: (brand) => brand.id,
    entityName: 'brand',
  });

  const statusTabValue =
    filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive';

  const handleStatusTabChange = useCallback(
    (value: string): void => {
      if (value === 'all') {
        setFilters({ isActive: undefined } as Partial<BrandFilters>);
        return;
      }
      setFilters({ isActive: value === 'active' } as Partial<BrandFilters>);
    },
    [setFilters],
  );

  const handleClearAll = useCallback(() => {
    clearFilters();
    sorting.clearSort();
  }, [clearFilters, sorting]);

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

  const columns: ColumnDef<Brand>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: () => <SortableHeader field="name" label="Brand" />,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium text-foreground leading-tight">{row.original.name}</div>
            <div className="text-foreground-tertiary text-2xs leading-tight mt-0.5 truncate">
              {row.original.manufacturerName || '—'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'website',
        header: 'Website',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.website ? (
            <a
              href={row.original.website}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {row.original.website}
            </a>
          ) : (
            <span className="text-foreground-tertiary">—</span>
          ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge
            variant={BRAND_STATUS_VARIANTS[row.original.isActive ? 'active' : 'inactive']}
            size="xs"
            shape="pill"
          >
            {BRAND_STATUS_LABELS[row.original.isActive ? 'active' : 'inactive']}
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
              <DropdownMenuItem onClick={() => setEditTarget(row.original)}>
                <Pencil className="mr-2 size-icon-sm" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-error"
                onClick={() => deleteConfirmation.requestDelete(row.original)}
              >
                <Trash2 className="mr-2 size-icon-sm" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [SortableHeader, deleteConfirmation],
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <Typography variant="h2">Brands</Typography>
            <Typography variant="body" color="muted" className="mt-1">
              Manage product brands and manufacturers
            </Typography>
          </div>
          <Button size="sm" disabled>
            <Plus className="mr-2 size-icon-sm" />
            Add Brand
          </Button>
        </div>
        <div className="bg-white rounded-lg border border-border-light p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-foreground-secondary">Loading brands...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-5">
        <div>
          <Typography variant="h2">Brands</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage product brands and manufacturers
          </Typography>
        </div>
        <div className="bg-white rounded-lg border border-error/30 p-6">
          <div className="flex items-center gap-3 text-error">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load brands</p>
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
          <Typography variant="h2">Brands</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage product brands and manufacturers
          </Typography>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-icon-sm" />
          Add Brand
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Input
            type="text"
            placeholder="Search brands..."
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
          tabs={BRAND_STATUS_TABS}
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
        {isFetching || brands.length > 0 ? (
          <>
            <DataTable
              columns={columns}
              data={brands}
              enableSearch={false}
              enablePagination={false}
              isLoading={isFetching}
            />
            {brands.length > 0 && (
              <TablePagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={meta?.total ?? 0}
                itemLabel="brands"
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
                title="No brands found"
                description={
                  debouncedSearch
                    ? 'No results match your search and filters. Try adjusting your criteria.'
                    : 'No brands match the selected filters. Try different options.'
                }
                action={{ label: 'Clear Filters', onClick: handleClearAll }}
              />
            ) : (
              <EmptyState
                title="No brands yet"
                description="Get started by adding your first brand"
                action={{ label: 'Add Brand', onClick: () => setCreateOpen(true) }}
              />
            )}
          </div>
        )}
      </div>

      <CreateBrandModal open={createOpen} onOpenChange={setCreateOpen} />
      <EditBrandModal
        open={!!editTarget}
        target={editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
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
            <DialogTitle>Delete Brand</DialogTitle>
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
