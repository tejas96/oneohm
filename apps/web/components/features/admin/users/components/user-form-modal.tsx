'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { normalizeBusinessIdentifier } from '@tejas96/shared/utils';
import { AlertCircle, Info, Loader2 } from 'lucide-react';
import { useEffect, useRef, type JSX } from 'react';
import { useForm } from 'react-hook-form';

import {
  createUserSchema,
  editUserSchema,
  type CreateUserFormData,
} from '../schemas/user-form.schema';

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
  PasswordInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import {
  useAdminUser,
  useAdminUserMutations,
  useCheckUserAvailability,
  useUserEmployeeProfile,
  useEmployeeProfileMutations,
  type AdminUser,
} from '@/lib/hooks/resources';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { getErrorMessage, normalizePhoneToE164, stripPhoneCountryCode } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  userId?: string;
  onCreated?: (user: AdminUser) => void;
}

type FormData = Omit<CreateUserFormData, 'password'> & { password?: string };

export function UserFormModal({
  open,
  onOpenChange,
  mode,
  userId,
  onCreated,
}: UserFormModalProps): JSX.Element {
  const isEdit = mode === 'edit';
  const { user: currentUser } = useAuth();
  const { create: createUser, update: updateUser } = useAdminUserMutations();
  const { update: updateEmployeeProfile } = useEmployeeProfileMutations();
  const availability = useCheckUserAvailability(
    isEdit ? userId : undefined,
    isEdit ? undefined : currentUser?.organizationId,
  );

  const schema = isEdit ? editUserSchema : createUserSchema;

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      ...(isEdit ? {} : { password: '' }),
      profileKind: 'staff',
      employeeId: '',
      department: '',
      designation: '',
      companyName: '',
      companyCode: '',
      commissionPercentage: '',
      gstin: '',
      pan: '',
      contactPersonName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      accountHolderName: '',
      status: 'active',
    },
  });

  // Fetch user data for edit mode
  const {
    data: userData,
    isLoading: isLoadingUser,
    isError: isUserError,
    error: userError,
    refetch: refetchUser,
  } = useAdminUser(userId ?? '', { enabled: isEdit && !!userId && open });

  // Fetch employee profile details for edit mode
  const {
    data: employeeProfileData,
    isLoading: isLoadingProfile,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useUserEmployeeProfile(isEdit && open ? (userId ?? '') : '');

  const hasPopulated = useRef(false);
  const originalValues = useRef<{ email: string; phone: string }>({ email: '', phone: '' });

  useEffect(() => {
    const isProfileLoaded = !isEdit || employeeProfileData !== undefined;
    if (isEdit && userData && isProfileLoaded && !hasPopulated.current) {
      const phone = stripPhoneCountryCode(userData.phone);
      const email = userData.email ?? '';
      form.reset({
        firstName: userData.firstName,
        lastName: userData.lastName ?? '',
        email,
        phone,
        profileKind: employeeProfileData?.profileKind ?? 'staff',
        employeeId: employeeProfileData?.employeeId ?? '',
        department: employeeProfileData?.department ?? '',
        designation: employeeProfileData?.designation ?? '',
        companyName: employeeProfileData?.companyName ?? '',
        companyCode: employeeProfileData?.companyCode ?? '',
        commissionPercentage: employeeProfileData?.commissionPercentage
          ? String(employeeProfileData.commissionPercentage)
          : '',
        gstin: employeeProfileData?.gstin ?? '',
        pan: employeeProfileData?.pan ?? '',
        contactPersonName: employeeProfileData?.contactPersonName ?? '',
        bankName: employeeProfileData?.bankName ?? '',
        accountNumber: employeeProfileData?.accountNumber ?? '',
        ifscCode: employeeProfileData?.ifscCode ?? '',
        accountHolderName: employeeProfileData?.accountHolderName ?? '',
        status: userData.status as 'active' | 'inactive' | 'suspended',
      });
      originalValues.current = { email, phone };
      hasPopulated.current = true;
    }
  }, [isEdit, userData, employeeProfileData, form]);

  useEffect(() => {
    hasPopulated.current = false;
    originalValues.current = { email: '', phone: '' };
  }, [userId, open]);

  // Availability checks
  const watchedEmail = form.watch('email') ?? '';
  const watchedPhone = form.watch('phone') ?? '';
  const debouncedEmail = useDebounce(watchedEmail, 500);
  const debouncedPhone = useDebounce(watchedPhone, 500);

  useEffect(() => {
    if (debouncedEmail && debouncedEmail !== originalValues.current.email) {
      availability.checkEmail(debouncedEmail);
    }
  }, [debouncedEmail, availability.checkEmail]);

  useEffect(() => {
    availability.setContextPhone(debouncedPhone);
    if (debouncedPhone && debouncedPhone !== originalValues.current.phone) {
      availability.checkPhone(debouncedPhone);
    }
  }, [debouncedPhone, availability.checkPhone, availability.setContextPhone]);

  const queryClient = useQueryClient();

  const handleClose = (isOpen: boolean): void => {
    if (!isOpen) {
      form.reset();
      availability.clearErrors();
      availability.clearPhoneInfo();
      hasPopulated.current = false;
      originalValues.current = { email: '', phone: '' };
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: FormData): Promise<void> => {
    if (availability.hasErrors) return;

    try {
      const profileData: Record<string, unknown> = {};
      if (data.profileKind === 'reseller') {
        if (data.companyName) profileData.companyName = data.companyName;
        if (data.companyCode) profileData.companyCode = data.companyCode;
        if (data.contactPersonName) profileData.contactPersonName = data.contactPersonName;
        if (data.commissionPercentage) {
          profileData.commissionPercentage = parseFloat(data.commissionPercentage);
        }
        if (data.gstin) profileData.gstin = normalizeBusinessIdentifier(data.gstin);
        if (data.pan) profileData.pan = normalizeBusinessIdentifier(data.pan);
        if (data.bankName) profileData.bankName = data.bankName;
        if (data.accountNumber) profileData.accountNumber = data.accountNumber;
        if (data.ifscCode) profileData.ifscCode = normalizeBusinessIdentifier(data.ifscCode);
        if (data.accountHolderName) profileData.accountHolderName = data.accountHolderName;
      } else {
        if (data.employeeId) profileData.employeeId = data.employeeId;
        if (data.department) profileData.department = data.department;
        if (data.designation) profileData.designation = data.designation;
      }

      if (isEdit && userId) {
        const payload: Record<string, unknown> = {
          firstName: data.firstName,
          phone: normalizePhoneToE164(data.phone),
          status: data.status,
        };
        if (data.lastName) payload.lastName = data.lastName;
        if (data.email) payload.email = data.email;

        // Update user core fields
        await updateUser.mutateAsync({ id: userId, data: payload as Partial<AdminUser> });

        // Update profile fields
        if (employeeProfileData?.id) {
          const editProfileData = { ...profileData };
          delete editProfileData.companyCode; // companyCode is immutable on edit
          await updateEmployeeProfile.mutateAsync({
            id: employeeProfileData.id,
            data: editProfileData,
          });
        }
      } else {
        const createData = data as CreateUserFormData;
        const payload: Record<string, unknown> = {
          firstName: createData.firstName,
          phone: normalizePhoneToE164(createData.phone),
          password: createData.password,
          status: createData.status,
        };
        if (createData.lastName) payload.lastName = createData.lastName;
        if (createData.email) payload.email = createData.email;

        if (currentUser?.organizationId) {
          payload.organizationId = currentUser.organizationId;
          payload.profileType = data.profileKind === 'reseller' ? 'reseller' : 'employee';
          if (Object.keys(profileData).length > 0) {
            payload.profileData = profileData;
          }
        }

        const createdUser = await createUser.mutateAsync(payload as Partial<AdminUser>);
        onCreated?.(createdUser);
      }

      // Invalidate queries to trigger UI refresh
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['employee-profile'] });

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
      } else if (lowerMsg.includes('company code') && lowerMsg.includes('already')) {
        form.setError('companyCode', {
          message: 'This Company Code already exists in your organization',
        });
      }
    }
  };

  const emailError =
    (form.formState.errors as Record<string, { message?: string }>).email?.message ||
    availability.errors.email;
  const phoneError = form.formState.errors.phone?.message || availability.errors.phone;
  const isMutating =
    createUser.isPending || updateUser.isPending || updateEmployeeProfile.isPending;
  const isSubmitDisabled = isMutating || availability.hasErrors || availability.isAnyChecking;
  const isSelf = isEdit && currentUser?.id === userId;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update employee details.'
              : 'Create a new employee account with profile details.'}
          </DialogDescription>
        </DialogHeader>

        {isEdit && (isLoadingUser || isLoadingProfile) && (
          <DialogBody>
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-foreground-secondary">Loading details...</p>
              </div>
            </div>
          </DialogBody>
        )}

        {isEdit && (isUserError || isProfileError) && !isLoadingUser && !isLoadingProfile && (
          <DialogBody>
            <div className="flex items-center gap-3 p-4 rounded-lg border border-error/30 bg-error/5">
              <AlertCircle className="size-5 text-error shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm text-error">Failed to load details</p>
                <p className="text-xs text-foreground-secondary mt-0.5">
                  {userError?.message || 'Failed to load employee profile details.'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void refetchUser();
                  void refetchProfile();
                }}
              >
                Retry
              </Button>
            </div>
          </DialogBody>
        )}

        {(!isEdit || (!isLoadingUser && !isLoadingProfile && !isUserError && !isProfileError)) && (
          <DialogForm onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
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
                  <Label htmlFor="email">{isEdit ? 'Email' : 'Email *'}</Label>
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
                    Phone *{' '}
                    <span className="text-foreground-tertiary font-normal">(10 digits)</span>
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
                  {availability.phoneInfo && !availability.isChecking.phone && (
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <Info className="size-3 shrink-0" /> {availability.phoneInfo}
                    </p>
                  )}
                  {phoneError && !availability.isChecking.phone && (
                    <p className="text-xs text-error">{phoneError}</p>
                  )}
                </div>
              </div>

              {!isEdit && (
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password *</Label>
                  <PasswordInput
                    id="password"
                    placeholder="Minimum 8 characters"
                    {...form.register('password')}
                  />
                  {(form.formState.errors as Record<string, { message?: string }>).password && (
                    <p className="text-xs text-error">
                      {
                        (form.formState.errors as Record<string, { message?: string }>).password
                          ?.message
                      }
                    </p>
                  )}
                </div>
              )}

              <div className="pt-4 mt-2">
                <div className="space-y-1.5 mb-4">
                  <Label htmlFor="profileKind">Profile Type</Label>
                  <Select
                    value={form.watch('profileKind') ?? 'staff'}
                    onValueChange={(v) => form.setValue('profileKind', v as 'staff' | 'reseller')}
                    disabled={isEdit}
                  >
                    <SelectTrigger id="profileKind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff Employee</SelectItem>
                      <SelectItem value="reseller">Reseller Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.watch('profileKind') === 'staff' ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-foreground-secondary">Employee Profile</p>
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
                  <div className="space-y-1.5">
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      placeholder="e.g., Sales Executive"
                      {...form.register('designation')}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-foreground-secondary">Reseller Profile</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        placeholder="e.g., QA Solar Partners"
                        {...form.register('companyName')}
                      />
                      {form.formState.errors.companyName && (
                        <p className="text-xs text-error">
                          {(form.formState.errors.companyName as any).message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="companyCode">Company Code *</Label>
                      <Input
                        id="companyCode"
                        placeholder="e.g., QA-RES-001"
                        disabled={isEdit}
                        {...form.register('companyCode')}
                      />
                      {form.formState.errors.companyCode && (
                        <p className="text-xs text-error">
                          {(form.formState.errors.companyCode as any).message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="contactPersonName">Contact Person Name</Label>
                      <Input
                        id="contactPersonName"
                        placeholder="e.g., Jane Doe"
                        {...form.register('contactPersonName')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="commissionPercentage">Commission Percentage *</Label>
                      <Input
                        id="commissionPercentage"
                        placeholder="e.g., 5.0"
                        {...form.register('commissionPercentage')}
                      />
                      {form.formState.errors.commissionPercentage && (
                        <p className="text-xs text-error">
                          {(form.formState.errors.commissionPercentage as any).message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="gstin">GSTIN</Label>
                      <Input
                        id="gstin"
                        placeholder="e.g., 29ABCDE1234F1Z5"
                        {...form.register('gstin')}
                      />
                      {form.formState.errors.gstin && (
                        <p className="text-xs text-error">
                          {(form.formState.errors.gstin as { message?: string }).message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pan">PAN</Label>
                      <Input id="pan" placeholder="e.g., ABCDE1234F" {...form.register('pan')} />
                      {form.formState.errors.pan && (
                        <p className="text-xs text-error">
                          {(form.formState.errors.pan as { message?: string }).message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-2 space-y-4">
                    <p className="text-sm font-medium text-foreground-secondary">Bank Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="bankName">Bank Name</Label>
                        <Input
                          id="bankName"
                          placeholder="e.g., HDFC Bank"
                          {...form.register('bankName')}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="accountNumber">Account Number</Label>
                        <Input
                          id="accountNumber"
                          placeholder="e.g., 50100123456789"
                          {...form.register('accountNumber')}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="ifscCode">IFSC Code</Label>
                        <Input
                          id="ifscCode"
                          placeholder="e.g., HDFC0000123"
                          {...form.register('ifscCode')}
                        />
                        {form.formState.errors.ifscCode && (
                          <p className="text-xs text-error">
                            {(form.formState.errors.ifscCode as { message?: string }).message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="accountHolderName">Account Holder Name</Label>
                        <Input
                          id="accountHolderName"
                          placeholder="e.g., QA Solar Partners"
                          {...form.register('accountHolderName')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.watch('status') ?? 'active'}
                  onValueChange={(v) => form.setValue('status', v as FormData['status'])}
                  disabled={isSelf}
                >
                  <SelectTrigger
                    id="status"
                    className={isSelf ? 'opacity-60 cursor-not-allowed' : ''}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                {isSelf && (
                  <p className="text-xs text-foreground-tertiary">
                    You cannot change your own status
                  </p>
                )}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isMutating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitDisabled}>
                {isMutating ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {isEdit ? 'Saving...' : 'Creating...'}
                  </>
                ) : isEdit ? (
                  'Save Changes'
                ) : (
                  'Create Employee'
                )}
              </Button>
            </DialogFooter>
          </DialogForm>
        )}
      </DialogContent>
    </Dialog>
  );
}
