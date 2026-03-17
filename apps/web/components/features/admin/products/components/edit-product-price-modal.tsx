'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ProjectType } from '@oneohm-epc/shared/types';
import { Loader2 } from 'lucide-react';
import { type JSX, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { productPriceSchema, type ProductPriceFormData } from '../schemas/product-price.schema';

import { Alert, FieldLabel } from '@/components/shared';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
        projectType: data.projectType,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo || undefined,
      },
    }),
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Pricing</DialogTitle>
          <DialogDescription>Update pricing values for this product.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogBody className="space-y-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="price-unit"
                      label="Unit Price"
                      required
                      tooltip="Base unit price before GST (e.g., 15000)."
                    />
                    <Input
                      id="price-unit"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 15000"
                      error={form.formState.errors.unitPrice?.message}
                      {...form.register('unitPrice', { valueAsNumber: true })}
                    />
                    {form.formState.errors.unitPrice && (
                      <p className="text-xs text-error">
                        {form.formState.errors.unitPrice.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="price-multiplier"
                      label="Cost Multiplier"
                      tooltip="Multiplier applied to cost for margin (e.g., 1.05)."
                    />
                    <Input
                      id="price-multiplier"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 1.05"
                      error={form.formState.errors.costMultiplier?.message}
                      {...form.register('costMultiplier', { valueAsNumber: true })}
                    />
                    {form.formState.errors.costMultiplier && (
                      <p className="text-xs text-error">
                        {form.formState.errors.costMultiplier.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="price-gst"
                      label="GST Rate (%)"
                      tooltip="GST percentage applied to this price (e.g., 12)."
                    />
                    <Input
                      id="price-gst"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 12"
                      error={form.formState.errors.gstRate?.message}
                      {...form.register('gstRate', { valueAsNumber: true })}
                    />
                    {form.formState.errors.gstRate && (
                      <p className="text-xs text-error">{form.formState.errors.gstRate.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="price-currency"
                      label="Currency"
                      tooltip="Currency code (e.g., INR)."
                    />
                    <Input
                      id="price-currency"
                      placeholder="e.g. INR"
                      {...form.register('currency')}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel
                    label="Project Type (optional)"
                    tooltip="Choose if pricing varies by project category."
                  />
                  <Controller
                    name="projectType"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value ?? 'all'}
                        onValueChange={(value) =>
                          field.onChange(value === 'all' ? undefined : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All project types (default)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {Object.values(ProjectType).map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="price-from"
                      label="Effective From"
                      required
                      tooltip="Date when this price becomes active."
                    />
                    <Input
                      id="price-from"
                      type="date"
                      placeholder="YYYY-MM-DD"
                      error={form.formState.errors.effectiveFrom?.message}
                      {...form.register('effectiveFrom')}
                    />
                    {form.formState.errors.effectiveFrom && (
                      <p className="text-xs text-error">
                        {form.formState.errors.effectiveFrom.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="price-to"
                      label="Effective To"
                      tooltip="Optional end date for this price."
                    />
                    <Input
                      id="price-to"
                      type="date"
                      placeholder="YYYY-MM-DD"
                      {...form.register('effectiveTo')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </DialogBody>
          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
