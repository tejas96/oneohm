'use client';

import {
  AlertCircle,
  Eye,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type JSX, type MouseEvent, useState, useCallback, useMemo } from 'react';

import { UserFormModal } from './user-form-modal';
import { UserStatusBadge } from './user-status-badge';

import { EmptyState } from '@/components/shared';
import { AdvancedTable, type ColumnConfig } from '@/components/shared/advanced-table';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Typography,
} from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import {
  useAdminUsersList,
  useAdminUserMutations,
  useRoles,
  type AdminUserListFilters,
} from '@/lib/hooks/resources';
import type { AdminUser } from '@/lib/hooks/resources/users';
import {
  type TableUrlFilterRecord,
  type TableUrlSortModel,
  useTableUrlState,
} from '@/lib/hooks/use-table-url-state';
import { formatDate, formatRoleCode, formatTimeAgo, getInitials } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

// AdvancedTable requires TRow extends Record<string, unknown>
type UserRow = AdminUser & Record<string, unknown>;
const EMPTY_ROWS: UserRow[] = [];

// ============================================================================
// Filter options
// ============================================================================

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Archived', value: 'archived' },
] as const;

// ============================================================================
// Sort adapter — maps AdvancedTable sort model to API fields
// ============================================================================

const SORT_FIELD_MAP: Record<string, string> = {
  name: 'firstName',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
};

function toApiSortField(model: TableUrlSortModel | null): string {
  if (!model) return 'createdAt';
  return SORT_FIELD_MAP[model.field] ?? 'createdAt';
}

function toApiSortOrder(model: TableUrlSortModel | null): 'ASC' | 'DESC' {
  return model?.direction === 'asc' ? 'ASC' : 'DESC';
}

// ============================================================================
// Filter adapter — maps AdvancedTable filterModel → API params
// ============================================================================

function toLocalDateString(raw: string): string | undefined {
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return undefined;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localDateToUtcDayRange(localDate: string): { fromIso: string; toIso: string } | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) return undefined;
  const yy = Number(match[1]);
  const mm = Number(match[2]);
  const dd = Number(match[3]);
  return {
    fromIso: new Date(yy, mm - 1, dd, 0, 0, 0, 0).toISOString(),
    toIso: new Date(yy, mm - 1, dd, 23, 59, 59, 999).toISOString(),
  };
}

function toUserFilters(
  filters: TableUrlFilterRecord,
): Pick<AdminUserListFilters, 'status' | 'roleId' | 'showDeleted' | 'fromDate' | 'toDate'> {
  const statusVal =
    typeof filters.status === 'string' && filters.status ? filters.status : undefined;
  const isArchived = statusVal === 'archived';

  const createdAtLocal =
    typeof filters.createdAt === 'string' ? toLocalDateString(filters.createdAt) : undefined;
  const createdAtRange = createdAtLocal ? localDateToUtcDayRange(createdAtLocal) : undefined;

  return {
    status: isArchived ? undefined : statusVal,
    showDeleted: isArchived || undefined,
    roleId: typeof filters.roleId === 'string' && filters.roleId ? filters.roleId : undefined,
    fromDate: createdAtRange?.fromIso,
    toDate: createdAtRange?.toIso,
  };
}

// ============================================================================
// Row Actions Menu
// ============================================================================

interface UserRowActionsMenuProps {
  user: AdminUser;
  isSelf: boolean;
  onEdit: (id: string) => void;
  onStatusChange: (user: AdminUser, newStatus: string) => void;
  onDelete: (user: AdminUser) => void;
  onRestore: (user: AdminUser) => void;
}

