/* eslint-disable @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unsafe-return -- table column definitions from API */
'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type JSX, useState, useCallback, useMemo } from 'react';

import { CreateUserModal } from './create-user-modal';
// TODO: Re-enable InviteUserModal when email service is implemented
// import { InviteUserModal } from './invite-user-modal';
import { UserStatusBadge } from './user-status-badge';
import { USER_STATUS_TABS } from '../../constants';

import { DataTable, EmptyState, FilterTabs, TablePagination } from '@/components/shared';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Typography,
} from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import { useAdminUsers, useAdminUserMutations, type AdminUserFilters } from '@/lib/hooks/resources';
import type { AdminUser } from '@/lib/hooks/resources/users';
import { formatDate, formatRoleCode, formatTimeAgo, getInitials } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

export function AdminUsersListPage(): JSX.Element {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const {
    items: users,
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
  } = useAdminUsers();

  const mutations = useAdminUserMutations();

  const [createOpen, setCreateOpen] = useState(false);
  // TODO: Re-enable invite state when email service is implemented
  // const [inviteOpen, setInviteOpen] = useState(false);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    user: AdminUser;
    newStatus: string;
  } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<AdminUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const deleteConfirmation = useDeleteConfirmation<AdminUser>({
    mutation: mutations.remove,
    getId: (user) => user.id,
    entityName: 'user',
  });

  const statusTabValue = filters.showDeleted ? 'archived' : (filters.status as string) || 'all';

  const handleStatusTabChange = useCallback(
    (value: string): void => {
      if (value === 'archived') {
        setFilters({ status: 'all', showDeleted: true } as Partial<AdminUserFilters>);
      } else {
        setFilters({ status: value, showDeleted: undefined } as Partial<AdminUserFilters>);
      }
    },
    [setFilters],
  );

  const handleClearAll = useCallback(() => {
    clearFilters();
    sorting.clearSort();
  }, [clearFilters, sorting]);

  const confirmStatusChange = useCallback(async () => {
    if (!statusChangeTarget) return;
    try {
      await mutations.statusChange.mutateAsync({
        id: statusChangeTarget.user.id,
        status: statusChangeTarget.newStatus,
      });
      setStatusChangeTarget(null);
    } catch {
      // error toast handled by FDAL mutation config
    }
  }, [mutations.statusChange, statusChangeTarget]);

  const confirmRestore = useCallback(async () => {
    if (!restoreTarget) return;
    setIsRestoring(true);
    try {
      await mutations.action('restore', restoreTarget.id);
      setRestoreTarget(null);
    } catch {
      // error toast handled by FDAL action config
    } finally {
      setIsRestoring(false);
    }
  }, [mutations, restoreTarget]);

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

  const columns: ColumnDef<AdminUser>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: () => <SortableHeader field="firstName" label="User" />,
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={buildRoute(ROUTES.ADMIN.USER_DETAIL, { id: row.original.id })}
            className="flex items-center gap-2.5 hover:text-primary transition-colors"
          >
            <Avatar className="size-8 shrink-0">
              <AvatarFallback>
                {getInitials(`${row.original.firstName} ${row.original.lastName ?? ''}`.trim())}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-medium text-foreground leading-tight">
                {row.original.firstName} {row.original.lastName}
              </div>
              <div className="text-foreground-tertiary text-2xs leading-tight mt-0.5 truncate">
                {row.original.email || '-'}
              </div>
            </div>
          </Link>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Contact',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">{row.original.phone}</span>
        ),
      },
      {
        accessorKey: 'roles',
        header: 'Roles',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roles?.length > 0 ? (
              row.original.roles.map((role) => (
                <Badge key={role} variant="secondary" size="xs">
                  {formatRoleCode(role)}
                </Badge>
              ))
            ) : (
              <span className="text-foreground-tertiary">--</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => <UserStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'lastLoginAt',
        header: () => <SortableHeader field="lastLoginAt" label="Last Login" />,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">
            {row.original.lastLoginAt ? formatTimeAgo(row.original.lastLoginAt) : 'Never'}
          </span>
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
        cell: ({ row }) => {
          const isSelf = currentUser?.id === row.original.id;
          const isDeleted = !!row.original.deletedAt;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="size-8 p-0">
                  <MoreHorizontal className="size-icon-sm" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(buildRoute(ROUTES.ADMIN.USER_DETAIL, { id: row.original.id }))
                  }
                >
                  <Eye className="mr-2 size-icon-sm" /> View Details
                </DropdownMenuItem>
                {isDeleted ? (
                  <DropdownMenuItem onClick={() => setRestoreTarget(row.original)}>
                    <RotateCcw className="mr-2 size-icon-sm" /> Restore Employee
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(buildRoute(ROUTES.ADMIN.USER_DETAIL, { id: row.original.id }))
                      }
                    >
                      <Shield className="mr-2 size-icon-sm" /> Manage Roles
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {row.original.status === 'active' ? (
                      <DropdownMenuItem
                        disabled={isSelf}
                        onClick={() =>
                          setStatusChangeTarget({ user: row.original, newStatus: 'inactive' })
                        }
                      >
                        <UserX className="mr-2 size-icon-sm" />
                        {isSelf ? 'Cannot deactivate yourself' : 'Deactivate'}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() =>
                          setStatusChangeTarget({ user: row.original, newStatus: 'active' })
                        }
                      >
                        <UserCheck className="mr-2 size-icon-sm" /> Activate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      disabled={isSelf}
                      className="text-error"
                      onClick={() => !isSelf && deleteConfirmation.requestDelete(row.original)}
                    >
                      <Trash2 className="mr-2 size-icon-sm" />
                      {isSelf ? 'Cannot delete yourself' : 'Delete'}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [currentUser?.id, router, SortableHeader, deleteConfirmation],
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <Typography variant="h2">Users</Typography>
            <Typography variant="body" color="muted" className="mt-1">
              Manage employees, roles, and access
            </Typography>
          </div>
          <div className="flex items-center gap-3">
            {/* TODO: Enable Invite Employee button when email service is implemented */}
            <Button size="sm" disabled>
              <Plus className="mr-2 size-icon-sm" />
              Add Employee
            </Button>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-border-light p-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-foreground-secondary">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-5">
        <div>
          <Typography variant="h2">Users</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage employees, roles, and access
          </Typography>
        </div>
        <div className="bg-white rounded-lg border border-error/30 p-6">
          <div className="flex items-center gap-3 text-error">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load users</p>
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
          <Typography variant="h2">Users</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage employees, roles, and access
          </Typography>
        </div>
        <div className="flex items-center gap-3">
          {/* TODO: Enable Invite Employee button when email service is implemented */}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-icon-sm" />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Input
            type="text"
            placeholder="Search users..."
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
          tabs={USER_STATUS_TABS}
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
        {isFetching || users.length > 0 ? (
          <>
            <DataTable
              columns={columns}
              data={users as AdminUser[]}
              enableSearch={false}
              enablePagination={false}
              isLoading={isFetching}
            />
            {users.length > 0 && (
              <TablePagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={meta?.total ?? 0}
                itemLabel="users"
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
                title="No users found"
                description={
                  debouncedSearch
                    ? 'No results match your search and filters. Try adjusting your criteria.'
                    : 'No users match the selected filters. Try different filter options.'
                }
                action={{ label: 'Clear Filters', onClick: handleClearAll }}
              />
            ) : (
              <EmptyState
                title="No users yet"
                description="Get started by adding your first employee"
                action={{ label: 'Add Employee', onClick: () => setCreateOpen(true) }}
                /* TODO: Re-add secondaryAction for Invite Employee when email service is implemented */
              />
            )}
          </div>
        )}
      </div>

      <CreateUserModal open={createOpen} onOpenChange={setCreateOpen} />

      {/* Delete confirmation (replaces DeleteUserModal) */}
      <Dialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) => {
          if (!open) deleteConfirmation.cancel();
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium">
                {deleteConfirmation.target?.firstName} {deleteConfirmation.target?.lastName}
              </span>
              ? This action cannot be undone.
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

      {/* Status change confirmation */}
      <Dialog
        open={!!statusChangeTarget}
        onOpenChange={(open) => {
          if (!open) setStatusChangeTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {statusChangeTarget?.newStatus === 'active'
                ? 'Activate'
                : statusChangeTarget?.newStatus === 'suspended'
                  ? 'Suspend'
                  : 'Deactivate'}{' '}
              User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to{' '}
              {statusChangeTarget?.newStatus === 'active'
                ? 'activate'
                : statusChangeTarget?.newStatus === 'suspended'
                  ? 'suspend'
                  : 'deactivate'}{' '}
              <span className="font-medium">
                {statusChangeTarget?.user.firstName} {statusChangeTarget?.user.lastName}
              </span>
              ?
              {statusChangeTarget?.newStatus === 'inactive' &&
                ' They will lose access to the platform.'}
              {statusChangeTarget?.newStatus === 'suspended' &&
                ' Their account will be suspended immediately.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusChangeTarget(null)}
              disabled={mutations.statusChange.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={statusChangeTarget?.newStatus === 'active' ? 'default' : 'destructive'}
              onClick={() => void confirmStatusChange()}
              disabled={mutations.statusChange.isPending}
            >
              {mutations.statusChange.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Processing...
                </>
              ) : statusChangeTarget?.newStatus === 'active' ? (
                'Activate'
              ) : statusChangeTarget?.newStatus === 'suspended' ? (
                'Suspend'
              ) : (
                'Deactivate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore confirmation */}
      <Dialog
        open={!!restoreTarget}
        onOpenChange={(open) => {
          if (!open) setRestoreTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Restore Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore{' '}
              <span className="font-medium">
                {restoreTarget?.firstName} {restoreTarget?.lastName}
              </span>
              ? Their account will be reactivated and they will regain access to the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreTarget(null)} disabled={isRestoring}>
              Cancel
            </Button>
            <Button onClick={() => void confirmRestore()} disabled={isRestoring}>
              {isRestoring ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 size-4" />
                  Restore Employee
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
