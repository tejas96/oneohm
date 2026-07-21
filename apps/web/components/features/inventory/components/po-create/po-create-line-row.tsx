'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Card, CardContent, IconButton, Link as MuiLink } from '@mui/material';
import { useEffect, useRef } from 'react';
import { Controller, type Control, type UseFormSetValue, useWatch } from 'react-hook-form';

import { type PoCreateFormValues, computeLine, round2 } from './po-create-schema';
import { ProductPicker } from '../shared/product-picker';

import { MUIInput } from '@/components/ui';
import { MUITypography } from '@/components/ui/mui-typography';
import { useEffectiveProductPrice } from '@/lib/hooks/resources/products-admin';
import { formatCurrency } from '@/lib/utils';

interface PoCreateLineRowProps {
  control: Control<PoCreateFormValues>;
  setValue: UseFormSetValue<PoCreateFormValues>;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  /**
   * PO date from the parent form. Forwarded as `asOf` to the resolver so
   * historical / future POs price against the catalog row that was active
   * on that date (not "today").
   */
  poDate?: string;
  /**
   * Optional project type for the resolver's projectType fallback. Currently
   * unused -- the PO form does not expose this. Wired in case a future
   * change derives it from the selected project.
   */
  projectType?: string;
}

export function PoCreateLineRow({
  control,
  setValue,
  index,
  canRemove,
  onRemove,
  poDate,
  projectType,
}: PoCreateLineRowProps): React.JSX.Element {
  const line = useWatch({ control, name: `items.${index}` });
  const computed = computeLine(line ?? { productId: '', orderedQuantity: 0, unitPrice: 0 });

  const productId = line?.productId ?? '';

  // Single source of truth for the suggested price/tax. Returns null
  // unitPricePerPiece when no catalog price is configured -- in that case
  // we silently fall back to manual entry, no error UX.
  const { data: effective, isLoading: isPriceLoading } = useEffectiveProductPrice(
    productId || undefined,
    { projectType, asOf: poDate },
  );

  // Track which productId we have already auto-applied so user edits aren't
  // clobbered by re-renders or by a late-arriving fetch. Also track whether
  // the user has manually touched the unit price for this product since
  // selecting it -- if they have, the slow-arriving suggestion must NOT
  // overwrite their typed value.
  const lastFilledForRef = useRef<string>('');
  const userTouchedPriceForRef = useRef<string>('');
  useEffect(() => {
    if (!productId || !effective || isPriceLoading) return;
    if (lastFilledForRef.current === productId) return;
    // User typed something into the price field while we were fetching --
    // respect their input, just record the source as manual override.
    if (userTouchedPriceForRef.current === productId) {
      lastFilledForRef.current = productId;
      setValue(`items.${index}.unitPriceSource`, 'manual_override', { shouldDirty: false });
      return;
    }
    lastFilledForRef.current = productId;

    const suggestedPrice = effective.unitPricePerPiece;
    const suggestedTax = effective.gstRate;

    if (suggestedPrice != null) {
      setValue(`items.${index}.unitPrice`, round2(Number(suggestedPrice) || 0), {
        shouldDirty: true,
        shouldValidate: true,
      });
      setValue(`items.${index}.unitPriceSource`, 'suggested', { shouldDirty: false });
    } else {
      // No usable catalog price -- leave the field at its current value but
      // mark the line as a manual override so variance reporting can tell
      // these apart from suggested-and-accepted prices.
      setValue(`items.${index}.unitPriceSource`, 'manual_override', { shouldDirty: false });
    }

    if (suggestedTax != null) {
      setValue(`items.${index}.taxRate`, round2(Number(suggestedTax) || 0), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [productId, effective, isPriceLoading, setValue, index]);

  const suggested = effective?.unitPricePerPiece ?? null;
  const hasCatalogPrice = suggested != null;
  const currentPrice = Number(line?.unitPrice ?? 0);
  const isOverridden = hasCatalogPrice && Math.abs(currentPrice - Number(suggested)) > 0.005;

  // For per_kw structures the unit is ₹/kW (buyer enters qty = kW).
  const isPerKw = effective?.basis === 'per_kw' || effective?.basis === 'per_kw_system';
  const unitLabel = isPerKw ? '/kW' : '';

  const resetToSuggested = (): void => {
    if (suggested == null) return;
    setValue(`items.${index}.unitPrice`, round2(Number(suggested)), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue(`items.${index}.unitPriceSource`, 'suggested', { shouldDirty: true });
  };

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
              <div className="flex flex-col gap-1">
                <MUIInput
                  {...field}
                  fieldLabel="Unit price"
                  required
                  type="number"
                  inputProps={{ min: 0, step: '0.01' }}
                  error={fieldState.error?.message}
                  onChange={(e) => {
                    field.onChange(e);
                    // Record that the user has touched the price field for
                    // this specific product. The auto-fill effect reads this
                    // ref to avoid clobbering a value the user typed while
                    // the suggestion was still loading.
                    if (productId) userTouchedPriceForRef.current = productId;
                    // Any manual change flips the source to override; on
                    // initial auto-fill the effect above sets 'suggested'.
                    setValue(`items.${index}.unitPriceSource`, 'manual_override', {
                      shouldDirty: true,
                    });
                  }}
                />
                {productId ? (
                  hasCatalogPrice ? (
                    <MUITypography
                      variant="finePrint"
                      className="text-foreground-secondary"
                      data-testid={`po-line-${index}-suggested-chip`}
                    >
                      Suggested {formatCurrency(Number(suggested))}
                      {unitLabel} from catalog
                      {isOverridden ? (
                        <>
                          {' · '}
                          <MuiLink
                            component="button"
                            type="button"
                            onClick={resetToSuggested}
                            sx={{ verticalAlign: 'baseline' }}
                          >
                            Reset
                          </MuiLink>
                        </>
                      ) : null}
                    </MUITypography>
                  ) : !isPriceLoading ? (
                    <MUITypography
                      variant="finePrint"
                      className="text-foreground-tertiary"
                      data-testid={`po-line-${index}-no-catalog-chip`}
                    >
                      No catalog price — enter manually
                    </MUITypography>
                  ) : null
                ) : null}
              </div>
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
            <div className="flex h-10 items-center rounded-lg shadow-e2 bg-background-tertiary px-3">
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
