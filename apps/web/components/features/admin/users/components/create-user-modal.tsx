'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, type JSX } from 'react';
import { useForm } from 'react-hook-form';

import { createUserSchema, type CreateUserFormData } from '../schemas/create-user.schema';

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
  PasswordInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import {
  useAdminUserMutations,
  useCheckUserAvailability,
  type AdminUser,
} from '@/lib/hooks/resources';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserModal({ open, onOpenChange }: CreateUserModalProps): JSX.Element {
  const { user: currentUser } = useAuth();
  const { create: createUser } = useAdminUserMutations();
  const availability = useCheckUserAvailability();

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      employeeId: '',
      department: '',
      designation: '',
      status: 'active',
    },
  });

  const watchedEmail = form.watch('email');
  const watchedPhone = form.watch('phone');
  const debouncedEmail = useDebounce(watchedEmail, 500);
  const debouncedPhone = useDebounce(watchedPhone, 500);

  useEffect(() => {
    if (debouncedEmail) availability.checkEmail(debouncedEmail);
  }, [debouncedEmail, availability.checkEmail]);

  useEffect(() => {
    if (debouncedPhone) availability.checkPhone(debouncedPhone);
  }, [debouncedPhone, availability.checkPhone]);

  const handleClose = (isOpen: boolean): void => {
    if (!isOpen) {
      form.reset();
      availability.clearErrors();
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: CreateUserFormData): Promise<void> => {
    if (availability.hasErrors) return;

    try {
      const profileData: Record<string, unknown> = {};
      if (data.employeeId) profileData.employeeId = data.employeeId;
      if (data.department) profileData.department = data.department;
      if (data.designation) profileData.designation = data.designation;

      const payload: Record<string, unknown> = {
        firstName: data.firstName,
        phone: `+91${data.phone}`,
        password: data.password,
        status: data.status,
      };
      if (data.lastName) payload.lastName = data.lastName;
      if (data.email) payload.email = data.email;

      if (currentUser?.organizationId) {
        payload.organizationId = currentUser.organizationId;
        payload.profileType = 'employee';
        if (Object.keys(profileData).length > 0) {
          payload.profileData = profileData;
        }
      }

      await createUser.mutateAsync(payload as Partial<AdminUser>);
      handleClose(false);
    } catch (err) {
      const message = getErrorMessage(err);
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes('email') && lowerMsg.includes('already')) {
        form.setError('email', { message: 'This email is already registered' });
      } else if (lowerMsg.includes('phone') && lowerMsg.includes('already')) {
        form.setError('phone', { message: 'This phone number is already registered' });
      } else if (lowerMsg.includes('employee id') && lowerMsg.includes('already')) {
        form.setError('employeeId', {
          message: 'This Employee ID already exists in your organization',
        });
      }
    }
  };

  const emailError = form.formState.errors.email?.message || availability.errors.email;
  const phoneError = form.formState.errors.phone?.message || availability.errors.phone;
  const isSubmitDisabled =
    createUser.isPending || availability.hasErrors || availability.isAnyChecking;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
          <DialogDescription>Create a new employee account with profile details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" placeholder="e.g., Rahul" {...form.register('firstName')} />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-error">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="e.g., Sharma" {...form.register('lastName')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g., rahul@company.com"
                  {...form.register('email')}
                />
                {availability.isChecking.email && (
                  <p className="text-xs text-foreground-tertiary flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" /> Checking...
                  </p>
                )}
                {emailError && !availability.isChecking.email && (
                  <p className="text-xs text-error">{emailError}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  Phone * <span className="text-foreground-tertiary font-normal">(10 digits)</span>
                </Label>
                <Input
                  id="phone"
                  placeholder="e.g., 9876543210"
                  maxLength={10}
                  inputMode="numeric"
                  {...form.register('phone', {
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                      e.target.value = e.target.value.replace(/\D/g, '');
                    },
                  })}
                />
                {availability.isChecking.phone && (
                  <p className="text-xs text-foreground-tertiary flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" /> Checking...
                  </p>
                )}
                {phoneError && !availability.isChecking.phone && (
                  <p className="text-xs text-error">{phoneError}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password *</Label>
              <PasswordInput
                id="password"
                placeholder="Minimum 8 characters"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-error">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="border-t border-border-light pt-4 mt-2">
              <p className="text-sm font-medium text-foreground-secondary mb-3">Employee Profile</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input
                    id="employeeId"
                    placeholder="e.g., EMP001"
                    {...form.register('employeeId')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="e.g., Sales"
                    {...form.register('department')}
                  />
                </div>
              </div>
              <div className="space-y-1.5 mt-4">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  placeholder="e.g., Sales Executive"
                  {...form.register('designation')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.watch('status') ?? 'active'}
                onValueChange={(v) => form.setValue('status', v as CreateUserFormData['status'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={createUser.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              {createUser.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Employee'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
