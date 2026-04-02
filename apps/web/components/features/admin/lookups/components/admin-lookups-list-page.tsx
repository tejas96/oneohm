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
  Power,
  PowerOff,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { type JSX, useCallback, useMemo, useState } from 'react';

import { AdminLookupFormModal } from './admin-lookup-form-modal';
import { LOOKUP_SCOPE_TYPE_LABELS, LOOKUP_SCOPE_TYPE_TABS, LOOKUP_STATUS_TABS } from '../constants';

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
  Input,
  Typography,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import {
  useLookups,
  useLookupMutations,
  type Lookup,
  type LookupFilters,
} from '@/lib/hooks/resources';
import { formatDate, getErrorMessage } from '@/lib/utils';

export function AdminLookupsListPage(): JSX.Element {
  const {
    items: lookups,
    meta,
    search,
    setSearch,
    debouncedSearch,
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
  } = useLookups();

  const mutations = useLookupMutations();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Lookup | null>(null);

  const deleteConfirmation = useDeleteConfirmation<Lookup>({
    mutation: mutations.remove,
    getId: (lookup) => lookup.id,
    entityName: 'lookup',
  });

  // ── Filter handlers ────────────────────────────────────────

  const activeTab = filters.isActive ?? 'all';
  const scopeTab = (filters as LookupFilters).scopeType ?? 'all';

  const handleStatusTabChange = useCallback(
    (value: string): void => {
      setFilter('isActive', value === 'all' ? undefined : value);
    },
    [setFilter],
  );

  const handleScopeTabChange = useCallback(
    (value: string): void => {
      setFilter('scopeType', value === 'all' ? undefined : value);
    },
    [setFilter],
  );

  const handleClearAll = useCallback(() => {
    clearFilters();
    sorting.clearSort();
  }, [clearFilters, sorting]);

  // ── Inline toggle ──────────────────────────────────────────

  const handleToggleActive = useCallback(
    (lookup: Lookup): void => {
      void mutations.action('toggle-active', lookup.id, { isActive: !lookup.isActive });
    },
    [mutations],
  );

  // ── Sortable header ────────────────────────────────────────

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

  // ── Columns ────────────────────────────────────────────────

  const columns: ColumnDef<Lookup>[] = useMemo(
    () => [
      {
        accessorKey: 'typeCode',
        header: () => <SortableHeader field="typeCode" label="Type Code" />,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground-secondary">
            {row.original.typeCode}
          </span>
        ),
      },
      {
        accessorKey: 'code',
        header: () => <SortableHeader field="code" label="Code" />,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-foreground-secondary">{row.original.code}</span>
        ),
      },
      {
        accessorKey: 'label',
        header: () => <SortableHeader field="label" label="Label" />,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium text-foreground leading-tight">{row.original.label}</div>
            {row.original.value && row.original.value !== row.original.code && (
              <div className="text-foreground-tertiary text-2xs leading-tight mt-0.5 truncate">
                {row.original.value}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'scopeType',
        header: 'Scope',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="secondary" size="xs" shape="rounded">
            {LOOKUP_SCOPE_TYPE_LABELS[row.original.scopeType] ?? row.original.scopeType}
          </Badge>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Active',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? 'success' : 'secondary'} size="xs" shape="pill">
            {row.original.isActive ? 'Active' : 'Inactive'}
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
              <DropdownMenuItem onClick={() => handleToggleActive(row.original)}>
                {row.original.isActive ? (
                  <>
                    <PowerOff className="mr-2 size-icon-sm" /> Deactivate
                  </>
                ) : (
                  <>
                    <Power className="mr-2 size-icon-sm" /> Activate
                  </>
                )}
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
    [SortableHeader, deleteConfirmation, handleToggleActive],
  );

  // ── Loading state ──────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <Typography variant="h2">Lookups</Typography>
            <Typography variant="body" color="muted" className="mt-1">
              Manage dropdown options, status values, and configuration entries
            </Typography>
          </div>
          <Button size="sm" disabled>
            <Plus className="mr-2 size-icon-sm" />
            Add Lookup
          </Button>
        </div>
        <div className="bg-white rounded-lg border border-border-light p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-foreground-secondary">Loading lookups...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────

  if (isError) {
    return (
      <div className="space-y-5">
        <div>
          <Typography variant="h2">Lookups</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage dropdown options, status values, and configuration entries
          </Typography>
        </div>
        <div className="bg-white rounded-lg border border-error/30 p-6">
          <div className="flex items-center gap-3 text-error">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load lookups</p>
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

  // ── Main render ────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <Typography variant="h2">Lookups</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage dropdown options, status values, and configuration entries
          </Typography>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-icon-sm" />
          Add Lookup
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Input
            type="text"
            placeholder="Search lookups..."
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
          tabs={LOOKUP_STATUS_TABS}
          value={activeTab}
          onChange={handleStatusTabChange}
          size="xs"
        />

        <div className="h-5 w-px bg-border-light" />

        <FilterTabs
          tabs={LOOKUP_SCOPE_TYPE_TABS}
          value={scopeTab}
          onChange={handleScopeTabChange}
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
        {isFetching || lookups.length > 0 ? (
          <>
            <DataTable
              columns={columns}
              data={lookups}
              enableSearch={false}
              enablePagination={false}
              isLoading={isFetching}
            />
            {lookups.length > 0 && (
              <TablePagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={meta?.total ?? 0}
                itemLabel="lookups"
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
                title="No lookups found"
                description={
                  debouncedSearch
                    ? 'No results match your search and filters. Try adjusting your criteria.'
                    : 'No lookups match the selected filters. Try different options.'
                }
                action={{ label: 'Clear Filters', onClick: handleClearAll }}
              />
            ) : (
              <EmptyState
                title="No lookups yet"
                description="Get started by adding your first lookup entry"
                action={{ label: 'Add Lookup', onClick: () => setCreateOpen(true) }}
              />
            )}
          </div>
        )}
      </div>

      <AdminLookupFormModal
        open={createOpen}
        lookup={null}
        onOpenChange={(open) => {
          if (!open) setCreateOpen(false);
        }}
      />

      <AdminLookupFormModal
        open={!!editTarget}
        lookup={editTarget}
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
            <DialogTitle>Delete Lookup</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium">{deleteConfirmation.target?.label}</span>? This action
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
