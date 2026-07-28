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
import { MUISelect } from '@/components/ui';
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

  const employeeOptions = employees.map((emp) => ({
    value: emp.userId,
    label: emp.user ? `${emp.user.firstName} ${emp.user.lastName ?? ''}`.trim() : emp.userId,
  }));

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
              <MUISelect
                fieldLabel="Site Visit Assignee"
                placeholder="Unassigned"
                disabled={employeesLoading}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value)}
                options={employeeOptions}
              />
            )}
          />
          <Controller
            name="siteSurveyAssignee"
            control={control}
            render={({ field }) => (
              <MUISelect
                fieldLabel="Technical Surveyor"
                placeholder="Unassigned"
                disabled={employeesLoading}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value)}
                options={employeeOptions}
              />
            )}
          />
        </Box>
      </Box>
    </div>
  );
}
