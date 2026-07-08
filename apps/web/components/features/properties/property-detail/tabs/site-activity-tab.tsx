'use client';

import { Box, Typography } from '@mui/material';
import type { JSX } from 'react';

import { SiteActivityTab } from '@/components/features/site-activities/components';

interface PropertySiteActivityTabProps {
  propertyId: string;
  enabled: boolean;
}

export function PropertySiteActivityTab({
  propertyId,
  enabled,
}: PropertySiteActivityTabProps): JSX.Element {
  if (!enabled) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Open this tab to load site activities.
        </Typography>
      </Box>
    );
  }
  return <SiteActivityTab propertyId={propertyId} />;
}
