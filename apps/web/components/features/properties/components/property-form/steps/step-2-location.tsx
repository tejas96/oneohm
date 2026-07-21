'use client';

import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { Card, CardContent } from '@mui/material';
import * as React from 'react';

import { type CustomerResponse } from '../../../../customers';
import { PROPERTY_ALERTS } from '../../../constants';

import { Alert, MUIAddressAutocomplete } from '@/components/shared';
import { MUITypography } from '@/components/ui';

interface Step2LocationProps {
  isEditMode: boolean;
  customer?: CustomerResponse;
}

export function Step2Location({ isEditMode, customer }: Step2LocationProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <Card variant="outlined">
        <div className="flex items-center gap-3 px-5 py-3">
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            <PlaceOutlinedIcon fontSize="small" />
          </div>
          <div className="flex-1 min-w-0">
            <MUITypography variant="sectionTitle">Property Address</MUITypography>
            <MUITypography variant="body">
              Location details for site visits and installation
            </MUITypography>
          </div>
        </div>
        <CardContent className="p-5 space-y-5">
          {!isEditMode && customer?.address && (
            <Alert variant="info" appearance="minimal">
              {PROPERTY_ALERTS.addressPrefill.message}
            </Alert>
          )}

          <MUIAddressAutocomplete showMap required />
        </CardContent>
      </Card>
    </div>
  );
}
