'use client';

import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { Alert, AlertTitle, CircularProgress } from '@mui/material';
import { useRef, type JSX } from 'react';

import { PROFILE_COMPLETION_FIELDS } from '../constants';

import { MUIAvatar, MUIStatusChip, MUITypography } from '@/components/ui';
import type { EmployeeProfile } from '@/lib/hooks/resources';
import { useAuth } from '@/providers/auth-provider';

// ── Types ──────────────────────────────────────────────────────

interface ProfileHeaderProps {
  profile: EmployeeProfile;
  avatarUrl: string | null;
  isAvatarUploading: boolean;
  avatarUploadError: string | null;
  onAvatarUpload: (file: File) => Promise<void>;
}

// ── Helpers ────────────────────────────────────────────────────

function getMissingProfileFields(profile: EmployeeProfile): string[] {
  return PROFILE_COMPLETION_FIELDS.filter(({ key }) => !profile[key as keyof EmployeeProfile]).map(
    ({ label }) => label,
  );
}

function toReadableRole(role: string): string {
  return role.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Component ──────────────────────────────────────────────────

export function ProfileHeader({
  profile,
  avatarUrl,
  isAvatarUploading,
  avatarUploadError,
  onAvatarUpload,
}: ProfileHeaderProps): JSX.Element {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fullName = user
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : profile.user
      ? `${profile.user.firstName} ${profile.user.lastName ?? ''}`.trim()
      : '—';

  const missingFields = getMissingProfileFields(profile);
  const showCompletionBanner = !user?.profileCompleted && missingFields.length > 0;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) void onAvatarUpload(file);
    event.target.value = '';
  };

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {/* Avatar with camera overlay */}
      <div className="relative">
        <MUIAvatar
          name={fullName}
          src={avatarUrl ?? undefined}
          sx={{ width: 96, height: 96, fontSize: '2rem' }}
        />
        <button
          type="button"
          aria-label="Change profile photo"
          onClick={() => fileInputRef.current?.click()}
          disabled={isAvatarUploading}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed"
        >
          {isAvatarUploading ? (
            <CircularProgress size={24} sx={{ color: 'white' }} />
          ) : (
            <PhotoCameraIcon sx={{ color: 'white', fontSize: 24 }} />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Name */}
      <div className="flex flex-col items-center gap-1">
        <MUITypography variant="drawerTitle">{fullName}</MUITypography>

        {(profile.designation || profile.department) && (
          <MUITypography variant="bodyPrimary" className="text-foreground-secondary">
            {[profile.designation, profile.department].filter(Boolean).join(' · ')}
          </MUITypography>
        )}

        {profile.organization?.name && (
          <div className="flex items-center justify-center gap-2">
            <MUITypography variant="timestamp" className="text-foreground-tertiary">
              {profile.organization.name}
            </MUITypography>
            <MUIStatusChip label={profile.status} colorSeed={profile.status} size="small" />
          </div>
        )}

        {/* Role chips */}
        {user?.roles && user.roles.length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {user.roles.map((role) => (
              <MUIStatusChip
                key={role}
                label={toReadableRole(role)}
                colorSeed={role}
                size="small"
                variant="outlined"
              />
            ))}
          </div>
        )}
      </div>

      {/* Avatar upload error */}
      {avatarUploadError ? (
        <div className="w-full max-w-md">
          <Alert severity="error" variant="outlined">
            <AlertTitle>Photo upload failed</AlertTitle>
            {avatarUploadError}
          </Alert>
        </div>
      ) : null}

      {/* Profile completion banner */}
      {showCompletionBanner && (
        <div className="w-full max-w-md">
          <Alert severity="warning" variant="outlined">
            <AlertTitle>Complete your profile</AlertTitle>
            <MUITypography variant="body">
              Missing: <span className="font-medium">{missingFields.join(', ')}</span>
            </MUITypography>
          </Alert>
        </div>
      )}
    </div>
  );
}
