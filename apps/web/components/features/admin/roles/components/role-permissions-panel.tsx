/* eslint-disable @typescript-eslint/no-unsafe-return -- role permissions from API */
'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { type JSX, useState, useMemo, useCallback, useEffect, useRef } from 'react';

import { Button, Checkbox, Typography } from '@/components/ui';
import { useRoleMutations, useAllPermissions, type Permission } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

/**
 * The verb half of a permission code.
 *
 * Codes are `<module>.<action>` — sometimes with a nested action, e.g.
 * `inventory.purchase_orders.approve`. There is no separate `action` column
 * any more, so the matrix derives its columns from the code itself.
 */
function actionOf(perm: { code: string; module: string }): string {
  const prefix = `${perm.module}.`;
  return perm.code.startsWith(prefix) ? perm.code.slice(prefix.length) : perm.code;
}

interface PermissionGroup {
  feature: string;
  permissions: Permission[];
}

function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  const groups: Record<string, Permission[]> = {};
  for (const perm of permissions) {
    const key = perm.module || 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(perm);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([feature, perms]) => ({
      feature: feature.charAt(0).toUpperCase() + feature.slice(1).replace(/-/g, ' '),
      permissions: perms,
    }));
}

interface RolePermissionsPanelProps {
  roleId: string;
  currentPermissions: string[];
}

export function RolePermissionsPanel({
  roleId,
  currentPermissions,
}: RolePermissionsPanelProps): JSX.Element {
  const { items: allPermissions, isLoading, isError, error, refetch } = useAllPermissions();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const mutations = useRoleMutations();

  const prevPermsKey = useRef('');
  useEffect(() => {
    if (allPermissions && allPermissions.length > 0) {
      const permsKey = currentPermissions.slice().sort().join(',');
      if (permsKey !== prevPermsKey.current) {
        prevPermsKey.current = permsKey;
        const selectedIds: string[] = allPermissions
          .filter((p) => currentPermissions.includes(p.code))
          .map((p) => p.id);
        setSelected(new Set(selectedIds));
      }
    }
  }, [allPermissions, currentPermissions]);

  const groups = useMemo(() => groupPermissions(allPermissions ?? []), [allPermissions]);

  const togglePermission = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await mutations.action('syncPermissions', roleId, { permissionIds: Array.from(selected) });
    } catch {
      // Toast handled by useRoleMutations toast config
    } finally {
      setIsSaving(false);
    }
  }, [mutations, roleId, selected]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-error/30 p-6">
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
    );
  }

  if (!allPermissions || allPermissions.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-foreground-tertiary">
        No permissions found in the system.
      </div>
    );
  }

  const actions: string[] = [...new Set(allPermissions.map(actionOf))].sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Typography variant="h4">Permissions</Typography>
        <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </div>
      <div className="rounded-lg overflow-x-auto shadow-e1">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-muted/30 border-b border-border-light">
              <th className="text-left px-4 py-2 font-medium text-foreground-secondary sticky left-0 bg-muted/30 z-10">
                Feature
              </th>
              {actions.map((a) => (
                <th
                  key={a}
                  className="text-center px-3 py-2 font-medium text-foreground-secondary capitalize whitespace-nowrap"
                >
                  {a}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.feature} className="even:bg-surface-alt">
                <td className="px-4 py-2.5 font-medium whitespace-nowrap sticky left-0 bg-background z-10">
                  {group.feature}
                </td>
                {actions.map((action) => {
                  const perm = group.permissions.find((p) => actionOf(p) === action);
                  return (
                    <td key={action} className="text-center px-3 py-2.5">
                      {perm ? (
                        <Checkbox
                          checked={selected.has(perm.id)}
                          onCheckedChange={() => togglePermission(perm.id)}
                        />
                      ) : (
                        <span className="text-foreground-tertiary">--</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
