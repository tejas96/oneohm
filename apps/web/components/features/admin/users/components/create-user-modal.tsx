'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, type ChangeEvent, type JSX } from 'react';
import { useForm } from 'react-hook-form';

import {
  createUserSchema,
  editUserSchema,
  type CreateUserFormData,
  type EditUserFormData,
} from '../schemas/create-user.schema';

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
import { apiClient } from '@/lib/api/client';
import {
  useAdminUserMutations,
  useCheckUserAvailability,
  type AdminUser,
} from '@/lib/hooks/resources';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

type UserFormData = CreateUserFormData | EditUserFormData;

interface EmployeeProfileSummary {
  id: string;
  userId: string;
  organizationId: string;
  employeeId?: string | null;
  department?: string | null;
  designation?: string | null;
}

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'create' | 'edit';
  user?: AdminUser;
}

export function CreateUserModal({
  open,
  onOpenChange,
  mode = 'create',
  user,
}: CreateUserModalProps): JSX.Element {
  const isEditMode = mode === 'edit';
  const { user: currentUser } = useAuth();
  const { create: createUser, update: updateUser } = useAdminUserMutations();
  const availability = useCheckUserAvailability();

  const employeeProfileQuery = useQuery({
    queryKey: ['admin-users', 'employee-profile', user?.id, currentUser?.organizationId],
    queryFn: async (): Promise<EmployeeProfileSummary | null> => {
      if (!user?.id) return null;
      const response = await apiClient.get<unknown>(`/employees/user/${user.id}`);
      if (!Array.isArray(response.data) || response.data.length === 0) return null;
      const profiles = response.data as EmployeeProfileSummary[];
      if (currentUser?.organizationId) {
        return profiles.find((p) => p.organizationId === currentUser.organizationId) ?? null;
      }
      return profiles[0] ?? null;
    },
    enabled: isEditMode && open && !!user?.id,
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(isEditMode ? editUserSchema : createUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: undefined,
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
    if (isEditMode) return;
    if (debouncedEmail) availability.checkEmail(debouncedEmail);
  }, [isEditMode, debouncedEmail, availability.checkEmail]);

  useEffect(() => {
    if (isEditMode) return;
    if (debouncedPhone) availability.checkPhone(debouncedPhone);
  }, [isEditMode, debouncedPhone, availability.checkPhone]);

  useEffect(() => {
    if (!open) return;
    if (!isEditMode || !user) return;

    form.reset({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      phone: user.phone?.replace(/^\+91/, '') ?? '',
      password: undefined,
      employeeId: employeeProfileQuery.data?.employeeId ?? '',
      department: employeeProfileQuery.data?.department ?? '',
      designation: employeeProfileQuery.data?.designation ?? '',
      status: (user.status as UserFormData['status']) ?? 'active',
    });
  }, [open, isEditMode, user, employeeProfileQuery.data, form]);

  const handleClose = (isOpen: boolean): void => {
    if (!isOpen) {
      form.reset();
      availability.clearErrors();
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: UserFormData): Promise<void> => {
    if (!isEditMode && availability.hasErrors) return;

    try {
      if (isEditMode) {
        if (!user?.id) return;

        const userPayload: Partial<AdminUser> = {
          firstName: data.firstName,
          lastName: data.lastName || undefined,
          phone: `+91${data.phone}`,
          status: data.status,
        };

        await updateUser.mutateAsync({ id: user.id, data: userPayload });

        if (employeeProfileQuery.data?.id) {
          await apiClient.put(`/employees/${employeeProfileQuery.data.id}`, {
            employeeId: data.employeeId || undefined,
            department: data.department || undefined,
            designation: data.designation || undefined,
            status: data.status,
          });
        }
      } else {
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
      }

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
  const isSaving = createUser.isPending || updateUser.isPending;
  const isSubmitDisabled =
    isSaving ||
    (isEditMode ? false : availability.hasErrors || availability.isAnyChecking) ||
    (isEditMode && employeeProfileQuery.isLoading);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update employee details and save changes.'
              : 'Create a new employee account with profile details.'}
          </DialogDescription>
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
                  disabled={isEditMode}
                  {...form.register('email')}
                />
                {!isEditMode && availability.isChecking.email && (
                  <p className="text-xs text-foreground-tertiary flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" /> Checking...
                  </p>
                )}
                {emailError && !availability.isChecking.email && !isEditMode && (
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
                    onChange: (e: ChangeEvent<HTMLInputElement>) => {
                      e.target.value = e.target.value.replace(/\D/g, '');
                    },
                  })}
                />
                {!isEditMode && availability.isChecking.phone && (
                  <p className="text-xs text-foreground-tertiary flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" /> Checking...
                  </p>
                )}
                {phoneError && !availability.isChecking.phone && !isEditMode && (
                  <p className="text-xs text-error">{phoneError}</p>
                )}
              </div>
            </div>

            {!isEditMode && (
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
            )}

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
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {isEditMode ? 'Saving...' : 'Creating...'}
                </>
              ) : isEditMode ? (
                'Save Changes'
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
