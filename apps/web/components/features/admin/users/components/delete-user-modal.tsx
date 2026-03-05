'use client';

import { Loader2, AlertTriangle } from 'lucide-react';

import { useDeleteUser } from '../hooks/use-admin-user-mutations';

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

interface DeleteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; firstName: string; lastName?: string } | null;
  onDeleted?: () => void;
}

export function DeleteUserModal({ open, onOpenChange, user, onDeleted }: DeleteUserModalProps) {
  const deleteUser = useDeleteUser();

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteUser.mutateAsync(user.id);
      showToast.success('User deleted successfully');
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      showToast.error(getErrorMessage(err));
    }
  };

  const isDeleting = deleteUser.isPending;
  const displayName = user ? `${user.firstName} ${user.lastName ?? ''}`.trim() : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">{displayName}</span>?
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-md">
            <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-foreground-secondary">
              The user will be deactivated and their access revoked. This action can be reversed by
              contacting support.
            </p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete User'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
