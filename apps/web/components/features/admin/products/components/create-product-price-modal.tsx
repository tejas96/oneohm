'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ProjectType } from '@oneohm-epc/shared/types';
import { Loader2 } from 'lucide-react';
import { type JSX } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { productPriceSchema, type ProductPriceFormData } from '../schemas/product-price.schema';

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
import { Alert, FieldLabel } from '@/components/shared';
import { useModalForm } from '@/lib/hooks/core';
import { useProductPriceMutations, type ProductPrice } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface CreateProductPriceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName?: string;
}

export function CreateProductPriceModal({
  open,
  onOpenChange,
  productId,
  productName,
}: CreateProductPriceModalProps): JSX.Element {
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

  const { handleSubmit, handleClose, isSubmitting } = useModalForm<
    ProductPriceFormData,
    Partial<ProductPrice>
  >({
    form,
    mutation: priceMutations.create,
    onOpenChange,
    transformPayload: (data) => ({
      unitPrice: data.unitPrice,
      costMultiplier: data.costMultiplier,
      gstRate: data.gstRate,
      currency: data.currency,
      projectType: data.projectType,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo || undefined,
    }),
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add Pricing</DialogTitle>
          <DialogDescription>
            {productName
              ? `Add a new price for ${productName}.`
              : 'Add a new price for the selected product.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogBody className="space-y-4">
            {Boolean(priceMutations.create.error) && (
              <Alert variant="error" appearance="minimal">
                {getErrorMessage(priceMutations.create.error)}
              </Alert>
            )}

            <Card>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Pricing Details</p>
                  <p className="text-xs text-foreground-tertiary">
                    Define the base pricing and tax settings for this product.
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
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Price'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
