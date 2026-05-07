'use client';

import { Alert, Box, type SelectChangeEvent } from '@mui/material';
import { EXPENSE_CATEGORY_LABELS, EXPENSE_PAID_BY_LABELS } from '@oneohm-epc/shared/constants';
import { ExpenseCategory, ExpensePaidByType, PaymentMethod } from '@oneohm-epc/shared/types';
import { type JSX, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { type CreateExpenseFormValues } from '../schemas/create-expense.schema';

import { MUIInput, MUISelect } from '@/components/ui';
import { useEmployees } from '@/lib/hooks/resources';

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: PaymentMethod.UPI, label: 'UPI' },
  { value: PaymentMethod.NEFT, label: 'NEFT' },
  { value: PaymentMethod.RTGS, label: 'RTGS' },
  { value: PaymentMethod.IMPS, label: 'IMPS' },
  { value: PaymentMethod.CHEQUE, label: 'Cheque' },
  { value: PaymentMethod.DEMAND_DRAFT, label: 'Demand Draft' },
  { value: PaymentMethod.CASH, label: 'Cash' },
  { value: PaymentMethod.ONLINE, label: 'Online (other)' },
];

const CATEGORY_OPTIONS: Array<{ value: ExpenseCategory; label: string }> = (
  Object.values(ExpenseCategory) as ExpenseCategory[]
).map((v) => ({
  value: v,
  label: EXPENSE_CATEGORY_LABELS[v] ?? v,
}));

const PAID_BY_OPTIONS: Array<{ value: ExpensePaidByType; label: string }> = (
  Object.values(ExpensePaidByType) as ExpensePaidByType[]
).map((v) => ({
  value: v,
  label: EXPENSE_PAID_BY_LABELS[v] ?? v,
}));

/**
 * Step 1 of the expense drawer — essentials only. Visible for both
 * create and edit modes. The materials breakdown lives in step 2 and
 * is only reachable when the chosen category is MATERIALS.
 */
export function ExpenseStepEssentials(): JSX.Element {
  const form = useFormContext<CreateExpenseFormValues>();
  const errors = form.formState.errors;

  const paidBy = form.watch('paidBy');
  const override = form.watch('override') ?? false;

  const { items: employees, isLoading: employeesLoading } = useEmployees({ status: 'active' });

  const employeeOptions = useMemo(
    () => [
      { value: '', label: employeesLoading ? 'Loading…' : 'Select employee' },
      ...employees.map((e) => {
        const name = e.user
          ? `${e.user.firstName ?? ''} ${e.user.lastName ?? ''}`.trim() || e.user.email || e.userId
          : e.userId;
        return { value: e.id, label: name };
      }),
    ],
    [employees, employeesLoading],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
        }}
      >
        <Controller
          name="category"
          control={form.control}
          render={({ field }) => (
            <MUISelect
              fieldLabel="Category"
              required
              value={field.value}
              onChange={(e: SelectChangeEvent<unknown>) =>
                field.onChange(e.target.value as ExpenseCategory)
              }
              options={CATEGORY_OPTIONS}
              error={errors.category?.message}
            />
          )}
        />
        <MUIInput
          id="exp-vendor"
          fieldLabel="Vendor / Payee"
          placeholder="Optional"
          error={errors.vendorName?.message}
          {...form.register('vendorName')}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
        }}
      >
        <MUIInput
          id="exp-amount"
          fieldLabel="Amount (₹)"
          required
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          error={errors.amount?.message}
          {...form.register('amount')}
        />
        <MUIInput
          id="exp-date"
          fieldLabel="Expense Date"
          required
          type="date"
          error={errors.expenseDate?.message}
          {...form.register('expenseDate')}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
        }}
      >
        <Controller
          name="paymentMethod"
          control={form.control}
          render={({ field }) => (
            <MUISelect
              fieldLabel="Method"
              required
              value={field.value ?? ''}
              onChange={(e: SelectChangeEvent<unknown>) =>
                field.onChange(e.target.value as PaymentMethod)
              }
              options={PAYMENT_METHOD_OPTIONS}
              error={errors.paymentMethod?.message}
            />
          )}
        />
        <Controller
          name="paidBy"
          control={form.control}
          render={({ field }) => (
            <MUISelect
              fieldLabel="Paid By"
              required
              value={field.value ?? ExpensePaidByType.COMPANY}
              onChange={(e: SelectChangeEvent<unknown>) =>
                field.onChange(e.target.value as ExpensePaidByType)
              }
              options={PAID_BY_OPTIONS}
              error={errors.paidBy?.message}
            />
          )}
        />
      </Box>

      {paidBy === ExpensePaidByType.EMPLOYEE && (
        <Controller
          name="paidByEmployeeId"
          control={form.control}
          render={({ field }) => (
            <MUISelect
              fieldLabel="Employee"
              required
              value={field.value ?? ''}
              onChange={(e: SelectChangeEvent<unknown>) =>
                field.onChange((e.target.value as string) || undefined)
              }
              options={employeeOptions}
              error={errors.paidByEmployeeId?.message}
            />
          )}
        />
      )}

      <MUIInput
        id="exp-notes"
        fieldLabel="Notes"
        placeholder="Optional context"
        multiline
        minRows={2}
        error={errors.notes?.message}
        {...form.register('notes')}
      />

      {override && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Alert severity="warning" sx={{ py: 0.5 }}>
            Procurement guard override is enabled. The override reason is recorded on the expense
            and surfaced in audit logs.
          </Alert>
          <MUIInput
            id="exp-override-reason"
            fieldLabel="Override Reason"
            required
            placeholder="Why is this expense allowed to exceed BOM target?"
            error={errors.overrideReason?.message}
            {...form.register('overrideReason')}
          />
        </Box>
      )}
    </Box>
  );
}
