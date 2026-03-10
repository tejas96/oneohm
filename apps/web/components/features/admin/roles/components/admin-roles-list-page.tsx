/* eslint-disable @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unsafe-return -- table column definitions from API */
'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  AlertCircle,
  Edit,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, type JSX } from 'react';

import { CreateRoleModal } from './create-role-modal';
import { DeleteRoleModal } from './delete-role-modal';
import { EditRoleModal } from './edit-role-modal';
import { ROLE_TYPE_TABS } from '../../constants';

import { DataTable, EmptyState, FilterTabs, TablePagination } from '@/components/shared';
import {
  Badge,
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Typography,
} from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useRoles, type RoleFilters } from '@/lib/hooks/resources';
import type { AdminRole } from '@/lib/hooks/resources/roles';

export function AdminRolesListPage(): JSX.Element {
  const router = useRouter();

  const {
    items: roles,
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
  } = useRoles();

  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<AdminRole | null>(null);
  const [deleteRole, setDeleteRole] = useState<AdminRole | null>(null);

  const typeTabValue =
    filters.isSystemRole === true ? 'system' : filters.isSystemRole === false ? 'custom' : 'all';

  const handleTypeTabChange = useCallback(
    (value: string) => {
      const isSystemRole = value === 'system' ? true : value === 'custom' ? false : undefined;
      setFilter('isSystemRole', isSystemRole as RoleFilters['isSystemRole']);
    },
    [setFilter],
  );

  const handleClearAll = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  const columns: ColumnDef<AdminRole>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        enableSorting: false,
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
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
        accessorKey: 'level',
        header: 'Level',
        enableSorting: false,
        cell: ({ row }) => <span className="text-sm">{row.original.level}</span>,
      },
      {
        accessorKey: 'isSystemRole',
        header: 'Type',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={row.original.isSystemRole ? 'info' : 'secondary'} size="xs">
            {row.original.isSystemRole ? 'System' : 'Custom'}
          </Badge>
        ),
      },
      {
        accessorKey: 'permissionsCount',
        header: 'Permissions',
        enableSorting: false,
        cell: ({ row }) => <span className="text-sm">{row.original.permissionsCount ?? 0}</span>,
      },
      {
        accessorKey: 'usersCount',
        header: 'Users',
        enableSorting: false,
        cell: ({ row }) => <span className="text-sm">{row.original.usersCount ?? 0}</span>,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const role = row.original;
          const canDelete = !role.isSystemRole && (role.usersCount ?? 0) === 0;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="size-8 p-0">
                  <MoreHorizontal className="size-icon-sm" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => router.push(buildRoute(ROUTES.ADMIN.ROLE_DETAIL, { id: role.id }))}
                >
                  <Eye className="mr-2 size-icon-sm" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditRole(role)}>
                  <Edit className="mr-2 size-icon-sm" /> Edit Role
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!canDelete}
                  className="text-error"
                  onClick={() => canDelete && setDeleteRole(role)}
                >
                  <Trash2 className="mr-2 size-icon-sm" />
                  {role.isSystemRole
                    ? 'System roles cannot be deleted'
                    : (role.usersCount ?? 0) > 0
                      ? `Remove ${role.usersCount} users first`
                      : 'Delete Role'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [router],
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <Typography variant="h2">Roles</Typography>
            <Typography variant="body" color="muted" className="mt-1">
              Manage roles and their permissions
            </Typography>
          </div>
          <Button size="sm" disabled>
            <Plus className="mr-2 size-icon-sm" /> Create Role
          </Button>
        </div>
        <div className="bg-white rounded-lg border border-border-light p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-foreground-secondary">Loading roles...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-5">
        <div>
          <Typography variant="h2">Roles</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage roles and their permissions
          </Typography>
        </div>
        <div className="bg-white rounded-lg border border-error/30 p-6">
          <div className="flex items-center gap-3 text-error">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load roles</p>
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <Typography variant="h2">Roles</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage roles and their permissions
          </Typography>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-icon-sm" /> Create Role
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Input
            type="text"
            placeholder="Search roles..."
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
        <FilterTabs
          tabs={ROLE_TYPE_TABS}
          value={typeTabValue}
          onChange={handleTypeTabChange}
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
        {isFetching || roles.length > 0 ? (
          <>
            <DataTable
              columns={columns}
              data={roles as AdminRole[]}
              enableSearch={false}
              enablePagination={false}
              isLoading={isFetching}
            />
            {roles.length > 0 && (
              <TablePagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={meta?.total ?? 0}
                itemLabel="roles"
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
                title="No roles found"
                description="Try adjusting your filters."
                action={{ label: 'Clear Filters', onClick: handleClearAll }}
              />
            ) : (
              <EmptyState
                title="No roles yet"
                description="Create your first role to get started"
                action={{ label: 'Create Role', onClick: () => setCreateOpen(true) }}
              />
            )}
          </div>
        )}
      </div>

      <CreateRoleModal open={createOpen} onOpenChange={setCreateOpen} />
      {editRole && (
        <EditRoleModal
          open={!!editRole}
          onOpenChange={(v) => !v && setEditRole(null)}
          role={editRole}
        />
      )}
      {deleteRole && (
        <DeleteRoleModal
          open={!!deleteRole}
          onOpenChange={(v) => !v && setDeleteRole(null)}
          role={deleteRole}
        />
      )}
    </div>
  );
}
