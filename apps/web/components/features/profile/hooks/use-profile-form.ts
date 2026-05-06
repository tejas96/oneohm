'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { UserGender } from '@oneohm-epc/shared/types';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  type PersonalInfoFormValues,
  type AddressFormValues,
  personalInfoSchema,
  addressSchema,
} from '../schemas/profile.schema';

import { apiClient } from '@/lib/api/client';
import { FileCategory, uploadFile } from '@/lib/api/storage';
import {
  type EmployeeProfile,
  useCurrentUserEmployeeProfile,
  useEmployeeProfileMutations,
} from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

// ── Types ──────────────────────────────────────────────────────

export interface UseProfileFormReturn {
  profile: EmployeeProfile | null;
  isProfileLoading: boolean;
  isProfileError: boolean;
  refetchProfile: () => void;

  personalForm: ReturnType<typeof useForm<PersonalInfoFormValues>>;
  addressForm: ReturnType<typeof useForm<AddressFormValues>>;

  isPersonalSubmitting: boolean;
  isAddressSubmitting: boolean;
  personalError: string | null;
  addressError: string | null;

  onPersonalSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  onAddressSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;

  avatarUrl: string | null;
  isAvatarUploading: boolean;
  avatarUploadError: string | null;
  onAvatarUpload: (file: File) => Promise<void>;
}

function toDateOrNull(value: string | Date | undefined | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toOptionalString(value: string | undefined | null): string {
  return value ?? '';
}

// ── Hook ───────────────────────────────────────────────────────

export function useProfileForm(): UseProfileFormReturn {
  const { user } = useAuth();
  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useCurrentUserEmployeeProfile();

  const { update } = useEmployeeProfileMutations();

  const [isPersonalSubmitting, setIsPersonalSubmitting] = useState(false);
  const [isAddressSubmitting, setIsAddressSubmitting] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatarUrl ?? null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);

  // ── Personal Form ────────────────────────────────────────────

  const personalForm = useForm<PersonalInfoFormValues>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      alternatePhone: '',
      dateOfBirth: null,
      gender: undefined,
    },
  });

  // ── Address Form ─────────────────────────────────────────────

  const addressForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      address: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
    },
  });

  // ── Sync form defaults when profile loads ────────────────────

  useEffect(() => {
    if (!profile) return;

    personalForm.reset({
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: toOptionalString(profile.phone),
      alternatePhone: toOptionalString(profile.alternatePhone),
      dateOfBirth: toDateOrNull(profile.dateOfBirth),
      gender: (profile.gender as UserGender) ?? undefined,
    });

    addressForm.reset({
      address: toOptionalString(profile.address),
      city: toOptionalString(profile.city),
      state: toOptionalString(profile.state),
      country: profile.country || 'India',
      pincode: toOptionalString(profile.pincode),
    });

    setAvatarUrl(profile.avatarUrl ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // ── Personal Submit ──────────────────────────────────────────

  const handlePersonalSubmit = useCallback(
    async (values: PersonalInfoFormValues): Promise<void> => {
      if (!profile || !user) return;
      setPersonalError(null);
      setIsPersonalSubmitting(true);

      try {
        // Update user name fields via PATCH /users/:id
        await apiClient.patch(`/users/${user.id}`, {
          firstName: values.firstName.trim(),
          lastName: values.lastName?.trim() || undefined,
        });

        // Update employee-specific personal fields via PUT /employees/:id
        await update.mutateAsync({
          id: profile.id,
          data: {
            phone: values.phone?.trim() || undefined,
            alternatePhone: values.alternatePhone?.trim() || undefined,
            dateOfBirth: values.dateOfBirth
              ? values.dateOfBirth.toISOString().split('T')[0]
              : undefined,
            gender: values.gender,
          } as Partial<EmployeeProfile>,
        });

        personalForm.reset(values);
      } catch (err) {
        setPersonalError(getErrorMessage(err));
      } finally {
        setIsPersonalSubmitting(false);
      }
    },
    [profile, user, update, personalForm],
  );

  // ── Address Submit ───────────────────────────────────────────

  const handleAddressSubmit = useCallback(
    async (values: AddressFormValues): Promise<void> => {
      if (!profile) return;
      setAddressError(null);
      setIsAddressSubmitting(true);

      try {
        await update.mutateAsync({
          id: profile.id,
          data: {
            address: values.address?.trim() || undefined,
            city: values.city?.trim() || undefined,
            state: values.state?.trim() || undefined,
            country: values.country.trim(),
            pincode: values.pincode?.trim() || undefined,
          } as Partial<EmployeeProfile>,
        });

        addressForm.reset(values);
      } catch (err) {
        setAddressError(getErrorMessage(err));
      } finally {
        setIsAddressSubmitting(false);
      }
    },
    [profile, update, addressForm],
  );

  // ── Avatar Upload ────────────────────────────────────────────

  const onAvatarUpload = useCallback(
    async (file: File): Promise<void> => {
      if (!profile) return;
      setAvatarUploadError(null);
      setIsAvatarUploading(true);
      const previousUrl = avatarUrl;

      try {
        const result = await uploadFile({
          file,
          category: FileCategory.PROFILE,
          entityId: profile.id,
          entityType: 'employee',
        });

        setAvatarUrl(result.publicUrl);

        await update.mutateAsync({
          id: profile.id,
          data: { avatarUrl: result.publicUrl } as Partial<EmployeeProfile>,
        });
      } catch (err) {
        setAvatarUrl(previousUrl);
        setAvatarUploadError(getErrorMessage(err));
      } finally {
        setIsAvatarUploading(false);
      }
    },
    [profile, avatarUrl, update],
  );

  return {
    profile,
    isProfileLoading,
    isProfileError,
    refetchProfile,

    personalForm,
    addressForm,

    isPersonalSubmitting,
    isAddressSubmitting,
    personalError,
    addressError,

    onPersonalSubmit: personalForm.handleSubmit((v) => void handlePersonalSubmit(v)),
    onAddressSubmit: addressForm.handleSubmit((v) => void handleAddressSubmit(v)),

    avatarUrl,
    isAvatarUploading,
    avatarUploadError,
    onAvatarUpload,
  };
}
