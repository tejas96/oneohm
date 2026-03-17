'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ProductStatus, UnitOfMeasure } from '@oneohm-epc/shared/types';
import { Loader2 } from 'lucide-react';
import { type JSX, useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { ProductSpecificationsFields } from './product-specifications-fields';
import { productSchema, type ProductFormData } from '../schemas/product.schema';

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
  Textarea,
  Typography,
} from '@/components/ui';
import { useModalForm } from '@/lib/hooks/core';
import {
  useBrandList,
  useProductAdminMutations,
  useProductType,
  useProductTypeList,
  type ProductAdminItem,
  type ProductTypeAttribute,
} from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface CreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProductModal({ open, onOpenChange }: CreateProductModalProps): JSX.Element {
  const productMutations = useProductAdminMutations();
  const productTypes = useProductTypeList({ syncToUrl: false, defaultPageSize: 200 });
  const brands = useBrandList({ syncToUrl: false, defaultPageSize: 200 });

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

  const buildSpecificationDefaults = (
    attributes: ProductTypeAttribute[],
  ): Record<string, unknown> => {
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
  };

  useEffect(() => {
    if (!resolvedProductType) {
      brands.setFilters({ productTypeId: undefined });
      return;
    }
    form.setValue('unitOfMeasure', resolvedProductType.defaultUnitOfMeasure as UnitOfMeasure);
    form.setValue('specifications', buildSpecificationDefaults(specificationAttributes));
    brands.setFilters({ productTypeId: resolvedProductType.id });
    form.setValue('brandId', '');
  }, [brands, form, resolvedProductType, specificationAttributes]);

  const { handleSubmit, handleClose, isSubmitting } = useModalForm<
    ProductFormData,
    Partial<ProductAdminItem>
  >({
    form,
    mutation: productMutations.create,
    onOpenChange,
    transformPayload: (data) => ({
      name: data.name.trim(),
      code: data.code.trim(),
      productTypeId: data.productTypeId,
      brandId: data.brandId,
      description: data.description?.trim() || undefined,
      modelNumber: data.modelNumber?.trim() || undefined,
      specifications: data.specifications ?? {},
      unitOfMeasure: data.unitOfMeasure,
      productWarrantyYears: data.productWarrantyYears,
      performanceWarrantyYears: data.performanceWarrantyYears,
      status: data.status,
    }),
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Create Product</DialogTitle>
          <DialogDescription>Define a product model and its specifications.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogBody className="space-y-5 max-h-[75vh] overflow-y-auto">
            {Boolean(productMutations.create.error) && (
              <Alert variant="error" appearance="minimal">
                {getErrorMessage(productMutations.create.error)}
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
                  Choose a product type first to unlock matching specifications.
                </Alert>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="product-name"
                      label="Product Name"
                      required
                      tooltip="Clear product name shown in quotes (e.g., 540W Mono Panel)."
                    />
                    <Input
                      id="product-name"
                      placeholder="e.g. 540W Mono Panel"
                      error={form.formState.errors.name?.message}
                      {...form.register('name')}
                    />
                    {form.formState.errors.name && (
                      <p className="text-xs text-error">{form.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="product-code"
                      label="Product Code"
                      required
                      tooltip="Short unique code for internal reference (e.g., PAN-540-MONO)."
                    />
                    <Input
                      id="product-code"
                      placeholder="e.g. PAN-540-MONO"
                      error={form.formState.errors.code?.message}
                      {...form.register('code')}
                    />
                    {form.formState.errors.code && (
                      <p className="text-xs text-error">{form.formState.errors.code.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      label="Product Type"
                      required
                      tooltip="Controls which specifications and brands are available."
                    />
                    <Controller
                      name="productTypeId"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type (e.g., Solar Panel)" />
                          </SelectTrigger>
                          <SelectContent>
                            {productTypes.items.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.productTypeId && (
                      <p className="text-xs text-error">
                        {form.formState.errors.productTypeId.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      label="Brand"
                      required
                      tooltip="Brand options are filtered by product type."
                    />
                    <Controller
                      name="brandId"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select brand (e.g., Jinko)" />
                          </SelectTrigger>
                          <SelectContent>
                            {brands.items.map((brand) => (
                              <SelectItem key={brand.id} value={brand.id}>
                                {brand.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.brandId && (
                      <p className="text-xs text-error">{form.formState.errors.brandId.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      label="Unit of Measure"
                      tooltip="Default unit for pricing and inventory."
                    />
                    <Controller
                      name="unitOfMeasure"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(UnitOfMeasure).map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      label="Status"
                      tooltip="Inactive products are hidden from new quotes."
                    />
                    <Controller
                      name="status"
                      control={form.control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(ProductStatus).map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="product-model"
                      label="Model Number"
                      tooltip="Manufacturer model number (e.g., JKM540M-72HL4)."
                    />
                    <Input
                      id="product-model"
                      placeholder="e.g. JKM540M-72HL4"
                      {...form.register('modelNumber')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="product-warranty"
                      label="Product Warranty (Years)"
                      tooltip="Years of product warranty coverage."
                    />
                    <Input
                      id="product-warranty"
                      type="number"
                      placeholder="e.g. 12"
                      {...form.register('productWarrantyYears', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="product-performance-warranty"
                      label="Performance Warranty (Years)"
                      tooltip="Years of performance warranty coverage."
                    />
                    <Input
                      id="product-performance-warranty"
                      type="number"
                      placeholder="e.g. 25"
                      {...form.register('performanceWarrantyYears', { valueAsNumber: true })}
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
                'Create Product'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
