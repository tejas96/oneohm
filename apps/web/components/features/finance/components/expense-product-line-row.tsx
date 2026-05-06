'use client';

import { Box, IconButton, type SelectChangeEvent } from '@mui/material';
import { Trash2 } from 'lucide-react';
import { type JSX, useMemo } from 'react';
import { Controller, useFormContext, type UseFormReturn } from 'react-hook-form';

import { MUIInput, MUISelect } from '@/components/ui';
import { type BomProcurementItem } from '@/lib/hooks/resources';
import { formatCurrency } from '@/lib/utils';

import { type CreateExpenseFormValues } from '../schemas/create-expense.schema';

interface ExpenseProductLineRowProps {
  index: number;
  onRemove: (index: number) => void;
  bomItems: BomProcurementItem[];
}

const OFF_LIST_VALUE = '__off_list__';

/**
 * One row of the materials breakdown step. The product picker is
 * sourced from the project's BOM (so quantities feed directly into the
 * procurement-status aggregation). Selecting "Off-list item" reveals
 * the free-text `itemName` field for ad-hoc purchases — these still get
 * recorded but don't affect procurement-status.
 */
export function ExpenseProductLineRow({
  index,
  onRemove,
  bomItems,
}: ExpenseProductLineRowProps): JSX.Element {
  const form = useFormContext<CreateExpenseFormValues>() as UseFormReturn<CreateExpenseFormValues>;
  const path = `productLinks.${index}` as const;

  const productOptions = useMemo(
    () => [
      { value: '', label: 'Pick a BOM item…' },
      ...bomItems.map((item) => ({
        value: item.productId,
        label: `${item.name} • remaining ${item.remaining} ${item.unit}`,
      })),
      { value: OFF_LIST_VALUE, label: 'Off-list item (free text)' },
    ],
    [bomItems],
  );

  const productId = form.watch(`${path}.productId`);
  const itemName = form.watch(`${path}.itemName`);
  const showOffList = !productId && (itemName !== undefined || form.getFieldState(`${path}.itemName`).isTouched);

  const errors = form.formState.errors.productLinks?.[index];

  const onProductChange = (value: string): void => {
    if (value === OFF_LIST_VALUE) {
      form.setValue(`${path}.productId`, undefined, { shouldValidate: true });
      form.setValue(`${path}.itemName`, '', { shouldValidate: true, shouldTouch: true });
      return;
    }
    if (!value) {
      form.setValue(`${path}.productId`, undefined, { shouldValidate: true });
      return;
    }
    const match = bomItems.find((b) => b.productId === value);
    form.setValue(`${path}.productId`, value, { shouldValidate: true });
    if (match) {
      form.setValue(`${path}.unit`, match.unit, { shouldValidate: true });
      if (match.unitPrice != null) {
        // Pre-fill unit price from the BOM/catalog so the running total
        // is meaningful out of the box; user can still edit.
        const current = form.getValues(`${path}.unitPrice`);
        if (current === undefined) {
          form.setValue(`${path}.unitPrice`, match.unitPrice, { shouldValidate: true });
        }
      }
    }
    form.setValue(`${path}.itemName`, undefined, { shouldValidate: true });
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 1fr 36px' },
        gap: 1.5,
        alignItems: 'flex-start',
        p: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Controller
        name={`${path}.productId`}
        control={form.control}
        render={({ field }) => (
          <MUISelect
            fieldLabel={index === 0 ? 'Item' : undefined}
            value={field.value ?? (showOffList ? OFF_LIST_VALUE : '')}
            onChange={(e: SelectChangeEvent<unknown>) => onProductChange(e.target.value as string)}
            options={productOptions}
            error={errors?.productId?.message}
          />
        )}
      />

      {showOffList ? (
        <MUIInput
          id={`${path}-item-name`}
          fieldLabel={index === 0 ? 'Item name' : undefined}
          placeholder="e.g. Cable ties"
          error={errors?.itemName?.message}
          {...form.register(`${path}.itemName`)}
        />
      ) : (
        <MUIInput
          id={`${path}-unit`}
          fieldLabel={index === 0 ? 'Unit' : undefined}
          placeholder="ea / m"
          error={errors?.unit?.message}
          {...form.register(`${path}.unit`)}
        />
      )}

      <MUIInput
        id={`${path}-quantity`}
        fieldLabel={index === 0 ? 'Qty' : undefined}
        type="number"
        inputMode="decimal"
        placeholder="0"
        error={errors?.quantity?.message}
        {...form.register(`${path}.quantity`)}
      />

      <MUIInput
        id={`${path}-unit-price`}
        fieldLabel={index === 0 ? 'Unit price (₹)' : undefined}
        type="number"
        inputMode="decimal"
        placeholder="0.00"
        error={errors?.unitPrice?.message}
        {...form.register(`${path}.unitPrice`)}
      />

      <Box sx={{ pt: index === 0 ? 3.5 : 0.5, display: 'flex', justifyContent: 'center' }}>
        <IconButton
          size="small"
          onClick={() => onRemove(index)}
          aria-label="Remove line"
          color="error"
        >
          <Trash2 className="size-4" />
        </IconButton>
      </Box>

      {/* Soft over-procurement hint for BOM-linked rows. */}
      {productId &&
        (() => {
          const match = bomItems.find((b) => b.productId === productId);
          if (!match) return null;
          const qty = Number(form.watch(`${path}.quantity`) ?? 0);
          if (!Number.isFinite(qty) || qty <= match.remaining) return null;
          return (
            <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
              <p className="text-2xs text-warning">
                Quantity ({qty}) exceeds remaining BOM target ({match.remaining}{' '}
                {match.unit}). The procurement guard will require an override at the expense
                level.
              </p>
              <p className="text-2xs text-foreground-muted">
                Estimated line total: {formatCurrency(qty * Number(form.watch(`${path}.unitPrice`) ?? 0))}
              </p>
            </Box>
          );
        })()}
    </Box>
  );
}
