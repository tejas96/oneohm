/* eslint-disable @typescript-eslint/no-unsafe-return -- user detail from API */
'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Shield,
  Trash2,
  UserCheck,
  UserMinus,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type JSX, useState, useCallback, useMemo } from 'react';

import { AssignRoleModal } from './assign-role-modal';
import { UserStatusBadge } from './user-status-badge';

import { DataTable } from '@/components/shared';
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
  Typography,
} from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';
import { useDeleteConfirmation } from '@/lib/hooks/core';
import {
  useAdminUser,
  useAdminUserMutations,
  useUserRoles,
  useUserRoleMutations,
  type AdminUser,
  type UserRoleAssignment,
} from '@/lib/hooks/resources';
import { getErrorMessage, formatDate, formatTimeAgo } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

interface AdminUserDetailPageProps {
  userId: string;
}

export function AdminUserDetailPage({ userId }: AdminUserDetailPageProps): JSX.Element {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { data: user, isLoading, isError, error, refetch } = useAdminUser(userId);
  const {
    items: userRoles,
    isError: isUserRolesError,
    error: userRolesError,
  } = useUserRoles(userId);
  const mutations = useAdminUserMutations();
  const userRoleMutations = useUserRoleMutations();
  const [assignRoleOpen, setAssignRoleOpen] = useState(false);
  const [statusChangeTarget, setStatusChangeTarget] = useState<string | null>(null);
  const [removeRoleTarget, setRemoveRoleTarget] = useState<string | null>(null);

  const deleteConfirmation = useDeleteConfirmation<AdminUser>({
    mutation: mutations.remove,
    getId: (u) => u.id,
    entityName: 'user',
    onSuccess: () => router.push(ROUTES.ADMIN.USERS),
  });

  const isSelf = currentUser?.id === userId;

  const confirmStatusChange = useCallback(async (): Promise<void> => {
    if (!statusChangeTarget) return;
    try {
      await mutations.statusChange.mutateAsync({ id: userId, status: statusChangeTarget });
      setStatusChangeTarget(null);
    } catch {
      // error toast handled by FDAL mutation config
    }
  }, [mutations.statusChange, userId, statusChangeTarget]);

  const confirmRemoveRole = useCallback(async () => {
    if (!removeRoleTarget) return;
    try {
      await userRoleMutations.remove.mutateAsync(removeRoleTarget);
      setRemoveRoleTarget(null);
    } catch {
      // error toast handled by FDAL mutation config
    }
  }, [userRoleMutations.remove, removeRoleTarget]);

  const roleColumns: ColumnDef<UserRoleAssignment>[] = useMemo(
    () => [
      {
        accessorKey: 'roleName',
        header: 'Role',
        cell: ({ row }) => (row.original.roleName ?? row.original.roleCode) as string,
      },
      {
        accessorKey: 'roleCode',
        header: 'Code',
        cell: ({ row }) => (
          <Badge variant="outline" size="xs" className="font-mono">
            {row.original.roleCode}
          </Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Assigned',
        cell: ({ row }) => (
          <span className="text-sm text-foreground-secondary">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const isAdminRole =
            row.original.roleCode === 'admin' ||
            row.original.roleCode === 'platform_admin' ||
            row.original.roleCode === 'super_admin';
          const canRemove = !(isSelf && isAdminRole);
          return (
            <Button
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              disabled={!canRemove || userRoleMutations.remove.isPending}
              onClick={() => setRemoveRoleTarget(row.original.id)}
            >
              <X className="size-3.5" />
            </Button>
          );
        },
      },
    ],
    [isSelf, userRoleMutations.remove.isPending],
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Link
          href={ROUTES.ADMIN.USERS}
          className="flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to Users
        </Link>
        <div className="bg-white rounded-lg shadow-e2 p-12 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (isError || !user) {
    const isArchived = error?.status === 404;
    return (
      <div className="space-y-5">
        <Link
          href={ROUTES.ADMIN.USERS}
          className="flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to Users
        </Link>
        <div className="bg-white rounded-lg border border-error/30 p-6">
          <div className="flex items-center gap-3 text-error">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">
                {isArchived ? 'User not found or has been archived' : 'Failed to load user'}
              </p>
              <p className="text-sm text-foreground-secondary mt-1">
                {isArchived
                  ? 'This user may have been deleted. You can restore them from the Users list under the Archived tab.'
                  : getErrorMessage(error)}
              </p>
            </div>
            {!isArchived && (
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const initials = `${user.firstName.charAt(0)}${user.lastName?.charAt(0) ?? ''}`.toUpperCase();

  return (
    <div className="space-y-5">
      <Link
        href={ROUTES.ADMIN.USERS}
        className="flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Users
      </Link>

      <div className="bg-white rounded-lg shadow-e2 p-6">
        <div className="flex items-start gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <Typography variant="h3">
                {user.firstName} {user.lastName}
              </Typography>
              <UserStatusBadge status={user.status} />
            </div>
            {user.email && <p className="text-sm text-foreground-secondary mt-0.5">{user.email}</p>}
            <p className="text-sm text-foreground-secondary">{user.phone}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-foreground-tertiary">
              <span>Created: {formatDate(user.createdAt)}</span>
              <span>
                Last Login: {user.lastLoginAt ? formatTimeAgo(user.lastLoginAt) : 'Never'}
              </span>
              <span className="flex items-center gap-1">
                Email:{' '}
                {user.emailVerifiedAt ? (
                  <>
                    <CheckCircle2 className="size-3 text-success" /> Verified
                  </>
                ) : (
                  <>
                    <XCircle className="size-3 text-foreground-muted" /> Unverified
                  </>
                )}
              </span>
              <span className="flex items-center gap-1">
                Phone:{' '}
                {user.phoneVerifiedAt ? (
                  <>
                    <CheckCircle2 className="size-3 text-success" /> Verified
                  </>
                ) : (
                  <>
                    <XCircle className="size-3 text-foreground-muted" /> Unverified
                  </>
                )}
              </span>
              {!user.profileCompleted && (
                <Badge variant="warning" size="xs">
                  Profile Incomplete
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-4">
          {user.status === 'active' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={isSelf}
                onClick={() => setStatusChangeTarget('inactive')}
              >
                <UserX className="mr-2 size-4" />{' '}
                {isSelf ? 'Cannot deactivate yourself' : 'Deactivate'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isSelf}
                onClick={() => setStatusChangeTarget('suspended')}
              >
                <UserMinus className="mr-2 size-4" /> Suspend
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setStatusChangeTarget('active')}>
              <UserCheck className="mr-2 size-4" /> Activate
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            className="text-error"
            disabled={isSelf}
            onClick={() => user && !isSelf && deleteConfirmation.requestDelete(user)}
          >
            <Trash2 className="mr-2 size-4" /> {isSelf ? 'Cannot delete yourself' : 'Delete'}
          </Button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <Typography variant="h4">Assigned Roles</Typography>
          <Button size="sm" variant="outline" onClick={() => setAssignRoleOpen(true)}>
            <Shield className="mr-2 size-4" /> Add Role
          </Button>
        </div>
        <div className="bg-white rounded-lg shadow-e2 overflow-hidden">
          {isUserRolesError ? (
            <div className="p-6">
              <div className="flex items-center gap-3 text-foreground-secondary">
                <AlertCircle className="size-5 shrink-0" />
                <p className="text-sm">
                  {userRolesError?.message?.includes('403') ||
                  userRolesError?.message?.includes('Forbidden')
                    ? 'You do not have permission to view role assignments.'
                    : (userRolesError?.message ?? 'Failed to load roles')}
                </p>
              </div>
            </div>
          ) : (
            <DataTable
              columns={roleColumns}
              data={userRoles as UserRoleAssignment[]}
              enableSearch={false}
              enablePagination={false}
            />
          )}
        </div>
      </div>

      <AssignRoleModal
        open={assignRoleOpen}
        onOpenChange={setAssignRoleOpen}
        userId={userId}
        userName={`${user.firstName} ${user.lastName ?? ''}`.trim()}
      />
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
              {deleteConfirmation.isPending ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!statusChangeTarget}
        onOpenChange={(open) => {
          if (!open) setStatusChangeTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {statusChangeTarget === 'active'
                ? 'Activate'
                : statusChangeTarget === 'suspended'
                  ? 'Suspend'
                  : 'Deactivate'}{' '}
              User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to{' '}
              {statusChangeTarget === 'active'
                ? 'activate'
                : statusChangeTarget === 'suspended'
                  ? 'suspend'
                  : 'deactivate'}{' '}
              <span className="font-medium">
                {user.firstName} {user.lastName}
              </span>
              ?{statusChangeTarget === 'inactive' && ' They will lose access to the platform.'}
              {statusChangeTarget === 'suspended' &&
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
              variant={statusChangeTarget === 'active' ? 'default' : 'destructive'}
              onClick={() => void confirmStatusChange()}
              disabled={mutations.statusChange.isPending}
            >
              {mutations.statusChange.isPending
                ? 'Processing...'
                : statusChangeTarget === 'active'
                  ? 'Activate'
                  : statusChangeTarget === 'suspended'
                    ? 'Suspend'
                    : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!removeRoleTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveRoleTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Remove Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this role from{' '}
              <span className="font-medium">
                {user.firstName} {user.lastName}
              </span>
              ? This may affect their access permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveRoleTarget(null)}
              disabled={userRoleMutations.remove.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmRemoveRole()}
              disabled={userRoleMutations.remove.isPending}
            >
              {userRoleMutations.remove.isPending ? 'Removing...' : 'Remove Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
