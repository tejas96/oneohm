'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ProjectType } from '@oneohm-epc/shared/types';
import { Loader2 } from 'lucide-react';
import { type JSX, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { productPriceSchema, type ProductPriceFormData } from '../schemas/product-price.schema';

import { Alert } from '@/components/shared';
import {
  Button,
  Card,
  CardContent,
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIDatePicker,
  MUIInput,
  MUISelect,
} from '@/components/ui';
import { useModalForm } from '@/lib/hooks/core';
import { useProductPriceMutations, type ProductPrice } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface EditProductPriceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  target: ProductPrice | null;
}

export function EditProductPriceModal({
  open,
  onOpenChange,
  productId,
  target,
}: EditProductPriceModalProps): JSX.Element {
  const priceMutations = useProductPriceMutations(productId);

  const form = useForm<ProductPriceFormData>({
    resolver: zodResolver(productPriceSchema),
    mode: 'onChange',
    defaultValues: {
      unitPrice: 0,
      costMultiplier: 1,
      gstRate: 12,
      currency: 'INR',
      projectType: undefined,
      effectiveFrom: '',
      effectiveTo: '',
    },
  });

  useEffect(() => {
    if (!target) return;
    form.reset({
      unitPrice: target.unitPrice ?? 0,
      costMultiplier: target.costMultiplier ?? 1,
      gstRate: target.gstRate ?? 12,
      currency: target.currency ?? 'INR',
      projectType: target.projectType,
      effectiveFrom: target.effectiveFrom ?? '',
      effectiveTo: target.effectiveTo ?? '',
    });
    void form.trigger();
  }, [form, target]);

  const { handleSubmit, handleClose, isSubmitting } = useModalForm<
    ProductPriceFormData,
    { id: string; data: Partial<ProductPrice> }
  >({
    form,
    mutation: priceMutations.update,
    onOpenChange,
    transformPayload: (data) => ({
      id: target?.id ?? '',
      data: {
        unitPrice: data.unitPrice,
        costMultiplier: data.costMultiplier,
        gstRate: data.gstRate,
        currency: data.currency,
        projectType: data.projectType ?? null,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo || undefined,
      },
    }),
  });

  return (
    <MUIDialog open={open} onOpenChange={handleClose} size="lg" disableEnforceFocus>
      <MUIDialogHeader>
        <MUIDialogTitle>Edit Pricing</MUIDialogTitle>
        <MUIDialogDescription>Update pricing values for this product.</MUIDialogDescription>
      </MUIDialogHeader>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <MUIDialogBody sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Boolean(priceMutations.update.error) && (
            <Alert variant="error" appearance="minimal">
              {getErrorMessage(priceMutations.update.error)}
            </Alert>
          )}

          <Card>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Pricing Details</p>
                <p className="text-xs text-foreground-tertiary">
                  Update the base pricing and tax settings for this product.
                </p>
              </div>
              <Alert variant="info" appearance="minimal">
                Use a project type only if the pricing varies by project category.
              </Alert>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MUIInput
                  id="price-unit"
                  fieldLabel="Unit Price"
                  required
                  tooltip="Base unit price before GST (e.g., 15000)."
                  type="number"
                  step="0.01"
                  placeholder="e.g. 15000"
                  error={form.formState.errors.unitPrice?.message}
                  {...form.register('unitPrice', { valueAsNumber: true })}
                />
                <MUIInput
                  id="price-multiplier"
                  fieldLabel="Cost Multiplier"
                  tooltip="Multiplier applied to cost for margin (e.g., 1.05)."
                  type="number"
                  step="0.01"
                  placeholder="e.g. 1.05"
                  error={form.formState.errors.costMultiplier?.message}
                  {...form.register('costMultiplier', { valueAsNumber: true })}
                />
                <MUIInput
                  id="price-gst"
                  fieldLabel="GST Rate (%)"
                  tooltip="GST percentage applied to this price (e.g., 12)."
                  type="number"
                  step="0.01"
                  placeholder="e.g. 12"
                  error={form.formState.errors.gstRate?.message}
                  {...form.register('gstRate', { valueAsNumber: true })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MUIInput
                  id="price-currency"
                  fieldLabel="Currency"
                  tooltip="Currency code (e.g., INR)."
                  placeholder="e.g. INR"
                  {...form.register('currency')}
                />
                <Controller
                  name="projectType"
                  control={form.control}
                  render={({ field }) => (
                    <MUISelect
                      fieldLabel="Project Type (optional)"
                      tooltip="Choose if pricing varies by project category."
                      value={field.value ?? 'all'}
                      onChange={(event) =>
                        field.onChange(event.target.value === 'all' ? null : event.target.value)
                      }
                      options={[
                        { value: 'all', label: 'All' },
                        ...Object.values(ProjectType).map((type) => ({
                          value: type,
                          label: type,
                        })),
                      ]}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Controller
                  name="effectiveFrom"
                  control={form.control}
                  render={({ field }) => (
                    <MUIDatePicker
                      fieldLabel="Effective From"
                      required
                      tooltip="Date when this price becomes active."
                      error={form.formState.errors.effectiveFrom?.message}
                      value={field.value || null}
                      onChange={(date) =>
                        field.onChange(date ? date.toISOString().slice(0, 10) : '')
                      }
                    />
                  )}
                />
                <Controller
                  name="effectiveTo"
                  control={form.control}
                  render={({ field }) => (
                    <MUIDatePicker
                      fieldLabel="Effective To"
                      tooltip="Optional end date for this price."
                      value={field.value || null}
                      onChange={(date) =>
                        field.onChange(date ? date.toISOString().slice(0, 10) : '')
                      }
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </MUIDialogBody>
        <MUIDialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !form.formState.isValid || !target?.id}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </MUIDialogFooter>
      </form>
    </MUIDialog>
  );
}
