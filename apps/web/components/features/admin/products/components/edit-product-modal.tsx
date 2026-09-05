'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ProductStatus, UnitOfMeasure } from '@tejas96/shared/types';
import { deriveStructureTypes } from '@tejas96/shared/utils';
import { Loader2 } from 'lucide-react';
import { type JSX, useCallback, useEffect, useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { ProductSpecificationsFields } from './product-specifications-fields';
import { productSchema, type ProductFormData } from '../schemas/product.schema';
import {
  resolveProductSpecificationsForSubmit,
  STRUCTURE_TYPE_FIELD,
} from '../utils/product-form.utils';

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
  Textarea,
  Typography,
} from '@/components/ui';
import { FormTransformError, useModalForm } from '@/lib/hooks/core';
import {
  useBrandList,
  useProductAdminMutations,
  useProductType,
  useProductTypeList,
  useAllMountingStructureProductsForAdmin,
  type ProductAdminItem,
  type ProductTypeAttribute,
} from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface EditProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ProductAdminItem | null;
}

export function EditProductModal({
  open,
  onOpenChange,
  target,
}: EditProductModalProps): JSX.Element {
  const productMutations = useProductAdminMutations();
  const productTypes = useProductTypeList({
    syncToUrl: false,
    defaultPageSize: 200,
    defaultFilters: { isActive: true },
  });
  const brands = useBrandList({
    syncToUrl: false,
    defaultPageSize: 200,
    defaultFilters: { isActive: true },
  });

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      code: '',
      productTypeId: '',
      brandId: '',
      description: '',
      modelNumber: '',
      specifications: {},
      unitOfMeasure: UnitOfMeasure.PIECES,
      productWarrantyYears: undefined,
      performanceWarrantyYears: undefined,
      status: ProductStatus.ACTIVE,
    },
  });

  const selectedProductTypeId = form.watch('productTypeId');
  const productTypeDetail = useProductType(selectedProductTypeId);
  const previousProductTypeId = useRef<string | null>(null);

  useEffect(() => {
    if (!target) return;
    form.reset({
      name: target.name ?? '',
      code: target.code ?? '',
      productTypeId: target.productTypeId ?? '',
      brandId: target.brandId ?? '',
      description: target.description ?? '',
      modelNumber: target.modelNumber ?? '',
      specifications: target.specifications ?? {},
      unitOfMeasure: target.unitOfMeasure ?? UnitOfMeasure.PIECES,
      productWarrantyYears: target.productWarrantyYears ?? undefined,
      performanceWarrantyYears: target.performanceWarrantyYears ?? undefined,
      status: target.status ?? ProductStatus.ACTIVE,
    });
    void form.trigger();
  }, [form, target]);

  const selectedProductType = useMemo(
    () => productTypes.items.find((type) => type.id === selectedProductTypeId),
    [productTypes.items, selectedProductTypeId],
  );
  const resolvedProductType = productTypeDetail.data ?? selectedProductType;
  const specificationAttributes = useMemo(
    () => resolvedProductType?.attributes ?? [],
    [resolvedProductType?.attributes],
  );
  const isSpecificationsLoading = productTypeDetail.isLoading && !!selectedProductTypeId;
  const mountingStructures = useAllMountingStructureProductsForAdmin();
  const structureTypeOptions = useMemo(
    () =>
      deriveStructureTypes(mountingStructures.items).map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [mountingStructures.items],
  );

  const buildSpecificationDefaults = useCallback(
    (attributes: ProductTypeAttribute[]): Record<string, unknown> => {
      if (!attributes || !Array.isArray(attributes)) return {};
      const defaults: Record<string, unknown> = {};

      attributes.forEach((attr) => {
        const key = attr.attributeKey;
        if (!key) return;

        if (attr.defaultValue && attr.defaultValue !== '') {
          if (attr.dataType === 'boolean') {
            defaults[key] = attr.defaultValue === 'true';
            return;
          }
          if (
            attr.dataType === 'integer' ||
            attr.dataType === 'decimal' ||
            attr.dataType === 'number'
          ) {
            const parsed = Number(attr.defaultValue);
            if (Number.isFinite(parsed)) {
              defaults[key] = parsed;
              return;
            }
          }
          defaults[key] = attr.defaultValue;
          return;
        }

        if (attr.dataType === 'boolean' && attr.isRequired) {
          defaults[key] = false;
        }
      });

      return defaults;
    },
    [],
  );

  const setBrandFilters = brands.setFilters;

  useEffect(() => {
    if (!resolvedProductType) {
      setBrandFilters({ productTypeId: undefined });
      return;
    }
    setBrandFilters({ productTypeId: resolvedProductType.id });
  }, [resolvedProductType, setBrandFilters]);

  useEffect(() => {
    if (!selectedProductTypeId) {
      previousProductTypeId.current = null;
      return;
    }

    const defaults = buildSpecificationDefaults(specificationAttributes);

    if (previousProductTypeId.current && previousProductTypeId.current !== selectedProductTypeId) {
      form.setValue('specifications', defaults);
      previousProductTypeId.current = selectedProductTypeId;
      return;
    }

    const currentSpecs = form.getValues('specifications') ?? {};
    let changed = false;
    const nextSpecs: Record<string, unknown> = { ...currentSpecs };

    Object.entries(defaults).forEach(([key, value]) => {
      if (nextSpecs[key] === undefined) {
        nextSpecs[key] = value;
        changed = true;
      }
    });

    if (changed) {
      form.setValue('specifications', nextSpecs);
    }
    previousProductTypeId.current = selectedProductTypeId;
  }, [form, specificationAttributes, selectedProductTypeId]);

  const { handleSubmit, handleClose, isSubmitting } = useModalForm<
    ProductFormData,
    { id: string; data: Partial<ProductAdminItem> }
  >({
    form,
    mutation: productMutations.update,
    onOpenChange,
    transformPayload: (data) => {
      const specsResult = resolveProductSpecificationsForSubmit(data, resolvedProductType?.code);
      if (!specsResult.ok) {
        throw new FormTransformError(STRUCTURE_TYPE_FIELD, specsResult.message);
      }

      return {
        id: target?.id ?? '',
        data: {
          name: data.name.trim(),
          code: data.code.trim(),
          productTypeId: data.productTypeId,
          brandId: data.brandId,
          description: data.description?.trim() || null,
          modelNumber: data.modelNumber?.trim() || null,
          specifications: specsResult.specifications,
          unitOfMeasure: data.unitOfMeasure,
          productWarrantyYears: data.productWarrantyYears,
          performanceWarrantyYears: data.performanceWarrantyYears,
          status: data.status,
        },
      };
    },
  });

  return (
    <MUIDialog open={open} onOpenChange={handleClose} size="lg">
      <MUIDialogHeader>
        <MUIDialogTitle>Edit Product</MUIDialogTitle>
        <MUIDialogDescription>Update model details and specifications.</MUIDialogDescription>
      </MUIDialogHeader>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <MUIDialogBody sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {Boolean(productMutations.update.error) && (
            <Alert variant="error" appearance="minimal">
              {getErrorMessage(productMutations.update.error)}
            </Alert>
          )}

          <Card>
            <CardContent className="space-y-4">
              <div>
                <Typography variant="body" className="font-semibold">
                  Core Details
                </Typography>
                <Typography variant="body" color="muted" className="text-xs">
                  Product identity, type, and availability settings.
                </Typography>
              </div>
              <Alert variant="info" appearance="minimal">
                Changing the product type will refresh available specifications.
              </Alert>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <MUIInput
                    id="product-name"
                    fieldLabel="Product Name"
                    required
                    tooltip="Clear product name shown in quotes (e.g., 540W Mono Panel)."
                    placeholder="e.g. 540W Mono Panel"
                    error={form.formState.errors.name?.message}
                    {...form.register('name')}
                  />
                </div>
                <div>
                  <MUIInput
                    id="product-code"
                    fieldLabel="Product Code"
                    required
                    tooltip="Short unique code for internal reference (e.g., PAN-540-MONO)."
                    placeholder="e.g. PAN-540-MONO"
                    error={form.formState.errors.code?.message}
                    {...form.register('code')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Controller
                    name="productTypeId"
                    control={form.control}
                    render={({ field }) => (
                      <MUISelect
                        fieldLabel="Product Type"
                        required
                        tooltip="Controls which specifications and brands are available."
                        placeholder="Select product type"
                        error={form.formState.errors.productTypeId?.message}
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        options={productTypes.items.map((type) => ({
                          value: type.id,
                          label: type.name,
                        }))}
                      />
                    )}
                  />
                </div>
                <div>
                  <Controller
                    name="brandId"
                    control={form.control}
                    render={({ field }) => (
                      <MUISelect
                        fieldLabel="Brand"
                        required
                        tooltip="Brand options are filtered by product type."
                        placeholder="Select brand"
                        error={form.formState.errors.brandId?.message}
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        options={brands.items.map((brand) => ({
                          value: brand.id,
                          label: brand.name,
                        }))}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Controller
                    name="unitOfMeasure"
                    control={form.control}
                    render={({ field }) => (
                      <MUISelect
                        fieldLabel="Unit of Measure"
                        tooltip="Default unit for pricing and inventory."
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        options={Object.values(UnitOfMeasure).map((unit) => ({
                          value: unit,
                          label: unit,
                        }))}
                      />
                    )}
                  />
                </div>
                <div>
                  <Controller
                    name="status"
                    control={form.control}
                    render={({ field }) => (
                      <MUISelect
                        fieldLabel="Status"
                        tooltip="Inactive products are hidden from new quotes."
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        options={Object.values(ProductStatus).map((status) => ({
                          value: status,
                          label: status,
                        }))}
                      />
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <div>
                <Typography variant="body" className="font-semibold">
                  Model & Warranty
                </Typography>
                <Typography variant="body" color="muted" className="text-xs">
                  Technical identifiers and warranty coverage.
                </Typography>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <MUIInput
                    id="product-model"
                    fieldLabel="Model Number"
                    tooltip="Manufacturer model number (e.g., JKM540M-72HL4)."
                    placeholder="e.g. JKM540M-72HL4"
                    {...form.register('modelNumber')}
                  />
                </div>
                <div>
                  <MUIInput
                    id="product-warranty"
                    fieldLabel="Product Warranty"
                    tooltip="Years of product warranty coverage."
                    type="number"
                    placeholder="e.g. 12 years"
                    {...form.register('productWarrantyYears', {
                      setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
                    })}
                  />
                </div>
                <div>
                  <MUIInput
                    id="product-performance-warranty"
                    fieldLabel="Performance Warranty"
                    tooltip="Years of performance warranty coverage."
                    type="number"
                    placeholder="e.g. 25 years"
                    {...form.register('performanceWarrantyYears', {
                      setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
                    })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel
                  htmlFor="product-description"
                  label="Description"
                  tooltip="Short description visible to internal teams."
                />
                <Textarea
                  id="product-description"
                  size="sm"
                  rows={2}
                  error={form.formState.errors.description?.message}
                  placeholder="e.g. High-efficiency mono panel with half-cut cells"
                  {...form.register('description')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <div>
                <Typography variant="body" className="font-semibold">
                  Specifications
                </Typography>
                <Typography variant="body" color="muted" className="text-xs">
                  Configure the technical specifications for this product.
                </Typography>
              </div>
              <Alert variant="info" appearance="minimal">
                Required fields are enforced based on the product type definition.
              </Alert>
              {isSpecificationsLoading ? (
                <div className="rounded-lg border border-dashed border-border-light p-4 text-sm text-foreground-tertiary">
                  Loading specification fields...
                </div>
              ) : specificationAttributes.length > 0 ? (
                <ProductSpecificationsFields
                  attributes={specificationAttributes}
                  control={form.control}
                  structureTypeOptions={structureTypeOptions}
                />
              ) : selectedProductTypeId ? (
                <div className="rounded-lg border border-dashed border-border-light p-4 text-sm text-foreground-tertiary">
                  This product type does not have specification attributes yet. Add attributes in
                  the Product Types screen to capture specifications.
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border-light p-4 text-sm text-foreground-tertiary">
                  Select a product type to load specification fields.
                </div>
              )}
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
