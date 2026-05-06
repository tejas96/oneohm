'use client';

import { Box, type SelectChangeEvent } from '@mui/material';
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_PAID_BY_LABELS,
  REIMBURSEMENT_STATUS_LABELS,
} from '@oneohm-epc/shared/constants';
import {
  ExpenseCategory,
  ExpensePaidByType,
  ReimbursementStatus,
} from '@oneohm-epc/shared/types';
import { type JSX } from 'react';

import { MUIInput, MUISelect } from '@/components/ui';
import { type ExpenseListFilters } from '@/lib/hooks/resources';

interface ExpenseFiltersProps {
  value: ExpenseListFilters;
  onChange: (next: ExpenseListFilters) => void;
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  ...(Object.values(ExpenseCategory) as ExpenseCategory[]).map((v) => ({
    value: v,
    label: EXPENSE_CATEGORY_LABELS[v] ?? v,
  })),
];

const PAID_BY_OPTIONS = [
  { value: '', label: 'Anyone' },
  ...(Object.values(ExpensePaidByType) as ExpensePaidByType[]).map((v) => ({
    value: v,
    label: EXPENSE_PAID_BY_LABELS[v] ?? v,
  })),
];

const REIMBURSEMENT_OPTIONS = [
  { value: '', label: 'Any reimbursement' },
  ...(Object.values(ReimbursementStatus) as ReimbursementStatus[]).map((v) => ({
    value: v,
    label: REIMBURSEMENT_STATUS_LABELS[v] ?? v,
  })),
];

/**
 * Toolbar for the Expenses subtab. Filters update the list query
 * immediately (React Query keys include filters, so each change is its
 * own cached request — fine because the dataset is tenant-scoped).
 */
export function ExpenseFilters({ value, onChange }: ExpenseFiltersProps): JSX.Element {
  const update = <K extends keyof ExpenseListFilters>(
    key: K,
    next: ExpenseListFilters[K] | '',
  ): void => {
    const merged: ExpenseListFilters = { ...value, page: 1 };
    if (next === '' || next === undefined) {
      delete merged[key];
    } else {
      merged[key] = next as ExpenseListFilters[K];
    }
    onChange(merged);
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(6, 1fr)' },
        gap: 1.5,
        alignItems: 'flex-end',
      }}
    >
      <MUIInput
        id="exp-search"
        fieldLabel="Vendor"
        placeholder="Search vendor…"
        value={value.vendorSearch ?? ''}
        onChange={(e) => update('vendorSearch', e.target.value)}
      />
      <MUISelect
        fieldLabel="Category"
        value={value.category ?? ''}
        onChange={(e: SelectChangeEvent<unknown>) =>
          update('category', e.target.value as ExpenseCategory | '')
        }
        options={CATEGORY_OPTIONS}
      />
      <MUISelect
        fieldLabel="Paid By"
        value={value.paidBy ?? ''}
        onChange={(e: SelectChangeEvent<unknown>) =>
          update('paidBy', e.target.value as ExpensePaidByType | '')
        }
        options={PAID_BY_OPTIONS}
      />
      <MUISelect
        fieldLabel="Reimbursement"
        value={value.reimbursementStatus ?? ''}
        onChange={(e: SelectChangeEvent<unknown>) =>
          update('reimbursementStatus', e.target.value as ReimbursementStatus | '')
        }
        options={REIMBURSEMENT_OPTIONS}
      />
      <MUIInput
        id="exp-date-from"
        fieldLabel="From"
        type="date"
        value={value.dateFrom ?? ''}
        onChange={(e) => update('dateFrom', e.target.value)}
      />
      <MUIInput
        id="exp-date-to"
        fieldLabel="To"
        type="date"
        value={value.dateTo ?? ''}
        onChange={(e) => update('dateTo', e.target.value)}
      />
    </Box>
  );
}
