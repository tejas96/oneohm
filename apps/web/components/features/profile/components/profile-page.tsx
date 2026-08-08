'use client';

import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Alert as MuiAlert, AlertTitle, Card, CardContent, Skeleton } from '@mui/material';
import type { JSX } from 'react';

import { AccountSection } from './account-section';
import { AddressSection } from './address-section';
import { PersonalInfoSection } from './personal-info-section';
import { ProfileHeader } from './profile-header';
import { RolesPermissionsSection } from './roles-permissions-section';
import { WorkInfoSection } from './work-info-section';
import { useProfileForm } from '../hooks/use-profile-form';

import { Button, MUITypography } from '@/components/ui';

// ── Skeleton ───────────────────────────────────────────────────

function ProfileSkeleton(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4">
      {/* Hero skeleton */}
      <div className="flex flex-col items-center gap-3 py-6">
        <Skeleton variant="circular" width={96} height={96} />
        <Skeleton variant="text" width={180} height={32} />
        <Skeleton variant="text" width={120} height={20} />
        <div className="flex gap-2">
          <Skeleton variant="rounded" width={70} height={22} />
          <Skeleton variant="rounded" width={80} height={22} />
        </div>
      </div>

      {/* Section skeletons */}
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} variant="outlined">
          <CardContent>
            <Skeleton variant="text" width="30%" height={24} className="mb-4" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton variant="rounded" height={40} />
              <Skeleton variant="rounded" height={40} />
              <Skeleton variant="rounded" height={40} />
              <Skeleton variant="rounded" height={40} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────

function NoProfileState({ onRetry }: { onRetry: () => void }): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-20 text-center">
      <AccountCircleIcon sx={{ fontSize: 72 }} className="text-foreground-tertiary" />
      <MUITypography variant="sectionTitle">No Employee Profile Found</MUITypography>
      <MUITypography variant="body" className="max-w-md text-foreground-secondary">
        Your employee profile has not been set up yet. Please contact your administrator
        administrator.
      </MUITypography>
      <Button variant="outline" onClick={onRetry}>
        <RefreshIcon className="mr-2" sx={{ fontSize: 16 }} />
        Retry
      </Button>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────

export function ProfilePage(): JSX.Element {
  const {
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
    onPersonalSubmit,
    onAddressSubmit,
    avatarUrl,
    isAvatarUploading,
    avatarUploadError,
    onAvatarUpload,
  } = useProfileForm();

  if (isProfileLoading) {
    return <ProfileSkeleton />;
  }

  if (isProfileError) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-10">
        <MuiAlert severity="error" variant="outlined">
          <AlertTitle>Failed to load profile</AlertTitle>
          Unable to fetch your employee profile. Please check your connection and try again.
        </MuiAlert>
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => void refetchProfile()}>
            <RefreshIcon className="mr-2" sx={{ fontSize: 16 }} />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <NoProfileState onRetry={() => void refetchProfile()} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-10">
      {/* ── Hero — no card background, centered ── */}
      <div className="py-8">
        <ProfileHeader
          profile={profile}
          avatarUrl={avatarUrl}
          isAvatarUploading={isAvatarUploading}
          avatarUploadError={avatarUploadError}
          onAvatarUpload={onAvatarUpload}
        />
      </div>

      {/* ── Cards — single column, full width ── */}
      <PersonalInfoSection
        personalForm={personalForm}
        isPersonalSubmitting={isPersonalSubmitting}
        personalError={personalError}
        onPersonalSubmit={onPersonalSubmit}
      />

      <AddressSection
        addressForm={addressForm}
        isAddressSubmitting={isAddressSubmitting}
        addressError={addressError}
        onAddressSubmit={onAddressSubmit}
      />

      <WorkInfoSection profile={profile} />

      <AccountSection profile={profile} />

      <RolesPermissionsSection />
    </div>
  );
}
