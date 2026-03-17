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

import { CreateSubsidyModal } from './create-subsidy-modal';
import { EditSubsidyModal } from './edit-subsidy-modal';
import { PROJECT_TYPE_TABS } from '../constants';

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
  Typography,
} from '@/components/ui';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import {
  useSubsidyConfigList,
  useSubsidyConfigMutations,
  type SubsidyConfigFilters,
  type SubsidyConfigItem,
} from '@/lib/hooks/resources';
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/utils';

export function SubsidyConfigListPage(): JSX.Element {
  const {
    items: configs,
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
  } = useSubsidyConfigList();

  const mutations = useSubsidyConfigMutations();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SubsidyConfigItem | null>(null);

  const deleteConfirmation = useDeleteConfirmation<SubsidyConfigItem>({
    mutation: mutations.remove,
    getId: (item) => item.id,
    entityName: 'subsidy rule',
  });

  const projectTypeTabValue = filters.projectType ?? 'all';

  const handleProjectTypeChange = useCallback(
    (value: string): void => {
      if (value === 'all') {
        setFilters({ projectType: undefined } as Partial<SubsidyConfigFilters>);
        return;
      }
      setFilters({ projectType: value as SubsidyConfigFilters['projectType'] });
    },
    [setFilters],
  );

  const handleClearAll = useCallback(() => {
    clearFilters();
    sorting.clearSort();
  }, [clearFilters, sorting]);

  const activeCounts = useMemo(() => {
    const map = new Map<string, number>();
    configs.forEach((item) => {
      if (!item.isActive) return;
      map.set(item.projectType, (map.get(item.projectType) ?? 0) + 1);
    });
    return map;
  }, [configs]);

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

  const columns: ColumnDef<SubsidyConfigItem>[] = useMemo(
    () => [
      {
        accessorKey: 'schemeName',
        header: () => <SortableHeader field="schemeName" label="Scheme" />,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium text-foreground leading-tight">
              {row.original.schemeName}
            </div>
            <div className="text-foreground-tertiary text-2xs leading-tight mt-0.5">
              {row.original.schemeCode || '—'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'schemeType',
        header: 'Type',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="secondary" size="xs" shape="rounded">
            {row.original.schemeType}
          </Badge>
        ),
      },
      {
        accessorKey: 'projectType',
        header: 'Project Type',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="secondary" size="xs" shape="rounded">
            {row.original.projectType}
          </Badge>
        ),
      },
      {
        accessorKey: 'maxSubsidyKw',
        header: () => <SortableHeader field="maxSubsidyKw" label="Max kW" />,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">{row.original.maxSubsidyKw} kW</span>
        ),
      },
      {
        accessorKey: 'maxSubsidyAmount',
        header: 'Max Amount',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">
            {row.original.maxSubsidyAmount
              ? formatCurrency(row.original.maxSubsidyAmount)
              : 'No cap'}
          </span>
        ),
      },
      {
        accessorKey: 'tiers',
        header: 'Tiers',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="secondary" size="xs" shape="rounded">
            {row.original.tiers.length} tiers
          </Badge>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => {
          const hasConflict = (activeCounts.get(row.original.projectType) ?? 0) > 1;
          return (
            <div className="flex items-center gap-2">
              <Badge
                variant={row.original.isActive ? 'success' : 'secondary'}
                size="xs"
                shape="pill"
              >
                {row.original.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {row.original.isActive && hasConflict && (
                <Badge variant="warning" size="xs" shape="pill">
                  Conflict
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'effectiveFrom',
        header: 'Effective',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="text-sm text-foreground-secondary">
              {row.original.effectiveFrom ? formatDate(row.original.effectiveFrom) : '—'}
            </div>
            <div className="text-2xs text-foreground-tertiary">
              {row.original.effectiveTo ? formatDate(row.original.effectiveTo) : 'No end date'}
            </div>
          </div>
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
                onClick={() => deleteConfirmation.requestDelete(row.original)}
              >
                <Trash2 className="mr-2 size-icon-sm" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [SortableHeader, activeCounts, deleteConfirmation],
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <Typography variant="h2">Subsidy Rules</Typography>
            <Typography variant="body" color="muted" className="mt-1">
              Manage subsidy schemes and tiered rates
            </Typography>
          </div>
          <Button size="sm" disabled>
            <Plus className="mr-2 size-icon-sm" />
            Add Rule
          </Button>
        </div>
        <div className="bg-white rounded-lg border border-border-light p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-foreground-secondary">Loading subsidy rules...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-5">
        <div>
          <Typography variant="h2">Subsidy Rules</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage subsidy schemes and tiered rates
          </Typography>
        </div>
        <div className="bg-white rounded-lg border border-error/30 p-6">
          <div className="flex items-center gap-3 text-error">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load subsidy rules</p>
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
          <Typography variant="h2">Subsidy Rules</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage subsidy schemes and tiered rates
          </Typography>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-icon-sm" />
          Add Rule
        </Button>
      </div>

      {activeCounts.size > 0 && Array.from(activeCounts.values()).some((count) => count > 1) && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
          Multiple active schemes exist for at least one project type. Only one active rule should
          be enabled per project type.
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Input
            type="text"
            placeholder="Search subsidy rules..."
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
          tabs={PROJECT_TYPE_TABS}
          value={projectTypeTabValue}
          onChange={handleProjectTypeChange}
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
        {isFetching || configs.length > 0 ? (
          <>
            <DataTable
              columns={columns}
              data={configs}
              enableSearch={false}
              enablePagination={false}
              isLoading={isFetching}
            />
            {configs.length > 0 && (
              <TablePagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={meta?.total ?? 0}
                itemLabel="rules"
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
                title="No subsidy rules found"
                description={
                  debouncedSearch
                    ? 'No results match your search and filters. Try adjusting your criteria.'
                    : 'No subsidy rules match the selected filters.'
                }
                action={{ label: 'Clear Filters', onClick: handleClearAll }}
              />
            ) : (
              <EmptyState
                title="No subsidy rules yet"
                description="Get started by adding your first subsidy scheme"
                action={{ label: 'Add Rule', onClick: () => setCreateOpen(true) }}
              />
            )}
          </div>
        )}
      </div>

      <CreateSubsidyModal open={createOpen} onOpenChange={setCreateOpen} />
      <EditSubsidyModal
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
            <DialogTitle>Delete Subsidy Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium">{deleteConfirmation.target?.schemeName}</span>? This
              action cannot be undone.
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