function UserRowActionsMenu({
  user,
  isSelf,
  onEdit,
  onStatusChange,
  onDelete,
  onRestore,
}: UserRowActionsMenuProps): JSX.Element {
  const router = useRouter();
  const isDeleted = !!user.deletedAt;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0"
          onClick={(e: MouseEvent) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-icon-sm" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e: MouseEvent) => e.stopPropagation()}>
        {isDeleted ? (
          <DropdownMenuItem onClick={() => onRestore(user)}>
            <RotateCcw className="mr-2 size-icon-sm" /> Restore Employee
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem
              onClick={() => router.push(buildRoute(ROUTES.ADMIN.USER_DETAIL, { id: user.id }))}
            >
              <Eye className="mr-2 size-icon-sm" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isSelf} onClick={() => !isSelf && onEdit(user.id)}>
              <Pencil className="mr-2 size-icon-sm" />
              {isSelf ? 'Cannot edit yourself' : 'Edit Employee'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {user.status === 'active' ? (
              <DropdownMenuItem disabled={isSelf} onClick={() => onStatusChange(user, 'inactive')}>
                <UserX className="mr-2 size-icon-sm" />
                {isSelf ? 'Cannot deactivate yourself' : 'Deactivate'}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onStatusChange(user, 'active')}>
                <UserCheck className="mr-2 size-icon-sm" /> Activate
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              disabled={isSelf}
              className="text-error"
              onClick={() => !isSelf && onDelete(user)}
            >
              <Trash2 className="mr-2 size-icon-sm" />
              {isSelf ? 'Cannot delete yourself' : 'Delete'}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Main component
// ============================================================================

export function AdminUsersListPage(): JSX.Element {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  // URL-synced table state
  const urlState = useTableUrlState({ prefix: 'users', defaultPageSize: 10 });

  // Fetch roles for filter dropdown
  const { items: allRoles } = useRoles({ syncToUrl: false, defaultPageSize: 100 });
  const roleFilterOptions = useMemo(
    () => (allRoles ?? []).map((r) => ({ label: r.name, value: r.id })),
    [allRoles],
  );

  // Build API filters from URL state
  const apiFilters: AdminUserListFilters = useMemo(
    () => ({
      page: urlState.state.page + 1,
      limit: urlState.state.pageSize,
      search: urlState.state.search || undefined,
      sortBy: toApiSortField(urlState.state.sortModel),
      sortOrder: toApiSortOrder(urlState.state.sortModel),
      ...toUserFilters(urlState.state.filters),
    }),
    [urlState.state],
  );

  // Data fetch
  const { data, isLoading, isFetching, isError, error, refetch } = useAdminUsersList(apiFilters);

  const tableRows = useMemo<UserRow[]>(
    () => (data?.items as UserRow[] | undefined) ?? EMPTY_ROWS,
    [data?.items],
  );

  // Mutations
  const mutations = useAdminUserMutations();

  // Modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    user: AdminUser;
    newStatus: string;
  } | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<AdminUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const deleteConfirmation = useDeleteConfirmation<AdminUser>({
    mutation: mutations.remove,
    getId: (u) => u.id,
    entityName: 'user',
  });

  const requestDelete = useCallback(
    (u: AdminUser) => deleteConfirmation.requestDelete(u),
    [deleteConfirmation],
  );

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

  // Column definitions
  const columns: ColumnConfig<UserRow>[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'User',
        sortable: true,
        searchable: true,
        flex: 2,
        renderCell: ({ row }) => {
          const isDeleted = !!row.deletedAt;
          const isReseller = (row.roles as string[] | undefined)?.includes('reseller');
          const inner = (
            <>
              <Avatar className={`size-8 shrink-0${isDeleted ? ' opacity-50' : ''}`}>
                <AvatarFallback>
                  {getInitials(
                    `${row.firstName} ${(row.lastName as string | undefined) ?? ''}`.trim(),
                  )}
                </AvatarFallback>
              </Avatar>
              <div className={`min-w-0${isDeleted ? ' opacity-50' : ''}`}>
                <div className="font-medium text-foreground leading-tight flex items-center gap-1.5">
                  <span>
                    {row.firstName} {row.lastName as string | undefined}
                  </span>
                  {isReseller && (
                    <Badge
                      variant="outline"
                      size="xs"
                      className="bg-amber-50 text-amber-700 border-amber-200 px-1 py-0 h-4 text-[10px] font-semibold"
                    >
                      Reseller
                    </Badge>
                  )}
                </div>
                <div className="text-foreground-tertiary text-2xs leading-tight mt-0.5 truncate">
                  {(row.email as string | undefined) || '-'}
                </div>
              </div>
            </>
          );
          if (isDeleted) {
            return <div className="flex items-center gap-2.5">{inner}</div>;
          }
          return (
            <Link
              href={buildRoute(ROUTES.ADMIN.USER_DETAIL, { id: row.id })}
              className="flex items-center gap-2.5 hover:text-primary transition-colors"
              onClick={(e: MouseEvent) => e.stopPropagation()}
            >
              {inner}
            </Link>
          );
        },
      },
      {
        field: 'phone',
        headerName: 'Contact',
        searchable: true,
        flex: 1,
        renderCell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">{row.phone as string}</span>
        ),
      },
      {
        field: 'roles',
        headerName: 'Roles',
        flex: 1.5,
        renderCell: ({ row }) => {
          const roles = row.roles as string[] | undefined;
          return (
            <div className="flex flex-wrap gap-1">
              {roles && roles.length > 0 ? (
                roles.map((role) => {
                  const isResellerRole = role === 'reseller';
                  return (
                    <Badge
                      key={role}
                      variant={isResellerRole ? 'outline' : 'secondary'}
                      size="xs"
                      className={
                        isResellerRole ? 'bg-amber-50 text-amber-700 border-amber-200' : ''
                      }
                    >
                      {formatRoleCode(role)}
                    </Badge>
                  );
                })
              ) : (
                <span className="text-foreground-tertiary">--</span>
              )}
            </div>
          );
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        filterable: true,
        filterType: 'select',
        filterOptions: STATUS_OPTIONS,
        flex: 1,
        renderCell: ({ row }) => <UserStatusBadge status={row.status as string} />,
      },
      {
        field: 'roleId',
        headerName: 'Role',
        filterable: true,
        filterType: 'select',
        filterOptions: roleFilterOptions,
        defaultHidden: true,
        hideable: false,
      },
      {
        field: 'lastLoginAt',
        headerName: 'Last Login',
        sortable: true,
        flex: 1,
        renderCell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">
            {row.lastLoginAt ? formatTimeAgo(row.lastLoginAt as string) : 'Never'}
          </span>
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        sortable: true,
        filterable: true,
        filterType: 'date',
        flex: 1,
        renderCell: ({ row }) => (
          <span className="text-foreground-secondary text-sm">
            {formatDate(row.createdAt as string)}
          </span>
        ),
      },
      {
        field: 'actions',
        headerName: '',
        hideable: false,
        width: 48,
        actions: (row) => (
          <UserRowActionsMenu
            user={row as unknown as AdminUser}
            isSelf={currentUser?.id === row.id}
            onEdit={(id) => setEditUserId(id)}
            onStatusChange={(u, status) => setStatusChangeTarget({ user: u, newStatus: status })}
            onDelete={(u) => requestDelete(u)}
            onRestore={(u) => setRestoreTarget(u)}
          />
        ),
      },
    ],
    [currentUser?.id, requestDelete, roleFilterOptions],
  );

  const renderEmptyState = useCallback(
    (hasActiveFilters: boolean): JSX.Element =>
      hasActiveFilters ? (
        <EmptyState
          title="No users found"
          description="No results match your search and filters. Try adjusting your criteria."
          action={{ label: 'Clear Filters', onClick: urlState.resetAll }}
        />
      ) : (
        <EmptyState
          title="No users yet"
          description="Get started by adding your first employee"
          action={{ label: 'Add Employee', onClick: () => setCreateOpen(true) }}
        />
      ),
    [urlState.resetAll],
  );

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <Typography variant="h2">Users</Typography>
          <Typography variant="body" color="muted" className="mt-1">
            Manage employees, roles, and access
          </Typography>
        </div>
      </div>

      {/* Error banner */}
      {isError && (
        <div className="bg-background rounded-lg border border-error/30 p-6">
          <div className="flex items-center gap-3 text-error">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load users</p>
              <p className="text-sm text-foreground-secondary mt-1">
                {(error as Error | null)?.message}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <AdvancedTable<UserRow>
        key="admin-users-table"
        columns={columns}
        rows={tableRows}
        rowIdField="id"
        paginationMode="server"
        loading={isLoading}
        refetching={isFetching && !isLoading}
        page={urlState.state.page}
        pageSize={urlState.state.pageSize}
        totalRowCount={data?.total ?? 0}
        sortModel={urlState.state.sortModel}
        filterModel={urlState.state.filters}
        onPageChange={urlState.setPage}
        onPageSizeChange={urlState.setPageSize}
        onSortChange={urlState.setSortModel}
        onFilterChange={urlState.setFilters}
        onSearchChange={urlState.setSearch}
        onRowClick={(row) => {
          if (!row.deletedAt) {
            void router.push(buildRoute(ROUTES.ADMIN.USER_DETAIL, { id: row.id }));
          }
        }}
        enableSearch
        enableFilters
        enablePagination
        enableColumnVisibility
        searchPlaceholder="Search by name, email, phone..."
        itemLabel="users"
        toolbarActions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-icon-sm" />
            Add Employee
          </Button>
        }
        renderEmptyState={renderEmptyState}
      />

      {/* Create Modal */}
      <UserFormModal mode="create" open={createOpen} onOpenChange={setCreateOpen} />

      {/* Edit Modal — conditionally rendered so hooks only mount when needed */}
      {editUserId && (
        <UserFormModal
          mode="edit"
          open
          userId={editUserId}
          onOpenChange={(open) => {
            if (!open) setEditUserId(null);
          }}
        />
      )}

      {/* Delete confirmation */}
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
