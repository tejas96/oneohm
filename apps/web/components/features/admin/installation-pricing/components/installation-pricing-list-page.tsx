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

import { CreatePricingTierModal } from './create-pricing-tier-modal';
import { EditPricingTierModal } from './edit-pricing-tier-modal';
import { TIER_STATUS_TABS } from '../constants';

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
  useInstallationPricing,
  useInstallationPricingMutations,
  type InstallationPricingFilters,
  type InstallationPricingItem,
} from '@/lib/hooks/resources';
import { formatCurrency, formatDate, getErrorMessage } from '@/lib/utils';

function getTierLabel(item: InstallationPricingItem): string {
  if (item.maxSystemSizeKw != null && Number(item.maxSystemSizeKw) === Number(item.minSystemSizeKw)) {
    return `${item.minSystemSizeKw} kW`;
  }
  const max = item.maxSystemSizeKw == null ? '∞' : item.maxSystemSizeKw;
  return `${item.minSystemSizeKw}–${max} kW`;
}

function calculateFixedTotal(item: InstallationPricingItem): number {
  const excluded = new Set(['profitability_percent', 'variable_floor']);
  return Object.entries(item.costComponents ?? {}).reduce((acc, [key, value]) => {
    if (excluded.has(key)) return acc;
    if (typeof value === 'number') return acc + value;
    return acc;
  }, 0);
}

function findCoverageGaps(items: InstallationPricingItem[]): string[] {
  const active = items.filter((item) => item.isActive);
  if (active.length === 0) return ['No active tiers'];

  const sorted = [...active].sort((a, b) => a.minSystemSizeKw - b.minSystemSizeKw);
  const gaps: string[] = [];

  let currentMax: number | null = sorted[0]?.minSystemSizeKw ?? 0;
  if (sorted[0] && sorted[0].minSystemSizeKw > 0) {
    gaps.push(`0–${sorted[0].minSystemSizeKw} kW`);
  }

  for (const tier of sorted) {
    if (currentMax != null && tier.minSystemSizeKw > currentMax) {
      gaps.push(`${currentMax}–${tier.minSystemSizeKw} kW`);
    }
    currentMax = tier.maxSystemSizeKw ?? null;
    if (currentMax == null) return gaps;
  }

  if (currentMax != null) {
    gaps.push(`${currentMax}+ kW`);
  }

  return gaps;
}

export function InstallationPricingListPage(): JSX.Element {
  const {
    items: tiers,
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
  } = useInstallationPricing();

  const mutations = useInstallationPricingMutations();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InstallationPricingItem | null>(null);

  const deleteConfirmation = useDeleteConfirmation<InstallationPricingItem>({
    mutation: mutations.remove,
    getId: (item) => item.id,
    entityName: 'pricing tier',
  });

  const statusTabValue =
    filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive';

  const handleStatusTabChange = useCallback(
    (value: string): void => {
      if (value === 'all') {
        setFilters({ isActive: undefined } as Partial<InstallationPricingFilters>);
        return;
      }
      setFilters({ isActive: value === 'active' } as Partial<InstallationPricingFilters>);
    },
    [setFilters],
  );

  const handleClearAll = useCallback(() => {
    clearFilters();
    sorting.clearSort();
  }, [clearFilters, sorting]);

  const gapWarnings = useMemo(() => findCoverageGaps(tiers), [tiers]);

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

  const columns: ColumnDef<InstallationPricingItem>[] = useMemo(
    () => [
      {
        accessorKey: 'range',
        header: () => <SortableHeader field="minSystemSizeKw" label="Tier Range" />,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">{getTierLabel(row.original)}</span>
        ),
      },
      {
        accessorKey: 'costComponents',
        header: 'Base Cost',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">
            {formatCurrency(calculateFixedTotal(row.original))}
          </span>
        ),
      },
      {
        accessorKey: 'transportRatePerKm',
        header: 'Transport',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">
            {formatCurrency(row.original.transportRatePerKm)} / km
          </span>
        ),
      },
      {
        accessorKey: 'floorIncrementPercent',
        header: 'Floor %',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">
            {row.original.floorIncrementPercent}%
          </span>
        ),
      },
      {
        accessorKey: 'gstRate',
        header: 'GST',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">{row.original.gstRate}%</span>
        ),
      },
      {
        accessorKey: 'effectiveFrom',
        header: 'Effective',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="text-sm text-foreground-secondary">
              {formatDate(row.original.effectiveFrom)}
            </div>
            <div className="text-2xs text-foreground-tertiary">
              {row.original.effectiveTo ? formatDate(row.original.effectiveTo) : 'No end date'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? 'success' : 'secondary'} size="xs" shape="pill">
            {row.original.isActive ? 'Active' : 'Inactive'}
          </Badge>
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
    [SortableHeader, deleteConfirmation],
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <Typography variant="h2">Installation Pricing</Typography>
            <Typography variant="body" color="muted" className="mt-1">
              Manage installation tiers by system size
            </Typography>
          </div>
          <Button size="sm" disabled>
            <Plus className="mr-2 size-icon-sm" />
            Add Tier
          </Button>
        </div>
        <div className="bg-white rounded-lg border border-border-light p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-foreground-secondary">Loading tiers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-5">
        <div>
          <Typography variant="h2">Installation Pricing</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage installation tiers by system size
          </Typography>
        </div>
        <div className="bg-white rounded-lg border border-error/30 p-6">
          <div className="flex items-center gap-3 text-error">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load pricing tiers</p>
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
          <Typography variant="h2">Installation Pricing</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage installation tiers by system size
          </Typography>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-icon-sm" />
          Add Tier
        </Button>
      </div>

      {gapWarnings.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
          Coverage gaps detected: {gapWarnings.join(', ')}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Input
            type="text"
            placeholder="Search tiers..."
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
          tabs={TIER_STATUS_TABS}
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
        {isFetching || tiers.length > 0 ? (
          <>
            <DataTable
              columns={columns}
              data={tiers}
              enableSearch={false}
              enablePagination={false}
              isLoading={isFetching}
            />
            {tiers.length > 0 && (
              <TablePagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={meta?.total ?? 0}
                itemLabel="tiers"
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
                title="No tiers found"
                description={
                  debouncedSearch
                    ? 'No results match your search and filters. Try adjusting your criteria.'
                    : 'No tiers match the selected filters.'
                }
                action={{ label: 'Clear Filters', onClick: handleClearAll }}
              />
            ) : (
              <EmptyState
                title="No tiers yet"
                description="Get started by adding your first pricing tier"
                action={{ label: 'Add Tier', onClick: () => setCreateOpen(true) }}
              />
            )}
          </div>
        )}
      </div>

      <CreatePricingTierModal open={createOpen} onOpenChange={setCreateOpen} />
      <EditPricingTierModal
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
            <DialogTitle>Delete Tier</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the tier{' '}
              <span className="font-medium">
                {deleteConfirmation.target
                  ? getTierLabel(deleteConfirmation.target)
                  : ''}
              </span>
              ?
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
