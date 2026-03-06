'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { PermissionSelector } from './permission-selector';
import { roleSchema, type RoleFormData } from '../schemas/role.schema';

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from '@/components/ui';
import { useRole, useRoleMutations, type AdminRole } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface EditRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: AdminRole;
}

export function EditRoleModal({ open, onOpenChange, role }: EditRoleModalProps) {
  const mutations = useRoleMutations();
  const { data: roleDetail, isLoading: isLoadingDetail } = useRole(role.id);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [permissionsInitialized, setPermissionsInitialized] = useState(false);

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: role.name,
      code: role.code,
      description: role.description ?? '',
      parentRoleId: role.parentRoleId ?? '',
      level: role.level,
    },
  });

  useEffect(() => {
    if (roleDetail?.permissionIds && !permissionsInitialized) {
      setSelectedPermissionIds(roleDetail.permissionIds);
      setPermissionsInitialized(true);
    }
  }, [roleDetail, permissionsInitialized]);

  const isSubmitting = mutations.update.isPending;

  const onSubmit = async (data: RoleFormData) => {
    try {
      const payload: Record<string, unknown> = { ...data };
      if (!payload.parentRoleId) delete payload.parentRoleId;
      if (!payload.description) delete payload.description;
      await mutations.update.mutateAsync({ id: role.id, data: payload as Partial<AdminRole> });

      const original = roleDetail?.permissionIds ?? [];
      const hasPermissionChanges =
        original.length !== selectedPermissionIds.length ||
        [...original].sort().join(',') !== [...selectedPermissionIds].sort().join(',');

      if (hasPermissionChanges) {
        await mutations.action('syncPermissions', role.id, {
          permissionIds: selectedPermissionIds,
        });
      }

      onOpenChange(false);
    } catch (err) {
      const message = getErrorMessage(err);
      if (message.toLowerCase().includes('already exists')) {
        form.setError('code', { message: 'A role with this code already exists' });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>
            Update role details and permissions. System role codes cannot be changed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
          <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-xs text-error">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input {...form.register('code')} disabled={role.isSystemRole} />
              {role.isSystemRole && (
                <p className="text-xs text-foreground-tertiary">
                  System role codes cannot be changed
                </p>
              )}
              {form.formState.errors.code && (
                <p className="text-xs text-error">{form.formState.errors.code.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea {...form.register('description')} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Parent Role ID</Label>
                <Input {...form.register('parentRoleId')} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Input type="number" {...form.register('level', { valueAsNumber: true })} />
              </div>
            </div>
            {isLoadingDetail ? (
              <div className="flex items-center gap-2 p-3 text-sm text-foreground-secondary">
                <Loader2 className="size-4 animate-spin" />
                Loading permissions...
              </div>
            ) : (
              <PermissionSelector
                selectedIds={selectedPermissionIds}
                onChange={setSelectedPermissionIds}
              />
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingDetail}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
