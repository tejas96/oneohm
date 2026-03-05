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
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';

import { CreateUserModal } from './create-user-modal';
import { DeleteUserModal } from './delete-user-modal';
// TODO: Re-enable InviteUserModal when email service is implemented
// import { InviteUserModal } from './invite-user-modal';
import { UserStatusBadge } from './user-status-badge';
import { USER_STATUS_TABS } from '../../constants';
import { useUpdateUserStatus, useRestoreUser } from '../hooks/use-admin-user-mutations';
import {
  useAdminUsers,
  type AdminUser,
  type UserSortField,
  type SortOrder,
} from '../hooks/use-admin-users';

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
import { showToast } from '@/components/ui/sonner';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useDebounce } from '@/lib/hooks';
import { getErrorMessage, formatDate, formatRoleCode, formatTimeAgo } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 550;

function getInitials(firstName: string, lastName?: string): string {
  return `${firstName.charAt(0)}${lastName?.charAt(0) ?? ''}`.toUpperCase();
}

function getValidSortField(value: string | null): UserSortField {
  const valid: UserSortField[] = ['firstName', 'lastName', 'createdAt', 'lastLoginAt', 'status'];
  return valid.includes(value as UserSortField) ? (value as UserSortField) : 'createdAt';
}

function getValidSortOrder(value: string | null): SortOrder {
  return value === 'ASC' ? 'ASC' : 'DESC';
}

export function AdminUsersListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();

  const initialPage = Number(searchParams.get('page')) || 1;
  const initialLimit = Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE;
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = searchParams.get('status') || 'all';
  const initialSortBy = getValidSortField(searchParams.get('sortBy'));
  const initialSortOrder = getValidSortOrder(searchParams.get('sortOrder'));

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialLimit);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [sortBy, setSortBy] = useState<UserSortField>(initialSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);
  const [createOpen, setCreateOpen] = useState(false);
  // TODO: Re-enable invite state when email service is implemented
  // const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    user: AdminUser;
    newStatus: string;
  } | null>(null);

  const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);

  const isArchivedView = statusFilter === 'archived';

  const { data, isLoading, isError, error, isFetching, refetch } = useAdminUsers({
    page,
    limit: pageSize,
    search: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
    status: !isArchivedView && statusFilter !== 'all' ? statusFilter : undefined,
    showDeleted: isArchivedView,
    sortBy,
    sortOrder,
  });

  const updateStatus = useUpdateUserStatus();
  const restoreUser = useRestoreUser();
  const [restoreTarget, setRestoreTarget] = useState<AdminUser | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (pageSize !== DEFAULT_PAGE_SIZE) params.set('limit', String(pageSize));
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy);
    if (sortOrder !== 'DESC') params.set('sortOrder', sortOrder);

    const query = params.toString();
    const newUrl = query ? `?${query}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [page, pageSize, debouncedSearch, statusFilter, sortBy, sortOrder]);

  const confirmStatusChange = useCallback(async () => {
    if (!statusChangeTarget) return;
    try {
      await updateStatus.mutateAsync({
        userId: statusChangeTarget.user.id,
        status: statusChangeTarget.newStatus,
      });
      showToast.success(
        `User ${statusChangeTarget.newStatus === 'active' ? 'activated' : statusChangeTarget.newStatus}`,
      );
      setStatusChangeTarget(null);
    } catch (err) {
      showToast.error(getErrorMessage(err));
    }
  }, [updateStatus, statusChangeTarget]);

  const confirmRestore = useCallback(async () => {
    if (!restoreTarget) return;
    try {
      await restoreUser.mutateAsync(restoreTarget.id);
      showToast.success(`${restoreTarget.firstName} has been restored`);
      setRestoreTarget(null);
    } catch (err) {
      showToast.error(getErrorMessage(err));
    }
  }, [restoreUser, restoreTarget]);

  const clearSearch = useCallback(() => {
    setSearchInput('');
    setPage(1);
  }, []);
  const clearAllFilters = useCallback(() => {
    setSearchInput('');
    setStatusFilter('all');
    setSortBy('createdAt');
    setSortOrder('DESC');
    setPage(1);
  }, []);

  const handlePageSizeChange = (newSize: number): void => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleSort = useCallback(
    (field: UserSortField) => {
      if (sortBy === field) {
        setSortOrder((current) => (current === 'ASC' ? 'DESC' : 'ASC'));
      } else {
        setSortBy(field);
        setSortOrder('ASC');
      }
      setPage(1);
    },
    [sortBy],
  );

  const SortableHeader = useCallback(
    ({ field, label }: { field: UserSortField; label: string }) => {
      const isActive = sortBy === field;
      return (
        <button
          type="button"
          onClick={() => handleSort(field)}
          className="flex items-center gap-1 font-semibold text-2xs uppercase tracking-wider hover:text-foreground transition-colors"
        >
          {label}
          {isActive ? (
            sortOrder === 'ASC' ? (
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
    [sortBy, sortOrder, handleSort],
  );

  const hasActiveFilters = statusFilter !== 'all' || debouncedSearch;
  const users = data?.items ?? [];
  const totalItems = data?.total ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

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
                {getInitials(row.original.firstName, row.original.lastName)}
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
                      onClick={() => setDeleteTarget(row.original)}
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
    [currentUser?.id, router, SortableHeader],
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
        <FilterTabs
          tabs={USER_STATUS_TABS}
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          size="xs"
        />
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
        {isFetching || users.length > 0 ? (
          <>
            <DataTable
              columns={columns}
              data={users}
              enableSearch={false}
              enablePagination={false}
              isLoading={isFetching}
            />
            {users.length > 0 && (
              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                itemLabel="users"
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
                title="No users found"
                description={
                  debouncedSearch
                    ? 'No results match your search and filters. Try adjusting your criteria.'
                    : 'No users match the selected filters. Try different filter options.'
                }
                action={{ label: 'Clear Filters', onClick: clearAllFilters }}
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
      {/* TODO: Re-enable InviteUserModal when email service is implemented */}
      <DeleteUserModal
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        user={deleteTarget}
      />

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
              disabled={updateStatus.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={statusChangeTarget?.newStatus === 'active' ? 'default' : 'destructive'}
              onClick={() => void confirmStatusChange()}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? (
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
            <Button
              variant="outline"
              onClick={() => setRestoreTarget(null)}
              disabled={restoreUser.isPending}
            >
              Cancel
            </Button>
            <Button onClick={() => void confirmRestore()} disabled={restoreUser.isPending}>
              {restoreUser.isPending ? (
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
