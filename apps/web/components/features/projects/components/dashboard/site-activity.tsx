'use client';

import AutoAwesome from '@mui/icons-material/AutoAwesome';
import Card from '@mui/material/Card';
import * as React from 'react';

import { MUITypography } from '@/components/ui';

// ============================================================================
// Component
// ============================================================================

export function SiteProgress(): React.JSX.Element {
  return (
    <Card
      elevation={0}
      className="flex-1 lg:w-[35%] p-4 rounded-lg border border-border-light bg-background shadow-card flex flex-col justify-between min-h-[360px] relative overflow-hidden"
    >
      <div>
        <div className="flex items-center justify-between">
          <MUITypography variant="sectionTitle" className="font-semibold text-text-primary">
            Live Site Progress
          </MUITypography>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 animate-pulse">
            <AutoAwesome className="size-2.5" />
            Coming Soon
          </span>
        </div>
        <MUITypography variant="finePrint" className="text-text-secondary mt-0.5">
          Real-time field installation logs and visual photo verifications
        </MUITypography>
      </div>

      {/* Mockup Timeline with Glassmorphic Blur Overlay */}
      <div className="flex-1 flex flex-col gap-3.5 mt-4 relative justify-center">
        {/* Blurred Content */}
        <div className="flex flex-col gap-3 opacity-30 select-none pointer-events-none filter blur-[1.5px]">
          <div className="flex gap-3 items-start border-l border-border-light pl-3.5 ml-2 pb-1">
            <div className="flex flex-col gap-0.5">
              <MUITypography variant="bodyPrimary" className="font-semibold text-text-primary">
                Installer Checked-in
              </MUITypography>
              <MUITypography variant="finePrint" className="text-text-secondary">
                Plot 14, Hinjawadi Sector-3 • 09:30 AM
              </MUITypography>
            </div>
          </div>
          <div className="flex gap-3 items-start border-l border-border-light pl-3.5 ml-2 pb-1">
            <div className="flex flex-col gap-0.5">
              <MUITypography variant="bodyPrimary" className="font-semibold text-text-primary">
                Liaison Documents Uploaded
              </MUITypography>
              <MUITypography variant="finePrint" className="text-text-secondary">
                Gokuldham Residency Block-A • Yesterday
              </MUITypography>
            </div>
          </div>
        </div>

        {/* Glassmorphic Overlay Message Container */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-background/20 backdrop-blur-[4px] rounded-lg">
          <div className="p-3 bg-background border border-border-light rounded-lg shadow-sm text-center max-w-[200px]">
            <MUITypography variant="sectionTitle" className="font-semibold text-text-primary block">
              Site Progress
            </MUITypography>
            <MUITypography variant="finePrint" className="text-text-secondary mt-1 block">
              Live field-checkins and time-stamped installer logs coming in the next release.
            </MUITypography>
          </div>
        </div>
      </div>
    </Card>
  );
}
