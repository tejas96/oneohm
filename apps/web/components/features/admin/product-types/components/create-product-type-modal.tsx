'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { type JSX } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

import { PRICING_BASIS_OPTIONS, UNIT_OF_MEASURE_OPTIONS } from '../constants';
import { ProductTypeAttributesEditor } from './product-type-attributes-editor';
import { productTypeSchema, type ProductTypeFormData } from '../schemas/product-type.schema';

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
  Switch,
  Textarea,
} from '@/components/ui';
import { useModalForm } from '@/lib/hooks/core';
import { useProductTypeMutations, type ProductType } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface CreateProductTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProductTypeModal({
  open,
  onOpenChange,
}: CreateProductTypeModalProps): JSX.Element {
  const productTypeMutations = useProductTypeMutations();

  const form = useForm<ProductTypeFormData>({
    resolver: zodResolver(productTypeSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      code: '',
      description: '',
      icon: '',
      defaultUnitOfMeasure: UNIT_OF_MEASURE_OPTIONS[0]?.value ?? 'pcs',
      defaultPricingBasis: PRICING_BASIS_OPTIONS[0]?.value ?? 'per_unit',
      defaultGstRate: 12,
      isActive: true,
      sortOrder: 0,
      attributes: [],
    },
  });

  const attributesFieldArray = useFieldArray({ control: form.control, name: 'attributes' });

  const buildAttributesPayload = (attributes: ProductTypeFormData['attributes']) =>
    attributes.map((attr) => {
      const validation: Record<string, unknown> = {};

      if (attr.dataType === 'enum') {
        const options = attr.validationOptions
          ?.split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        if (options && options.length > 0) {
          validation.options = options;
        }
      }

      if (attr.dataType === 'integer' || attr.dataType === 'decimal') {
        if (attr.validationMin !== undefined) validation.min = attr.validationMin;
        if (attr.validationMax !== undefined) validation.max = attr.validationMax;
      }

      return {
        attributeKey: attr.attributeKey.trim(),
        label: attr.label.trim(),
        dataType: attr.dataType,
        isRequired: attr.isRequired,
        isFilterable: attr.isFilterable,
        validation: Object.keys(validation).length ? validation : undefined,
        defaultValue: attr.defaultValue?.trim() || undefined,
        groupName: attr.groupName.trim(),
        sortOrder: attr.sortOrder,
        helpText: attr.helpText?.trim() || undefined,
      };
    });

  const { handleSubmit, handleClose, isSubmitting } = useModalForm<
    ProductTypeFormData,
    Partial<ProductType>
  >({
    form,
    mutation: productTypeMutations.create,
    onOpenChange,
    transformPayload: (data) => ({
      name: data.name.trim(),
      code: data.code.trim(),
      description: data.description?.trim() || undefined,
      icon: data.icon?.trim() || undefined,
      defaultUnitOfMeasure: data.defaultUnitOfMeasure,
      defaultPricingBasis: data.defaultPricingBasis,
      defaultGstRate: data.defaultGstRate,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      attributes: buildAttributesPayload(data.attributes),
    }),
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Create Product Type</DialogTitle>
          <DialogDescription>Define a new product type and its pricing defaults.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogBody className="space-y-4 max-h-[70vh] overflow-y-auto">
            {Boolean(productTypeMutations.create.error) && (
              <Alert variant="error" appearance="minimal">
                {getErrorMessage(productTypeMutations.create.error)}
              </Alert>
            )}

            <Card>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Basics</p>
                  <p className="text-xs text-foreground-tertiary">
                    Naming and identifiers for this product type.
                  </p>
                </div>
                <Alert variant="info" appearance="minimal">
                  Use a short, stable code to keep product matching consistent.
                </Alert>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="product-type-name"
                      label="Name"
                      required
                      tooltip="User-friendly type name (e.g., Solar Panel)."
                    />
                    <Input
                      id="product-type-name"
                      error={form.formState.errors.name?.message}
                      placeholder="e.g. Solar Panel"
                      {...form.register('name')}
                    />
                    {form.formState.errors.name && (
                      <p className="text-xs text-error">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="product-type-code"
                      label="Code"
                      required
                      tooltip="Short stable code used in integrations (e.g., PANEL)."
                    />
                    <Input
                      id="product-type-code"
                      error={form.formState.errors.code?.message}
                      placeholder="e.g. PANEL"
                      {...form.register('code')}
                    />
                    {form.formState.errors.code && (
                      <p className="text-xs text-error">{form.formState.errors.code.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel
                    htmlFor="product-type-icon"
                    label="Icon"
                    tooltip="Optional icon name for UI display (e.g., solar-panel)."
                  />
                  <Input
                    id="product-type-icon"
                    placeholder="e.g. solar-panel"
                    {...form.register('icon')}
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel
                    htmlFor="product-type-description"
                    label="Description"
                    tooltip="Short description for admin users."
                  />
                  <Textarea
                    id="product-type-description"
                    rows={3}
                    error={form.formState.errors.description?.message}
                    placeholder="e.g. High-efficiency solar modules for rooftops"
                    {...form.register('description')}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Defaults</p>
                  <p className="text-xs text-foreground-tertiary">
                    Default pricing and unit settings for this type.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      label="Default Unit"
                      required
                      tooltip="Default unit used for pricing and inventory."
                    />
                    <Controller
                      name="defaultUnitOfMeasure"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_OF_MEASURE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      label="Pricing Basis"
                      required
                      tooltip="How pricing is calculated for this type."
                    />
                    <Controller
                      name="defaultPricingBasis"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select basis" />
                          </SelectTrigger>
                          <SelectContent>
                            {PRICING_BASIS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="product-type-gst"
                      label="Default GST (%)"
                      tooltip="GST percentage applied by default."
                    />
                    <Input
                      id="product-type-gst"
                      type="number"
                      step="0.01"
                      error={form.formState.errors.defaultGstRate?.message}
                      placeholder="e.g. 12"
                      {...form.register('defaultGstRate', { valueAsNumber: true })}
                    />
                    {form.formState.errors.defaultGstRate && (
                      <p className="text-xs text-error">
                        {form.formState.errors.defaultGstRate.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="product-type-sort"
                      label="Sort Order"
                      tooltip="Lower numbers appear first."
                    />
                    <Input
                      id="product-type-sort"
                      type="number"
                      error={form.formState.errors.sortOrder?.message}
                      placeholder="e.g. 1"
                      {...form.register('sortOrder', { valueAsNumber: true })}
                    />
                    {form.formState.errors.sortOrder && (
                      <p className="text-xs text-error">
                        {form.formState.errors.sortOrder.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <FieldLabel
                    label="Active"
                    tooltip="Inactive types are hidden from product selection."
                  />
                  <p className="text-xs text-foreground-tertiary">
                    Inactive types are hidden from product selection.
                  </p>
                </div>
                <Switch
                  checked={form.watch('isActive')}
                  onCheckedChange={(value) => form.setValue('isActive', value)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Attributes</p>
                  <p className="text-xs text-foreground-tertiary">
                    Define the specification fields used in product setup.
                  </p>
                </div>
                <Alert variant="info" appearance="minimal">
                  Attribute keys should be unique and stable to avoid breaking existing products.
                </Alert>
                <ProductTypeAttributesEditor
                  control={form.control}
                  fields={attributesFieldArray.fields}
                  watch={form.watch}
                  onAdd={() =>
                    attributesFieldArray.append({
                      attributeKey: '',
                      label: '',
                      dataType: 'string',
                      isRequired: false,
                      isFilterable: false,
                      groupName: 'general',
                      sortOrder: attributesFieldArray.fields.length,
                      defaultValue: '',
                      helpText: '',
                      validationMin: undefined,
                      validationMax: undefined,
                      validationOptions: '',
                    })
                  }
                  onRemove={(index) => attributesFieldArray.remove(index)}
                />
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
                'Create Product Type'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
