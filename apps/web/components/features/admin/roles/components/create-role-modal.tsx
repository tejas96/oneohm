'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
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
import { showToast } from '@/components/ui/sonner';
import { useRoleMutations } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

interface CreateRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoleModal({ open, onOpenChange }: CreateRoleModalProps) {
  const { user: currentUser } = useAuth();
  const mutations = useRoleMutations();
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', code: '', description: '', parentRoleId: '', level: 0 },
  });

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setSelectedPermissionIds([]);
    }
    onOpenChange(isOpen);
  };

  const isSubmitting = mutations.create.isPending;

  const onSubmit = async (data: RoleFormData) => {
    try {
      const payload: Record<string, unknown> = {
        ...data,
        organizationId: currentUser?.organizationId || undefined,
      };
      if (!payload.parentRoleId) delete payload.parentRoleId;
      if (!payload.description) delete payload.description;
      const result = await mutations.create.mutateAsync(
        payload as Record<string, unknown> & { id: string },
      );

      if (selectedPermissionIds.length > 0 && result?.id) {
        try {
          await mutations.action('syncPermissions', result.id, {
            permissionIds: selectedPermissionIds,
          });
        } catch {
          showToast.error('Role created but failed to assign permissions. Edit the role to retry.');
          handleClose(false);
          return;
        }
      }

      handleClose(false);
    } catch (err) {
      const message = getErrorMessage(err);
      if (message.toLowerCase().includes('already exists')) {
        form.setError('code', { message: 'A role with this code already exists' });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Create Role</DialogTitle>
          <DialogDescription>
            Define a new role with a unique code, optional description, and permissions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
          <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input {...form.register('name')} placeholder="e.g., Sales Executive" />
              {form.formState.errors.name && (
                <p className="text-xs text-error">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input {...form.register('code')} placeholder="e.g., sales_exec" />
              <p className="text-xs text-foreground-tertiary">
                Unique identifier. Cannot be changed after creation.
              </p>
              {form.formState.errors.code && (
                <p className="text-xs text-error">{form.formState.errors.code.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                {...form.register('description')}
                rows={2}
                placeholder="Brief description of this role..."
              />
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
            <PermissionSelector
              selectedIds={selectedPermissionIds}
              onChange={setSelectedPermissionIds}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Role'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
