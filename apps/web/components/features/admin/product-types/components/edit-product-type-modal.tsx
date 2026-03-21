'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { type JSX, useEffect, useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

import { PRICING_BASIS_OPTIONS, UNIT_OF_MEASURE_OPTIONS } from '../constants';
import { ProductTypeAttributesEditor } from './product-type-attributes-editor';
import { productTypeSchema, type ProductTypeFormData } from '../schemas/product-type.schema';

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
import {
  useProductTypeList,
  useProductTypeMutations,
  type ProductType,
} from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface EditProductTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ProductType | null;
}

export function EditProductTypeModal({
  open,
  onOpenChange,
  target,
}: EditProductTypeModalProps): JSX.Element {
  const productTypeMutations = useProductTypeMutations();
  const productTypes = useProductTypeList({ syncToUrl: false, defaultPageSize: 200 });
  const codeOptions = useMemo(() => {
    const codes = new Map<string, string>();
    productTypes.items.forEach((type) => {
      if (type.code) {
        codes.set(type.code, type.name);
      }
    });
    return Array.from(codes.entries())
      .map(([code, name]) => ({ value: code, label: code, description: name }))
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [productTypes.items]);

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
      sortOrder: 1,
      attributes: [],
    },
  });

  const attributesFieldArray = useFieldArray({ control: form.control, name: 'attributes' });

  const systemAttrKeys = useMemo(() => {
    if (!target?.attributes) return new Set<string>();
    return new Set(target.attributes.filter((a) => a.isSystem).map((a) => a.attributeKey));
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const mappedAttributes =
      target.attributes?.map((attr, index) => ({
        id: attr.id,
        attributeKey: attr.attributeKey ?? '',
        label: attr.label ?? '',
        dataType:
          attr.dataType === 'number'
            ? 'decimal'
            : (attr.dataType as ProductTypeFormData['attributes'][number]['dataType']),
        isRequired: attr.isRequired ?? false,
        isFilterable: attr.isFilterable ?? false,
        groupName: attr.groupName ?? 'general',
        sortOrder: Math.max(1, attr.sortOrder ?? index + 1),
        defaultValue: attr.defaultValue ?? '',
        helpText: attr.helpText ?? '',
        validationMin:
          typeof attr.validation?.min === 'number' ? (attr.validation.min as number) : undefined,
        validationMax:
          typeof attr.validation?.max === 'number' ? (attr.validation.max as number) : undefined,
        validationOptions: Array.isArray(attr.validation?.options)
          ? (attr.validation.options as string[]).join(', ')
          : Array.isArray(attr.validation?.values)
            ? (attr.validation.values as string[]).join(', ')
            : '',
      })) ?? [];

    form.reset({
      name: target.name ?? '',
      code: target.code ?? '',
      description: target.description ?? '',
      icon: target.icon ?? '',
      defaultUnitOfMeasure: target.defaultUnitOfMeasure ?? UNIT_OF_MEASURE_OPTIONS[0]?.value ?? '',
      defaultPricingBasis: target.defaultPricingBasis ?? PRICING_BASIS_OPTIONS[0]?.value ?? '',
      defaultGstRate: target.defaultGstRate ?? 0,
      isActive: target.isActive,
      sortOrder: Math.max(1, target.sortOrder ?? 1),
      attributes: mappedAttributes,
    });
  }, [form, target]);

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
        id: attr.id,
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
    { id: string; data: Partial<ProductType> }
  >({
    form,
    mutation: productTypeMutations.update,
    onOpenChange,
    transformPayload: (data) => ({
      id: target?.id ?? '',
      data: {
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
      },
    }),
  });

  return (
    <MUIDialog open={open} onOpenChange={handleClose} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>Edit Product Type</MUIDialogTitle>
        <MUIDialogDescription>
          Update defaults and visibility for this product type.
        </MUIDialogDescription>
      </MUIDialogHeader>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <MUIDialogBody sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Boolean(productTypeMutations.update.error) && (
            <Alert variant="error" appearance="minimal">
              {getErrorMessage(productTypeMutations.update.error)}
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
                Keep the code stable to avoid impacting product associations.
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
                {target?.isSystem ? (
                  <MUIInput
                    id="product-type-code"
                    fieldLabel="Code"
                    required
                    tooltip="System product type code cannot be changed."
                    disabled
                    value={target.code}
                    placeholder="e.g. PANEL"
                  />
                ) : (
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
                          typeof option === 'string' ? option : (option.label ?? option.value ?? '')
                        }
                        clearable
                        onClear={() => field.onChange('')}
                        error={form.formState.errors.code?.message}
                        textFieldProps={{ placeholder: 'e.g. PANEL' }}
                      />
                    )}
                  />
                )}
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
                    disabled={target?.isSystem === true}
                    label="Active"
                    description={
                      target?.isSystem
                        ? 'System product types cannot be deactivated.'
                        : 'Inactive types are hidden from product selection.'
                    }
                    tooltip={
                      target?.isSystem
                        ? 'System product types are always active.'
                        : 'Inactive types are hidden from product selection.'
                    }
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
                systemAttributeKeys={systemAttrKeys}
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
