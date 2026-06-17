'use client';

import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import { Card, CardContent } from '@mui/material';
import { DocumentEntityType, DocumentTag } from '@tejas96/shared/types';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { PROPERTY_ALERTS } from '../../../constants';

import { Alert } from '@/components/shared';
import { DocumentManager, type DraftDocument } from '@/components/shared/document-manager';
import { MUISwitch, MUITypography } from '@/components/ui';

interface Step5FinancingProps {
  isEditMode: boolean;
  propertyId?: string;
  isSubmitting: boolean;
  handleDraftDocsChange: (docs: DraftDocument[]) => void;
}

export function Step5Financing({
  isEditMode,
  propertyId,
  isSubmitting,
  handleDraftDocsChange,
}: Step5FinancingProps): React.JSX.Element {
  const { setValue, watch } = useFormContext();

  const wantsLoan = Boolean(watch('wantsLoan'));

  return (
    <div className="space-y-6">
      <Card variant="outlined">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border-light">
          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            <CurrencyRupeeIcon fontSize="small" />
          </div>
          <div className="flex-1 min-w-0">
            <MUITypography variant="sectionTitle">Financing Options</MUITypography>
            <MUITypography variant="body">Configure loan preferences & documentation</MUITypography>
          </div>
        </div>
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center justify-between p-4 border border-border-light rounded-lg bg-background-secondary/50">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <CurrencyRupeeIcon sx={{ fontSize: 16 }} />
              </div>
              <div>
                <MUITypography variant="bodyPrimary" className="font-medium">
                  Interested in financing / loan
                </MUITypography>
                <MUITypography variant="body" className="text-foreground-secondary">
                  Enable if customer wants EMI options
                </MUITypography>
              </div>
            </div>
            <MUISwitch
              id="wantsLoan"
              checked={wantsLoan}
              onCheckedChange={(checked) =>
                setValue('wantsLoan', checked, { shouldDirty: true, shouldValidate: true })
              }
              disabled={isSubmitting}
            />
          </div>

          {wantsLoan && (
            <>
              <Alert variant="info" appearance="minimal" title={PROPERTY_ALERTS.loanBenefits.title}>
                {PROPERTY_ALERTS.loanBenefits.message}
              </Alert>

              <hr className="border-border-light my-5" />

              <div className="space-y-2">
                <MUITypography variant="bodyPrimary" className="font-medium">
                  Loan Financing Documents
                </MUITypography>
                <MUITypography variant="body" className="text-foreground-secondary block mb-3">
                  Upload Aadhaar Card, PAN Card, Bank Statement, ITR, or other verification
                  documents to support the financing application.
                </MUITypography>

                <DocumentManager
                  entityType={DocumentEntityType.LOAN}
                  entityId={isEditMode && propertyId ? propertyId : undefined}
                  propertyId={isEditMode ? propertyId : undefined}
                  title="Loan Documents"
                  description="Upload loan-related KYC and financial records."
                  allowedTags={[
                    DocumentTag.AADHAR_CARD,
                    DocumentTag.PAN_CARD,
                    DocumentTag.BANK_STATEMENT,
                    DocumentTag.ITR,
                    DocumentTag.OTHER,
                  ]}
                  readOnly={isSubmitting}
                  disableEntityTypeSelector={true}
                  onDraftDocumentsChange={!isEditMode ? handleDraftDocsChange : undefined}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
