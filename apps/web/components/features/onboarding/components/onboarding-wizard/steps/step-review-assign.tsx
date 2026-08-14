'use client';

import { Box } from '@mui/material';
import type { StoredChangeRequest } from '@tejas96/shared/types';
import * as React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { type CustomerResponse } from '@/components/features/customers';
import { useEmployees } from '@/components/features/employees';
import {
  ReviewSummary,
  type ReviewStepIndices,
} from '@/components/features/properties/components/property-fields';
import { type DraftDocument } from '@/components/shared/document-manager';
import { MUIUserAssigneeSelector } from '@/components/ui';
import { MUIDatePicker } from '@/components/ui/mui-date-picker';
import { color, radius } from '@/lib/theme/tokens';

interface StepReviewAssignProps {
  isEditMode: boolean;
  propertyId?: string;
  resolvedCustomer?: CustomerResponse;
  propertyDraftDocs: DraftDocument[];
  loanDraftDocs: DraftDocument[];
  convertedChangeRequests?: StoredChangeRequest[];
  stepIndices: Partial<ReviewStepIndices>;
  onJumpToStep: (stepIndex: number) => void;
}

export function StepReviewAssign({
  isEditMode,
  propertyId,
  resolvedCustomer,
  propertyDraftDocs,
  loanDraftDocs,
  convertedChangeRequests = [],
  stepIndices,
  onJumpToStep,
}: StepReviewAssignProps): React.JSX.Element {
  const { control } = useFormContext();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();

  return (
    <div className="space-y-5">
      <ReviewSummary
        isEditMode={isEditMode}
        propertyId={propertyId}
        resolvedCustomer={resolvedCustomer}
        propertyDraftDocs={propertyDraftDocs}
        loanDraftDocs={loanDraftDocs}
        convertedChangeRequests={convertedChangeRequests}
        onJumpToStep={onJumpToStep}
        stepIndices={stepIndices}
      />

      <Box sx={{ height: 1, background: color['canvas-sunken'] }} />

      {/*
        The first follow-up is required, and this is the only place it can be
        captured before the site exists. Without it a freshly created lead has
        nobody owing it an action from the moment it is saved.
      */}
      <Box>
        <Box sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
          First follow-up
        </Box>
        <Box
          sx={{
            fontSize: 12.5,
            color: color['text-secondary'],
            mt: '2px',
            mb: 1.75,
            maxWidth: 540,
          }}
        >
          Required. The date is prefilled from the lead temperature you picked — change it freely.
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
            p: '13px 15px',
            borderRadius: radius['rf-lg'],
            background: color['canvas-sunken'],
          }}
        >
          <Controller
            name="nextFollowupDate"
            control={control}
            render={({ field, fieldState }) => (
              <MUIDatePicker
                fieldLabel="Next follow-up"
                required
                value={field.value ?? null}
                onChange={field.onChange}
                error={fieldState.error?.message}
                fullWidth
              />
            )}
          />
          <Controller
            name="nextFollowupAssignee"
            control={control}
            render={({ field, fieldState }) => (
              <MUIUserAssigneeSelector
                fieldLabel="Owner"
                required
                placeholder="Pick who owns this lead"
                // The form schema stores '' for "nobody", not null — sending
                // null would fail the uuid-or-empty-string union on submit.
                value={field.value || null}
                onChange={(userId) => field.onChange(userId ?? '')}
                employees={employees}
                optionsLoading={employeesLoading}
                error={fieldState.error?.message}
              />
            )}
          />
        </Box>
      </Box>

      <Box sx={{ height: 1, background: color['canvas-sunken'] }} />

      <Box>
        <Box sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
          Who visits the site?
        </Box>
        <Box
          sx={{
            fontSize: 12.5,
            color: color['text-secondary'],
            mt: '2px',
            mb: 1.75,
            maxWidth: 540,
          }}
        >
          Optional — pick who does the first site visit and technical survey. They can also be
          assigned later from the site record.
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
            p: '13px 15px',
            borderRadius: radius['rf-lg'],
            background: color['canvas-sunken'],
          }}
        >
          <Controller
            name="siteVisitAssignee"
            control={control}
            render={({ field }) => (
              <MUIUserAssigneeSelector
                fieldLabel="Site Visit Assignee"
                placeholder="Unassigned"
                value={field.value || null}
                onChange={(userId) => field.onChange(userId ?? '')}
                employees={employees}
                optionsLoading={employeesLoading}
                // Optional field — without this there is no way back to
                // "Unassigned" once someone has been picked.
                allowUnassign
              />
            )}
          />
          <Controller
            name="siteSurveyAssignee"
            control={control}
            render={({ field }) => (
              <MUIUserAssigneeSelector
                fieldLabel="Technical Surveyor"
                placeholder="Unassigned"
                value={field.value || null}
                onChange={(userId) => field.onChange(userId ?? '')}
                employees={employees}
                optionsLoading={employeesLoading}
                allowUnassign
              />
            )}
          />
        </Box>
      </Box>
    </div>
  );
}
