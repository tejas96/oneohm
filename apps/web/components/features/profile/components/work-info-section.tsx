'use client';

import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import { Card, CardContent } from '@mui/material';
import type { JSX } from 'react';

import { MUITypography } from '@/components/ui';
import type { EmployeeProfile } from '@/lib/hooks/resources';
import { formatDate } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────

interface WorkInfoSectionProps {
  profile: EmployeeProfile;
}

// ── Sub-component ──────────────────────────────────────────────

function WorkInfoRow({ label, value }: { label: string; value: string | undefined }): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <MUITypography variant="timestamp" className="text-foreground-tertiary">
        {label}
      </MUITypography>
      <MUITypography variant="bodyPrimary">
        {value ?? <span className="text-foreground-tertiary italic">Not set</span>}
      </MUITypography>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────

export function WorkInfoSection({ profile }: WorkInfoSectionProps): JSX.Element {
  const joiningDateFormatted = profile.joiningDate ? formatDate(profile.joiningDate) : undefined;

  return (
    <Card variant="outlined">
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BusinessCenterIcon sx={{ fontSize: 18 }} className="text-foreground-secondary" />
            <MUITypography variant="sectionTitle">Work Information</MUITypography>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <WorkInfoRow label="Employee ID" value={profile.employeeId} />
            <WorkInfoRow label="Designation" value={profile.designation} />
            <WorkInfoRow label="Department" value={profile.department} />
            <WorkInfoRow label="Joining Date" value={joiningDateFormatted} />
          </div>

          <MUITypography variant="finePrint" className="text-foreground-tertiary">
            These fields are managed by your administrator and cannot be changed here.
          </MUITypography>
        </div>
      </CardContent>
    </Card>
  );
}
