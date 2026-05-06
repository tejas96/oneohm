'use client';

import { Alert, Box, Button as MUIButton, FormControlLabel, Switch } from '@mui/material';
import { Plus } from 'lucide-react';
import { type JSX, useMemo } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';

import { useBomProcurementStatus } from '@/lib/hooks/resources';
import { formatCurrency } from '@/lib/utils';

import { type CreateExpenseFormValues } from '../schemas/create-expense.schema';
import { ExpenseProductLineRow } from './expense-product-line-row';

interface ExpenseStepMaterialsProps {
  projectId: string;
}

const EMPTY_LINE = {
  productId: undefined,
  itemName: undefined,
  unit: undefined,
  quantity: undefined as unknown as number,
  unitPrice: undefined,
  notes: undefined,
};

/**
 * Step 2 — only rendered when the chosen category is MATERIALS. Lets
 * users break the expense down into BOM line items so the procurement
 * guard can validate against per-product targets. Off-list ad-hoc
 * items are still allowed (they bypass procurement aggregation).
 */
export function ExpenseStepMaterials({ projectId }: ExpenseStepMaterialsProps): JSX.Element {
  const form = useFormContext<CreateExpenseFormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'productLinks',
  });

  const { data: procurement, isLoading: bomLoading } = useBomProcurementStatus(projectId);

  const bomItems = useMemo(() => procurement?.items ?? [], [procurement]);

  const productLinks = form.watch('productLinks') ?? [];
  const lineTotal = productLinks.reduce((acc, l) => {
    const qty = Number(l?.quantity ?? 0);
    const price = Number(l?.unitPrice ?? 0);
    return acc + (Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0);
  }, 0);
  const expenseAmount = Number(form.watch('amount') ?? 0);

  // Detect any line that exceeds its BOM remaining qty so we can prompt
  // the user to enable the override flag preemptively.
  const overProcuredLines = productLinks.filter((l) => {
    if (!l?.productId) return false;
    const match = bomItems.find((b) => b.productId === l.productId);
    if (!match) return false;
    return Number(l.quantity ?? 0) > match.remaining;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert severity="info" sx={{ py: 0.5 }}>
        Breaking the expense into BOM line items keeps the project's procurement-status accurate.
        Lines are optional — leave empty to record a single material expense.
      </Alert>

      {bomLoading && <p className="text-xs text-foreground-muted">Loading BOM…</p>}

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-light p-6 text-center text-sm text-foreground-muted">
          No line items yet.
        </div>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {fields.map((field, index) => (
            <ExpenseProductLineRow
              key={field.id}
              index={index}
              onRemove={remove}
              bomItems={bomItems}
            />
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <MUIButton
          variant="outlined"
          size="small"
          startIcon={<Plus className="size-4" />}
          onClick={() => append(EMPTY_LINE)}
        >
          Add line
        </MUIButton>
        <div className="text-2xs text-foreground-muted">
          Lines total: <span className="font-mono text-foreground">{formatCurrency(lineTotal)}</span>
          {' / '}
          Expense amount: <span className="font-mono">{formatCurrency(expenseAmount)}</span>
        </div>
      </Box>

      {overProcuredLines.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Alert severity="warning" sx={{ py: 0.5 }}>
            One or more line quantities exceed BOM remaining. Enable the procurement guard
            override below to allow this expense.
          </Alert>
          <Controller
            name="override"
            control={form.control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(field.value)}
                    onChange={(_, checked) => field.onChange(checked)}
                  />
                }
                label="Override procurement guard"
              />
            )}
          />
        </Box>
      )}
    </Box>
  );
}
