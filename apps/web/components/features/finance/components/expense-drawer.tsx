'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import {
  ExpenseCategory,
  ExpensePaidByType,
  PaymentMethod,
} from '@oneohm-epc/shared/types';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { type JSX, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui';
import {
  type CreateExpensePayload,
  type ProjectExpense,
  type UpdateExpensePayload,
  useProjectExpenseMutations,
} from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

import {
  createExpenseSchema,
  type CreateExpenseFormValues,
} from '../schemas/create-expense.schema';
import { type ExpenseProductLineFormValues } from '../schemas/expense-product-line.schema';
import { ExpenseStepEssentials } from './expense-step-essentials';
import { ExpenseStepMaterials } from './expense-step-materials';

interface ExpenseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** When set, drawer enters edit mode and pre-fills from this expense. */
  expense?: ProjectExpense | null;
}

type Step = 'essentials' | 'materials';

const TODAY = (): string => new Date().toISOString().slice(0, 10);

function buildDefaults(expense?: ProjectExpense | null): CreateExpenseFormValues {
  if (!expense) {
    return {
      category: ExpenseCategory.MATERIALS,
      vendorName: undefined,
      amount: undefined as unknown as number,
      expenseDate: TODAY(),
      paymentMethod: PaymentMethod.UPI,
      paidBy: ExpensePaidByType.COMPANY,
      paidByEmployeeId: undefined,
      notes: undefined,
      productLinks: [],
      override: false,
      overrideReason: undefined,
    };
  }
  return {
    category: expense.category,
    vendorName: expense.vendorName ?? undefined,
    amount: Number(expense.amount),
    expenseDate: expense.expenseDate,
    paymentMethod: expense.paymentMethod,
    paidBy: expense.paidBy,
    paidByEmployeeId: expense.paidByEmployeeId ?? undefined,
    notes: expense.notes ?? undefined,
    productLinks:
      expense.productLinks?.map((l) => ({
        productId: l.productId ?? undefined,
        itemName: l.itemName ?? undefined,
        unit: l.unit ?? undefined,
        quantity: Number(l.quantity),
        unitPrice: l.unitPrice == null ? undefined : Number(l.unitPrice),
        notes: l.notes ?? undefined,
      })) ?? [],
    // override is immutable post-create — the toggle stays disabled in edit mode.
    override: false,
    overrideReason: undefined,
  };
}

/**
 * Two-step expense drawer used for both create and edit. Step 2 is
 * only reachable when category is MATERIALS — for other categories the
 * Save button is shown directly on step 1.
 *
 * Edit caveat (matches backend): the procurement-guard override is
 * decided at create time and cannot be changed by an edit, so the
 * override toggle is never shown in edit mode. Re-create the expense
 * if you need to flip it.
 */
export function ExpenseDrawer({
  open,
  onOpenChange,
  projectId,
  expense,
}: ExpenseDrawerProps): JSX.Element {
  const isEdit = Boolean(expense);
  const { create, update } = useProjectExpenseMutations(projectId);

  const form = useForm<CreateExpenseFormValues>({
    resolver: zodResolver(createExpenseSchema),
    mode: 'onChange',
    defaultValues: buildDefaults(expense),
  });

  // Reset whenever the drawer is opened or its target expense changes.
  useEffect(() => {
    if (open) {
      form.reset(buildDefaults(expense));
      setStep('essentials');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense?.id]);

  const [step, setStep] = useState<Step>('essentials');
  const category = form.watch('category');
  const isMaterials = category === ExpenseCategory.MATERIALS;
  const showSaveOnStep1 = !isMaterials;

  const submitting = create.isPending || update.isPending;
  const lastError = update.error ?? create.error;

  const handleClose = (): void => {
    onOpenChange(false);
    form.reset(buildDefaults(null));
    setStep('essentials');
  };

  const handleNext = async (): Promise<void> => {
    // Validate step-1 fields before advancing so users can't dodge errors.
    const stepFields = [
      'category',
      'amount',
      'expenseDate',
      'paymentMethod',
      'paidBy',
      'paidByEmployeeId',
      'vendorName',
      'notes',
    ] as const;
    const ok = await form.trigger(stepFields);
    if (ok) setStep('materials');
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (isEdit && expense) {
      const payload: UpdateExpensePayload = {
        category: values.category,
        vendorName: values.vendorName,
        amount: values.amount,
        expenseDate: values.expenseDate,
        paymentMethod: values.paymentMethod,
        paidBy: values.paidBy,
        paidByEmployeeId: values.paidByEmployeeId,
        notes: values.notes,
        productLinks: isMaterials
          ? values.productLinks?.map((l: ExpenseProductLineFormValues) => ({
              productId: l.productId,
              itemName: l.itemName,
              unit: l.unit,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              notes: l.notes,
            }))
          : [],
      };
      await update.mutateAsync({ id: expense.id, payload });
    } else {
      const payload: CreateExpensePayload = {
        category: values.category,
        vendorName: values.vendorName,
        amount: values.amount,
        expenseDate: values.expenseDate,
        paymentMethod: values.paymentMethod,
        paidBy: values.paidBy,
        paidByEmployeeId: values.paidByEmployeeId,
        notes: values.notes,
        productLinks: isMaterials
          ? values.productLinks?.map((l: ExpenseProductLineFormValues) => ({
              productId: l.productId,
              itemName: l.itemName,
              unit: l.unit,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              notes: l.notes,
            }))
          : undefined,
        override: values.override,
        overrideReason: values.overrideReason,
      };
      await create.mutateAsync(payload);
    }
    handleClose();
  });

  const stepLabel = useMemo(() => {
    if (!isMaterials) return 'Details';
    return step === 'essentials' ? 'Step 1 of 2 · Essentials' : 'Step 2 of 2 · Materials';
  }, [isMaterials, step]);

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[640px] flex flex-col p-0"
      >
        <SheetHeader className="p-6 pb-4 border-b border-border-light">
          <SheetTitle>{isEdit ? 'Edit Expense' : 'Record Expense'}</SheetTitle>
          <SheetDescription>{stepLabel}</SheetDescription>
        </SheetHeader>

        <FormProvider {...form}>
          <form onSubmit={(e) => void onSubmit(e)} className="flex-1 flex flex-col min-h-0">
            <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
              {Boolean(lastError) && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {getErrorMessage(lastError)}
                </Alert>
              )}

              {step === 'essentials' ? (
                <ExpenseStepEssentials />
              ) : (
                <ExpenseStepMaterials projectId={projectId} />
              )}
            </Box>

            <SheetFooter className="p-4 border-t border-border-light bg-background-secondary">
              <Button variant="outlined" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>

              {step === 'materials' && (
                <Button
                  variant="text"
                  startIcon={<ArrowLeft className="size-4" />}
                  onClick={() => setStep('essentials')}
                  disabled={submitting}
                >
                  Back
                </Button>
              )}

              {isMaterials && step === 'essentials' ? (
                <Button
                  variant="contained"
                  endIcon={<ArrowRight className="size-4" />}
                  onClick={() => void handleNext()}
                  disabled={submitting}
                >
                  Next: Materials
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting || !form.formState.isValid}
                >
                  {submitting ? (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} color="inherit" />
                      Saving...
                    </Box>
                  ) : isEdit ? (
                    'Save Changes'
                  ) : showSaveOnStep1 ? (
                    'Record Expense'
                  ) : (
                    'Record Expense'
                  )}
                </Button>
              )}
            </SheetFooter>
          </form>
        </FormProvider>
      </SheetContent>
    </Sheet>
  );
}
