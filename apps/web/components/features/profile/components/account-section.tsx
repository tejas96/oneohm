'use client';

import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LockIcon from '@mui/icons-material/Lock';
import { Card, CardContent, Divider } from '@mui/material';
import type { JSX } from 'react';

import { MUIInput, MUIStatusChip, MUITypography } from '@/components/ui';
import type { EmployeeProfile } from '@/lib/hooks/resources';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

// ── Types ──────────────────────────────────────────────────────

interface AccountSectionProps {
  profile: EmployeeProfile;
}

// ── Component ──────────────────────────────────────────────────

export function AccountSection({ profile }: AccountSectionProps): JSX.Element {
  const { user } = useAuth();

  const memberSince = profile.createdAt ? formatDate(profile.createdAt) : '—';

  return (
    <Card variant="outlined">
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <AccountCircleIcon sx={{ fontSize: 20 }} className="text-foreground-secondary" />
            <MUITypography variant="sectionTitle">Account</MUITypography>
          </div>

          <Divider />

          {/* Email — read only */}
          <div className="flex flex-col gap-1">
            <MUIInput
              id="profile-email"
              fieldLabel="Email Address"
              value={user?.email ?? ''}
              disabled
              helperText="Email address cannot be changed."
              InputProps={{
                endAdornment: (
                  <LockIcon sx={{ fontSize: 16 }} className="text-foreground-tertiary" />
                ),
              }}
            />
          </div>

          {/* Status + join date row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <MUITypography variant="timestamp" className="text-foreground-tertiary">
                Account Status
              </MUITypography>
              <div className="mt-1">
                <MUIStatusChip label={profile.status} colorSeed={profile.status} size="small" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <MUITypography variant="timestamp" className="text-foreground-tertiary">
                Member Since
              </MUITypography>
              <MUITypography variant="bodyPrimary">{memberSince}</MUITypography>
            </div>
          </div>

          {/* Verification status */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <MUITypography variant="timestamp" className="text-foreground-tertiary">
                Email Verified
              </MUITypography>
              <MUIStatusChip
                label={user?.emailVerified ? 'Verified' : 'Not Verified'}
                color={user?.emailVerified ? 'success' : 'warning'}
                size="small"
              />
            </div>
            <div className="flex flex-col gap-1">
              <MUITypography variant="timestamp" className="text-foreground-tertiary">
                Phone Verified
              </MUITypography>
              <MUIStatusChip
                label={user?.phoneVerified ? 'Verified' : 'Not Verified'}
                color={user?.phoneVerified ? 'success' : 'warning'}
                size="small"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
