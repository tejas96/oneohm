/* eslint-disable @typescript-eslint/no-unsafe-return -- invite API response handling */
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Info } from 'lucide-react';
import { type JSX } from 'react';
import { useForm, Controller } from 'react-hook-form';

import { inviteUserSchema, type InviteUserFormData } from '../schemas/invite-user.schema';

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogForm,
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
import { useModalForm } from '@/lib/hooks/core';
import { useInvitationMutations, useRoles, type Invitation } from '@/lib/hooks/resources';
import { useAuth } from '@/providers/auth-provider';

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserModal({ open, onOpenChange }: InviteUserModalProps): JSX.Element {
  const { user: currentUser } = useAuth();
  const invitationMutations = useInvitationMutations();
  const { items: allRoles } = useRoles({ syncToUrl: false, defaultPageSize: 100 });
  const availableRoles = allRoles.filter((r) => r.organizationId !== null);

  const form = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { email: '', roleId: '' },
  });

  const { handleSubmit, handleClose, isSubmitting } = useModalForm<
    InviteUserFormData,
    Partial<Invitation>
  >({
    form,
    mutation: invitationMutations.create,
    onOpenChange,
    transformPayload: (data) => ({
      email: data.email,
      roleId: data.roleId,
      organizationId: currentUser?.organizationId || '',
    }),
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Invite Employee</DialogTitle>
          <DialogDescription>Send an email invitation to onboard a new employee.</DialogDescription>
        </DialogHeader>
        <DialogForm onSubmit={(e) => void handleSubmit(e)}>
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
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  );
}
