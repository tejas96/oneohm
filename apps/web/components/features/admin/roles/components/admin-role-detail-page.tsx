'use client';

import { AlertCircle, ArrowLeft, Edit, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type JSX } from 'react';

import { EditRoleModal } from './edit-role-modal';
import { RolePermissionsPanel } from './role-permissions-panel';

import { Badge, Button, Typography } from '@/components/ui';
import { ROUTES } from '@/lib/config/routes';
import { useRole } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface AdminRoleDetailPageProps {
  roleId: string;
}

export function AdminRoleDetailPage({ roleId }: AdminRoleDetailPageProps): JSX.Element {
  const { data: role, isLoading, isError, error, refetch } = useRole(roleId);
  const [editOpen, setEditOpen] = useState(false);
  const stablePermissions = useMemo(
    () => (role?.permissions ?? []) as string[],
    [role?.permissions],
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Link
          href={ROUTES.ADMIN.ROLES}
          className="flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to Roles
        </Link>
        <div className="bg-white rounded-lg shadow-e2 p-12 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (isError || !role) {
    return (
      <div className="space-y-5">
        <Link
          href={ROUTES.ADMIN.ROLES}
          className="flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to Roles
        </Link>
        <div className="bg-white rounded-lg border border-error/30 p-6">
          <div className="flex items-center gap-3 text-error">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load role</p>
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
      <Link
        href={ROUTES.ADMIN.ROLES}
        className="flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Roles
      </Link>

      <div className="bg-white rounded-lg shadow-e2 p-6">
        <div className="flex items-start justify-between">
          <div>
            <Typography variant="h3">{role.name}</Typography>
            <div className="flex items-center gap-3 mt-2 text-sm text-foreground-secondary">
              <span>
                Code:{' '}
                <Badge variant="outline" size="xs" className="font-mono">
                  {role.code}
                </Badge>
              </span>
              <span>Level: {role.level}</span>
              <Badge variant={role.isSystemRole ? 'info' : 'secondary'} size="xs">
                {role.isSystemRole ? 'System' : 'Custom'}
              </Badge>
              <span>
                {role.organizationId ? `Org: ${role.organizationId.slice(0, 8)}...` : 'Platform'}
              </span>
            </div>
            {role.description && (
              <p className="text-sm text-foreground-tertiary mt-2">{role.description}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 size-4" /> Edit
          </Button>
        </div>
      </div>

      <RolePermissionsPanel roleId={roleId} currentPermissions={stablePermissions} />

      {editOpen && (
        <EditRoleModal
          open={editOpen}
          onOpenChange={setEditOpen}
          role={{
            ...role,
            permissionsCount: role.permissions?.length ?? 0,
            usersCount: 0,
          }}
        />
      )}
    </div>
  );
}
