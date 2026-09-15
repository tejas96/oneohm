'use client';

import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import { DocumentEntityType, DocumentTag } from '@tejas96/shared/types';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { PROPERTY_ALERTS } from '../../constants';

import { BankSelect } from '@/components/features/shared/bank-select';
import { Alert } from '@/components/shared';
import { DocumentManager, type DraftDocument } from '@/components/shared/document-manager';
import { MUISwitch, MUITypography } from '@/components/ui';

interface FinancingFieldsProps {
  isEditMode: boolean;
  propertyId?: string;
  isSubmitting: boolean;
  handleDraftDocsChange: (docs: DraftDocument[]) => void;
}

/** Loan toggle + lender + KYC documents. Card chrome is supplied by the wizard's StepCard. */
export function FinancingFields({
  isEditMode,
  propertyId,
  isSubmitting,
  handleDraftDocsChange,
}: FinancingFieldsProps): React.JSX.Element {
  const { setValue, watch } = useFormContext();

  const wantsLoan = Boolean(watch('wantsLoan'));
  const financingBank = (watch('financingBank') as string | undefined) ?? '';

  const setBank = (value: string): void =>
    setValue('financingBank', value, { shouldDirty: true, shouldValidate: true });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between p-4 rounded-lg bg-background-secondary/50">
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
          onCheckedChange={(checked) => {
            setValue('wantsLoan', checked, { shouldDirty: true, shouldValidate: true });
            // A lender only means something next to "wants a loan". Left
            // behind, it keeps printing on the site's Finance tab, which shows
            // the bank whether or not the loan is still wanted.
            //
            // BankSelect itself unmounts with this block, so its internal
            // "Other" picker state resets for free — clearing the stored
            // value here is the only piece this handler still has to do.
            if (!checked) {
              setBank('');
            }
          }}
          disabled={isSubmitting}
        />
      </div>

      {wantsLoan && (
        <>
          <Alert variant="info" appearance="minimal" title={PROPERTY_ALERTS.loanBenefits.title}>
            {PROPERTY_ALERTS.loanBenefits.message}
          </Alert>

          <hr className="border-border-light" />

          <BankSelect
            label="Which lender?"
            value={financingBank}
            onChange={setBank}
            disabled={isSubmitting}
          />

          <hr className="border-border-light" />

          <div className="space-y-2">
            <MUITypography variant="bodyPrimary" className="font-medium">
              Loan Financing Documents
            </MUITypography>
            <MUITypography variant="body" className="text-foreground-secondary block mb-3">
              Upload Aadhaar Card, PAN Card, Bank Statement, ITR, or other verification documents to
              support the financing application.
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
    </div>
  );
}
