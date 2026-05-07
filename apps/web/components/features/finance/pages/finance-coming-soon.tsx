'use client';

import HourglassTopOutlinedIcon from '@mui/icons-material/HourglassTopOutlined';
import * as React from 'react';

import { MUITypography } from '@/components/ui';

export interface FinanceComingSoonProps {
  /** Page title shown at the top of the placeholder. */
  title: string;
  /** One-line summary of what this page will show once shipped. */
  description?: string;
}

/**
 * Temporary placeholder rendered by the new Finance routes (slice 5)
 * until the page-specific feature components land in slices 6–10.
 * Kept minimal so we get green builds + working navigation
 * immediately, while the real UI ships incrementally.
 */
export function FinanceComingSoon({
  title,
  description,
}: FinanceComingSoonProps): React.JSX.Element {
  return (
    <div className="flex h-full w-full flex-col">
      <header className="border-border-light border-b px-6 py-4">
        <MUITypography variant="drawerTitle">{title}</MUITypography>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
        <HourglassTopOutlinedIcon
          fontSize="large"
          sx={{ color: 'text.disabled', fontSize: 56 }}
        />
        <MUITypography variant="sectionTitle">Coming soon</MUITypography>
        {description && (
          <MUITypography variant="body" className="text-foreground-secondary max-w-md">
            {description}
          </MUITypography>
        )}
      </div>
    </div>
  );
}
