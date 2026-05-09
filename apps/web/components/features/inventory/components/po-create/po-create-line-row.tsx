'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Card, CardContent, IconButton } from '@mui/material';
import { useEffect, useRef } from 'react';
import { Controller, type Control, type UseFormSetValue, useWatch } from 'react-hook-form';

import { type PoCreateFormValues, computeLine, round2 } from './po-create-schema';
import { ProductPicker } from '../shared/product-picker';

import { MUIInput } from '@/components/ui';
import { MUITypography } from '@/components/ui/mui-typography';
import { pickBestProductPrice, useProductPrices } from '@/lib/hooks/resources/products-admin';
import { formatCurrency } from '@/lib/utils';

interface PoCreateLineRowProps {
  control: Control<PoCreateFormValues>;
  setValue: UseFormSetValue<PoCreateFormValues>;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
}

export function PoCreateLineRow({
  control,
  setValue,
  index,
  canRemove,
  onRemove,
}: PoCreateLineRowProps): React.JSX.Element {
  const line = useWatch({ control, name: `items.${index}` });
  const computed = computeLine(line ?? { productId: '', orderedQuantity: 0, unitPrice: 0 });

  const productId = line?.productId ?? '';
  const { data: prices } = useProductPrices(productId || undefined);

  // When the user picks (or swaps) a product on this line, auto-fill unit
  // price and tax rate from the product's active price list. We always
  // re-fill on product change — the previous values were tied to the old
  // product. Tracked via a ref so we only react to actual product swaps,
  // not to re-renders.
  const lastFilledForRef = useRef<string>('');
  useEffect(() => {
    if (!productId || !prices) return;
    if (lastFilledForRef.current === productId) return;
    const best = pickBestProductPrice(prices);
    if (!best) {
      lastFilledForRef.current = productId;
      return;
    }
    lastFilledForRef.current = productId;
    setValue(`items.${index}.unitPrice`, round2(Number(best.unitPrice) || 0), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`items.${index}.taxRate`, round2(Number(best.gstRate) || 0), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [productId, prices, setValue, index]);

  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 2, borderColor: 'divider', bgcolor: 'background.default' }}
    >
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <MUITypography variant="bodyPrimary">Line {index + 1}</MUITypography>
          <IconButton
            aria-label={`Remove line ${index + 1}`}
            size="small"
            disabled={!canRemove}
            onClick={onRemove}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </div>

        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <ProductPicker control={control} name={`items.${index}.productId`} required />
          <Controller
            name={`items.${index}.orderedQuantity`}
            control={control}
            render={({ field, fieldState }) => (
              <MUIInput
                {...field}
                fieldLabel="Quantity"
                required
                type="number"
                inputProps={{ min: 0, step: 'any' }}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name={`items.${index}.unitPrice`}
            control={control}
            render={({ field, fieldState }) => (
              <MUIInput
                {...field}
                fieldLabel="Unit price"
                required
                type="number"
                inputProps={{ min: 0, step: '0.01' }}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name={`items.${index}.taxRate`}
            control={control}
            render={({ field, fieldState }) => (
              <MUIInput
                {...field}
                value={field.value ?? ''}
                fieldLabel="Tax %"
                type="number"
                inputProps={{ min: 0, max: 100, step: '0.01' }}
                error={fieldState.error?.message}
              />
            )}
          />
          <div className="flex flex-col gap-1">
            <MUITypography variant="finePrint" className="text-foreground-secondary">
              Line total
            </MUITypography>
            <div className="flex h-10 items-center rounded-lg border border-border-light bg-background-tertiary px-3">
              <MUITypography variant="bodyPrimary">
                {formatCurrency(computed.lineTotal)}
              </MUITypography>
            </div>
          </div>
        </div>

        <Controller
          name={`items.${index}.notes`}
          control={control}
          render={({ field, fieldState }) => (
            <MUIInput
              {...field}
              value={field.value ?? ''}
              fieldLabel="Line notes"
              placeholder="Optional notes for this line"
              error={fieldState.error?.message}
            />
          )}
        />
      </CardContent>
    </Card>
  );
}
