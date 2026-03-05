'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Info } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';

import { useCreateInvitation } from '../hooks/use-invitations';
import { inviteUserSchema, type InviteUserFormData } from '../schemas/invite-user.schema';

import { useRoles } from '@/components/features/admin/roles';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { showToast } from '@/components/ui/sonner';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserModal({ open, onOpenChange }: InviteUserModalProps) {
  const { user: currentUser } = useAuth();
  const createInvitation = useCreateInvitation();
  const { data: rolesData } = useRoles({
    page: 1,
    pageSize: 100,
    organizationId: currentUser?.organizationId,
  });
  const availableRoles = (rolesData?.data ?? []).filter((r) => r.organizationId !== null);

  const form = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { email: '', roleId: '' },
  });

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) form.reset();
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: InviteUserFormData) => {
    try {
      await createInvitation.mutateAsync({
        email: data.email,
        roleId: data.roleId,
        organizationId: currentUser?.organizationId || '',
      });
      showToast.success(`Invitation sent to ${data.email}`);
      handleClose(false);
    } catch (err) {
      showToast.error(getErrorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Invite Employee</DialogTitle>
          <DialogDescription>Send an email invitation to onboard a new employee.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
          <DialogBody className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-error">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Controller
                name="roleId"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                          {role.isSystemRole ? ' (System)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.roleId && (
                <p className="text-xs text-error">{form.formState.errors.roleId.message}</p>
              )}
            </div>
            <div className="flex items-start gap-2 p-3 bg-info/10 rounded-md">
              <Info className="size-4 text-info shrink-0 mt-0.5" />
              <p className="text-xs text-foreground-secondary">
                An invitation email will be sent with a link valid for 7 days.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={createInvitation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createInvitation.isPending}>
              {createInvitation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
