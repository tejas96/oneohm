/* eslint-disable @typescript-eslint/no-unsafe-return -- permission list from API */
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, Loader2, Search, X } from 'lucide-react';
import { type JSX, useState, useCallback, useMemo } from 'react';

import { PermissionDetailModal } from './permission-detail-modal';

import { DataTable, EmptyState, TablePagination } from '@/components/shared';
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Typography,
} from '@/components/ui';
import { usePermissions } from '@/lib/hooks/resources';
import type { AdminPermission } from '@/lib/hooks/resources/permissions';
import { PERMISSIONS } from '@/lib/rbac';

/** Module names, taken from the catalog so this list cannot drift from it. */
const MODULES: string[] = [...new Set(PERMISSIONS.map((p) => p.module))];

export function AdminPermissionsListPage(): JSX.Element {
  const {
    items: permissions,
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
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = usePermissions();

  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- AdminPermission from permissions module
  const [selectedPermission, setSelectedPermission] = useState<AdminPermission | null>(null);

  const handleClearAll = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const columns: ColumnDef<AdminPermission>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        enableSorting: false,
        cell: ({ row }) => (
          <button
            className="font-medium text-left hover:text-primary transition-colors"
            onClick={() => setSelectedPermission(row.original)}
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: 'code',
        header: 'Code',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="outline" size="xs" className="font-mono">
            {row.original.code}
          </Badge>
        ),
      },
      {
        accessorKey: 'module',
        header: 'Module',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="secondary" size="xs" className="capitalize">
            {row.original.module}
          </Badge>
        ),
      },
      {
        accessorKey: 'description',
        header: 'What it unlocks',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-foreground-secondary">{row.original.description}</span>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Active',
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className={`inline-block size-2 rounded-full ${row.original.isActive ? 'bg-success' : 'bg-foreground-tertiary'}`}
          />
        ),
      },
      {
        accessorKey: 'rolesCount',
        header: 'Roles',
        enableSorting: false,
        cell: ({ row }) => <span className="text-sm">{row.original.rolesCount ?? 0}</span>,
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div>
          <Typography variant="h2">Permissions</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            View all system permissions
          </Typography>
        </div>
        <div className="bg-white rounded-lg shadow-e2 p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-foreground-secondary">Loading permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-5">
        <div>
          <Typography variant="h2">Permissions</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            View all system permissions
          </Typography>
        </div>
        <div className="bg-white rounded-lg border border-error/30 p-6">
          <div className="flex items-center gap-3 text-error">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load permissions</p>
              <p className="text-sm text-foreground-secondary mt-1">{error?.message}</p>
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
      <div>
        <Typography variant="h2">Permissions</Typography>
        <Typography variant="body" color="muted" className="mt-1">
          View all system permissions
        </Typography>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Input
            type="text"
            placeholder="Search permissions..."
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
          {isFetching && debouncedSearch && (
            <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-foreground-tertiary" />
          )}
        </div>
        <div className="h-5 w-px bg-border-light" />
        <Select
          value={(filters.module as string) || 'all_modules'}
          onValueChange={(value) =>
            setFilter('module', value === 'all_modules' ? undefined : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All modules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_modules">All modules</SelectItem>
            {MODULES.map((m) => (
              <SelectItem key={m} value={m} className="capitalize">
                {m}
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
        {isFetching || permissions.length > 0 ? (
          <>
            <DataTable
              columns={columns}
              data={permissions}
              enableSearch={false}
              enablePagination={false}
              isLoading={isFetching}
            />
            {permissions.length > 0 && (
              <TablePagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={meta?.total ?? 0}
                itemLabel="permissions"
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
                title="No permissions found"
                description="Try adjusting your filters."
                action={{ label: 'Clear Filters', onClick: handleClearAll }}
              />
            ) : (
              <EmptyState
                title="No permissions"
                description="No permissions exist in the system."
              />
            )}
          </div>
        )}
      </div>

      {selectedPermission && (
        <PermissionDetailModal
          open={!!selectedPermission}
          onOpenChange={(v) => !v && setSelectedPermission(null)}
          permission={selectedPermission}
        />
      )}
    </div>
  );
}
