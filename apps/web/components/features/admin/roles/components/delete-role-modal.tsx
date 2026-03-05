'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';

import { useDeleteRole } from '../hooks/use-role-mutations';
import type { AdminRole } from '../hooks/use-roles';

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { showToast } from '@/components/ui/sonner';
import { getErrorMessage } from '@/lib/utils';

interface DeleteRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: AdminRole;
}

export function DeleteRoleModal({ open, onOpenChange, role }: DeleteRoleModalProps) {
  const deleteRole = useDeleteRole();
  const hasUsers = (role.usersCount ?? 0) > 0;
  const isBlocked = role.isSystemRole || hasUsers;

  const handleDelete = async () => {
    try {
      await deleteRole.mutateAsync(role.id);
      showToast.success('Role deleted successfully');
      onOpenChange(false);
    } catch (err) {
      showToast.error(getErrorMessage(err));
    }
  };

  if (isBlocked) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Cannot Delete Role</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {role.isSystemRole ? (
              <p className="text-sm text-foreground-secondary">System roles cannot be deleted.</p>
            ) : (
              <p className="text-sm text-foreground-secondary">
                &quot;{role.name}&quot; has {role.usersCount} users assigned. Remove all user
                assignments before deleting.
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete Role</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{role.name}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {(role.permissionsCount ?? 0) > 0 && (
            <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-md">
              <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-foreground-secondary">
                This role has {role.permissionsCount} permissions assigned. They will be
                automatically removed.
              </p>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteRole.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deleteRole.isPending}
          >
            {deleteRole.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Role'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
