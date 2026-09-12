'use client';

import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import { ListSubheader, MenuItem } from '@mui/material';
import {
  BANK_CATEGORY_LABELS,
  BANK_CATEGORY_ORDER,
  BANK_OTHER,
  bankLabel,
  banksByCategory,
  isCustomBank,
} from '@tejas96/shared/constants';
import { DocumentEntityType, DocumentTag } from '@tejas96/shared/types';
import * as React from 'react';
import { useFormContext } from 'react-hook-form';

import { PROPERTY_ALERTS } from '../../constants';

import { Alert } from '@/components/shared';
import { DocumentManager, type DraftDocument } from '@/components/shared/document-manager';
import { MUIInput, MUISelect, MUISwitch, MUITypography } from '@/components/ui';

interface FinancingFieldsProps {
  isEditMode: boolean;
  propertyId?: string;
  isSubmitting: boolean;
  handleDraftDocsChange: (docs: DraftDocument[]) => void;
}

const BANK_PLACEHOLDER = 'Select a bank or NBFC…';

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

  /**
   * "Other" is never stored, so on an edit it has to be inferred: a value that
   * is none of our codes IS the name somebody typed. The state covers only the
   * gap between picking Other and typing anything, when the field is empty and
   * there is nothing to infer from.
   */
  const [otherPicked, setOtherPicked] = React.useState(false);
  const showOther = otherPicked || isCustomBank(financingBank);

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
            if (!checked) {
              setOtherPicked(false);
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

          <div className="space-y-2">
            <MUISelect
              fieldLabel="Which lender?"
              placeholder={BANK_PLACEHOLDER}
              value={showOther ? BANK_OTHER : financingBank}
              disabled={isSubmitting}
              onChange={(e) => {
                const picked = e.target.value as string;
                setOtherPicked(picked === BANK_OTHER);
                // Picking Other empties the field so the text box below starts
                // blank — the sentinel itself must never reach the form.
                setBank(picked === BANK_OTHER ? '' : picked);
              }}
              renderValue={(selected) => {
                const value = selected as string;
                if (!value) {
                  return <span className="text-foreground-secondary">{BANK_PLACEHOLDER}</span>;
                }
                return value === BANK_OTHER ? 'Other' : bankLabel(value);
              }}
            >
              {/*
                The field is optional, so there has to be a way back out of it.
                Without this row a rep who picks the wrong bank — or learns the
                customer has not decided after all — cannot undo the choice,
                because a plain Select has no way to return to empty.
              */}
              <MenuItem value="">
                <span className="text-foreground-secondary">Not decided yet</span>
              </MenuItem>
              {BANK_CATEGORY_ORDER.flatMap((category) => [
                <ListSubheader key={category}>{BANK_CATEGORY_LABELS[category]}</ListSubheader>,
                ...banksByCategory(category).map((bank) => (
                  <MenuItem key={bank.code} value={bank.code}>
                    {bank.label}
                  </MenuItem>
                )),
              ])}
              <MenuItem value={BANK_OTHER}>Other</MenuItem>
            </MUISelect>

            {showOther ? (
              <MUIInput
                autoFocus
                fieldLabel="Lender name"
                placeholder="e.g. Kolhapur District Co-op Bank"
                disabled={isSubmitting}
                inputProps={{ maxLength: 100 }}
                value={financingBank}
                onChange={(e) => setBank(e.target.value)}
              />
            ) : (
              <MUITypography variant="body" className="text-foreground-secondary block">
                Optional. Leave it blank if the customer has not decided yet.
              </MUITypography>
            )}
          </div>

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
