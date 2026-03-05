'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, Loader2, Search, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';

import { PermissionDetailModal } from './permission-detail-modal';
import { PERMISSION_ACTION_OPTIONS, PERMISSION_SCOPE_OPTIONS } from '../../constants';
import { usePermissions, type AdminPermission } from '../hooks/use-permissions';

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
import { useDebounce } from '@/lib/hooks';
import { getErrorMessage } from '@/lib/utils';

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 550;

export function AdminPermissionsListPage() {
  const searchParams = useSearchParams();

  const initialPage = Number(searchParams.get('page')) || 1;
  const initialLimit = Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE;
  const initialSearch = searchParams.get('search') || '';
  const initialAction = searchParams.get('action') || 'all_actions';
  const initialScope = searchParams.get('scope') || 'all_scopes';

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialLimit);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [actionFilter, setActionFilter] = useState(initialAction);
  const [scopeFilter, setScopeFilter] = useState(initialScope);
  const [selectedPermission, setSelectedPermission] = useState<AdminPermission | null>(null);

  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);

  const { data, isLoading, isError, error, isFetching, refetch } = usePermissions({
    page,
    pageSize,
    search: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
    action: actionFilter !== 'all_actions' ? actionFilter : undefined,
    scope: scopeFilter !== 'all_scopes' ? scopeFilter : undefined,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, actionFilter, scopeFilter]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (pageSize !== DEFAULT_PAGE_SIZE) params.set('limit', String(pageSize));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (actionFilter !== 'all_actions') params.set('action', actionFilter);
    if (scopeFilter !== 'all_scopes') params.set('scope', scopeFilter);

    const query = params.toString();
    const newUrl = query ? `?${query}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [page, pageSize, debouncedSearch, actionFilter, scopeFilter]);

  const clearSearch = useCallback(() => {
    setSearchInput('');
    setPage(1);
  }, []);
  const clearAllFilters = useCallback(() => {
    setSearchInput('');
    setActionFilter('all_actions');
    setScopeFilter('all_scopes');
    setPage(1);
  }, []);

  const handlePageSizeChange = (newSize: number): void => {
    setPageSize(newSize);
    setPage(1);
  };

  const hasActiveFilters =
    searchInput || actionFilter !== 'all_actions' || scopeFilter !== 'all_scopes';
  const permissions = data?.data ?? [];
  const totalItems = data?.total ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

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
        accessorKey: 'action',
        header: 'Action',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="secondary" size="xs" className="capitalize">
            {row.original.action}
          </Badge>
        ),
      },
      {
        accessorKey: 'scope',
        header: 'Scope',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="secondary" size="xs">
            {row.original.scope}
          </Badge>
        ),
      },
      {
        accessorKey: 'permissionLevel',
        header: 'Level',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-foreground-secondary">{row.original.permissionLevel}</span>
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
        <div className="bg-white rounded-lg border border-border-light p-12 flex items-center justify-center">
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
        <Select
          value={actionFilter}
          onValueChange={(value) => {
            setActionFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px] h-8 text-sm">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            {PERMISSION_ACTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={scopeFilter}
          onValueChange={(value) => {
            setScopeFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px] h-8 text-sm">
            <SelectValue placeholder="All Scopes" />
          </SelectTrigger>
          <SelectContent>
            {PERMISSION_SCOPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-foreground-secondary h-8"
          >
            <X className="mr-1 size-3" /> Clear
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-border-light overflow-hidden">
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
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                itemLabel="permissions"
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
                title="No permissions found"
                description="Try adjusting your filters."
                action={{ label: 'Clear Filters', onClick: clearAllFilters }}
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
