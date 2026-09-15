'use client';

import { ListSubheader, MenuItem } from '@mui/material';
import {
  BANK_CATEGORY_LABELS,
  BANK_CATEGORY_ORDER,
  BANK_OTHER,
  bankLabel,
  banksByCategory,
  isCustomBank,
} from '@tejas96/shared/constants';
import * as React from 'react';

import { MUIInput, MUISelect, MUITypography } from '@/components/ui';

export interface BankSelectProps {
  /** A `BANKS` code, a name typed under Other, or `''` when nothing is picked. */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

const BANK_PLACEHOLDER = 'Select a bank or NBFC…';

/**
 * Pick the bank financing a property.
 *
 * `financing_bank` is one free-text column holding EITHER a `BANKS` code OR a
 * name typed under Other, so there is nothing to strip on send and no
 * cross-field rule to keep in sync across two apps. `bankLabel` renders both.
 *
 * Extracted from the onboarding wizard so the wizard and the recovery dialog
 * render one list. Two hand-maintained copies of a grouped bank list is how the
 * two drift, and the wizard is where the missing data this dialog repairs comes
 * from in the first place.
 */
export function BankSelect({
  value,
  onChange,
  label = 'Financing bank',
  required = false,
  error,
  disabled = false,
}: BankSelectProps): React.JSX.Element {
  /**
   * "Other" is never stored, so on an edit it has to be inferred: a value that
   * is none of our codes IS the name somebody typed. The state covers only the
   * gap between picking Other and typing anything, when the field is empty and
   * there is nothing to infer from.
   */
  const [otherPicked, setOtherPicked] = React.useState(false);
  const showOther = otherPicked || isCustomBank(value);

  return (
    <div className="space-y-2">
      <MUISelect
        fieldLabel={label}
        required={required}
        error={error}
        placeholder={BANK_PLACEHOLDER}
        value={showOther ? BANK_OTHER : value}
        disabled={disabled}
        onChange={(e) => {
          const picked = e.target.value as string;
          setOtherPicked(picked === BANK_OTHER);
          // Picking Other empties the field so the text box below starts
          // blank — the sentinel itself must never reach the form.
          onChange(picked === BANK_OTHER ? '' : picked);
        }}
        renderValue={(selected) => {
          const selectedValue = selected as string;
          if (!selectedValue) {
            return <span className="text-foreground-secondary">{BANK_PLACEHOLDER}</span>;
          }
          return selectedValue === BANK_OTHER ? 'Other' : bankLabel(selectedValue);
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
          disabled={disabled}
          inputProps={{ maxLength: 100 }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <MUITypography variant="body" className="text-foreground-secondary block">
          Optional. Leave it blank if the customer has not decided yet.
        </MUITypography>
      )}
    </div>
  );
}
