'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { type JSX, useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

import { PRICING_BASIS_OPTIONS, UNIT_OF_MEASURE_OPTIONS } from '../constants';
import { ProductTypeAttributesEditor } from './product-type-attributes-editor';
import { createProductTypeSchema, type ProductTypeFormData } from '../schemas/product-type.schema';

import { Alert, FieldLabel } from '@/components/shared';
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
  MUIInput,
  MUISelect,
  MUISwitch,
  Textarea,
} from '@/components/ui';
import { useModalForm } from '@/lib/hooks/core';
import { useProductTypeList, useProductTypeMutations, type ProductType } from '@/lib/hooks/resources';
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
  const productTypes = useProductTypeList({ syncToUrl: false, defaultPageSize: 200 });
  const codeOptions = useMemo(
    () => {
      const codes = new Map<string, string>();
      productTypes.items.forEach((type) => {
        if (type.code) {
          codes.set(type.code, type.name);
        }
      });
      return Array.from(codes.entries())
        .map(([code, name]) => ({ value: code, label: code, description: name }))
        .sort((a, b) => a.value.localeCompare(b.value));
    },
    [productTypes.items],
  );

  const form = useForm<ProductTypeFormData>({
    resolver: zodResolver(createProductTypeSchema),
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
      sortOrder: 1,
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
    <MUIDialog open={open} onOpenChange={handleClose} size="lg">
        <MUIDialogHeader>
          <MUIDialogTitle>Create Product Type</MUIDialogTitle>
          <MUIDialogDescription>Define a new product type and its pricing defaults.</MUIDialogDescription>
        </MUIDialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <MUIDialogBody sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                  <MUIInput
                    id="product-type-name"
                    fieldLabel="Name"
                    required
                    tooltip="User-friendly type name (e.g., Solar Panel)."
                    error={form.formState.errors.name?.message}
                    placeholder="e.g. Solar Panel"
                    {...form.register('name')}
                  />
                  <Controller
                    name="code"
                    control={form.control}
                    render={({ field }) => (
                      <MUIInput
                        mode="autocomplete"
                        id="product-type-code"
                        fieldLabel="Code"
                        required
                        tooltip="Short stable code used in integrations (e.g., PANEL)."
                        freeSolo
                        options={codeOptions}
                        value={field.value ?? ''}
                        inputValue={field.value ?? ''}
                        onInputChange={field.onChange}
                        onBlur={field.onBlur}
                        onChange={(value) => {
                          if (typeof value === 'string') {
                            field.onChange(value);
                            return;
                          }
                          field.onChange(value?.value ?? value?.label ?? '');
                        }}
                        getOptionLabel={(option) =>
                          typeof option === 'string'
                            ? option
                            : option.label ?? option.value ?? ''
                        }
                        clearable
                        onClear={() => field.onChange('')}
                        error={form.formState.errors.code?.message}
                        textFieldProps={{ placeholder: 'e.g. PANEL' }}
                      />
                    )}
                  />
                </div>

                <MUIInput
                  id="product-type-icon"
                  fieldLabel="Icon"
                  tooltip="Optional icon name for UI display (e.g., solar-panel)."
                  placeholder="e.g. solar-panel"
                  {...form.register('icon')}
                />

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
                  <Controller
                    name="defaultUnitOfMeasure"
                    control={form.control}
                    render={({ field }) => (
                      <MUISelect
                        fieldLabel="Default Unit"
                        required
                        tooltip="Default unit used for pricing and inventory."
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        options={UNIT_OF_MEASURE_OPTIONS.map((option) => ({
                          value: option.value,
                          label: option.label,
                        }))}
                      />
                    )}
                  />
                  <Controller
                    name="defaultPricingBasis"
                    control={form.control}
                    render={({ field }) => (
                      <MUISelect
                        fieldLabel="Pricing Basis"
                        required
                        tooltip="How pricing is calculated for this type."
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        options={PRICING_BASIS_OPTIONS.map((option) => ({
                          value: option.value,
                          label: option.label,
                        }))}
                      />
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MUIInput
                    id="product-type-gst"
                    fieldLabel="Default GST (%)"
                    tooltip="GST percentage applied by default."
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    error={form.formState.errors.defaultGstRate?.message}
                    placeholder="e.g. 12"
                    {...form.register('defaultGstRate', { valueAsNumber: true })}
                  />
                  <MUIInput
                    id="product-type-sort"
                    fieldLabel="Sort Order"
                    tooltip="Lower numbers appear first."
                    type="number"
                    min={1}
                    step="1"
                    error={form.formState.errors.sortOrder?.message}
                    placeholder="e.g. 1"
                    {...form.register('sortOrder', { valueAsNumber: true })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between gap-4">
                <Controller
                  name="isActive"
                  control={form.control}
                  render={({ field }) => (
                    <MUISwitch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      label="Active"
                      description="Inactive types are hidden from product selection."
                      tooltip="Inactive types are hidden from product selection."
                      labelPosition="left"
                    />
                  )}
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
                      sortOrder: attributesFieldArray.fields.length + 1,
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
          </MUIDialogBody>
          <MUIDialogFooter>
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
          </MUIDialogFooter>
        </form>
    </MUIDialog>
  );
}
