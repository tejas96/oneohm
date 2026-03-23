'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { type JSX } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { brandSchema, type BrandFormData } from '../schemas/brand.schema';

import { Alert, FieldLabel } from '@/components/shared';
import {
  Button,
  Checkbox,
  Card,
  CardContent,
  MUIDialog,
  MUIDialogBody,
  MUIDialogDescription,
  MUIDialogFooter,
  MUIDialogHeader,
  MUIDialogTitle,
  MUIInput,
  MUISwitch,
  Textarea,
} from '@/components/ui';
import { useModalForm } from '@/lib/hooks/core';
import { useBrandMutations, useProductTypeList, type Brand } from '@/lib/hooks/resources';
import { getErrorMessage } from '@/lib/utils';

interface CreateBrandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBrandModal({ open, onOpenChange }: CreateBrandModalProps): JSX.Element {
  const brandMutations = useBrandMutations();
  const productTypes = useProductTypeList({
    syncToUrl: false,
    defaultPageSize: 200,
    defaultFilters: { isActive: true },
  });

  const form = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      manufacturerName: '',
      logoUrl: '',
      website: '',
      supportContact: '',
      description: '',
      isActive: true,
      productTypeIds: [],
    },
  });

  const { handleSubmit, handleClose, isSubmitting } = useModalForm<BrandFormData, Partial<Brand>>({
    form,
    mutation: brandMutations.create,
    onOpenChange,
    transformPayload: (data) => ({
      name: data.name.trim(),
      manufacturerName: data.manufacturerName?.trim() || undefined,
      logoUrl: data.logoUrl?.trim() || undefined,
      website: data.website?.trim() || undefined,
      supportContact: data.supportContact?.trim() || undefined,
      description: data.description?.trim() || undefined,
      isActive: data.isActive,
      productTypeIds: data.productTypeIds ?? [],
    }),
  });

  const toggleProductType = (productTypeId: string, checked: boolean) => {
    const current = form.getValues('productTypeIds') ?? [];
    const next = checked
      ? Array.from(new Set([...current, productTypeId]))
      : current.filter((id) => id !== productTypeId);
    form.setValue('productTypeIds', next, { shouldValidate: true });
  };

  return (
    <MUIDialog open={open} onOpenChange={handleClose} size="default">
      <MUIDialogHeader>
        <MUIDialogTitle>Create Brand</MUIDialogTitle>
        <MUIDialogDescription>
          Add a new brand to the product catalog for selection in quotes.
        </MUIDialogDescription>
      </MUIDialogHeader>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <MUIDialogBody sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {Boolean(brandMutations.create.error) && (
            <Alert variant="error" appearance="minimal">
              {getErrorMessage(brandMutations.create.error)}
            </Alert>
          )}

          <Card>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Brand Details</p>
                <p className="text-xs text-foreground-tertiary">
                  Capture the brand identity shown across quotes and product selection.
                </p>
              </div>
              <Alert variant="info" appearance="minimal">
                Use the manufacturer name for official documentation and warranty references.
              </Alert>

              <MUIInput
                id="brand-name"
                fieldLabel="Brand Name"
                required
                tooltip="The brand name shown in product selection (e.g., Jinko Solar)."
                placeholder="e.g. Jinko Solar"
                error={form.formState.errors.name?.message}
                {...form.register('name')}
              />

              <MUIInput
                id="brand-manufacturer"
                fieldLabel="Manufacturer"
                tooltip="Legal manufacturer name for warranties and documentation."
                placeholder="e.g. JinkoSolar Holding"
                {...form.register('manufacturerName')}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <MUIInput
                    id="brand-website"
                    fieldLabel="Website"
                    tooltip="Official brand website (e.g., https://jinkosolar.com)."
                    placeholder="e.g. https://brand.com"
                    error={form.formState.errors.website?.message}
                    {...form.register('website')}
                  />
                </div>

                <div>
                  <MUIInput
                    id="brand-logo"
                    fieldLabel="Logo URL"
                    tooltip="Direct image URL used for brand display (PNG/JPG)."
                    placeholder="e.g. https://brand.com/logo.png"
                    error={form.formState.errors.logoUrl?.message}
                    {...form.register('logoUrl')}
                  />
                </div>
              </div>

              <MUIInput
                id="brand-support"
                fieldLabel="Support Contact"
                tooltip="Support email or phone shown in internal references."
                placeholder="e.g. support@brand.com"
                {...form.register('supportContact')}
              />

              <div className="space-y-1.5">
                <FieldLabel
                  htmlFor="brand-description"
                  label="Description"
                  tooltip="Short internal notes about the brand."
                />
                <Textarea
                  id="brand-description"
                  rows={3}
                  error={form.formState.errors.description?.message}
                  placeholder="e.g. Premium inverter brand with strong after-sales"
                  {...form.register('description')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <FieldLabel
                  label="Supported Product Types"
                  tooltip="Select the product types where this brand should appear."
                />
                <p className="text-xs text-foreground-tertiary">
                  Controls where this brand appears in product selection.
                </p>
              </div>
              <Alert variant="info" appearance="minimal">
                Select at least one product type to avoid hiding the brand from new products.
              </Alert>
              {productTypes.isLoading ? (
                <p className="text-xs text-foreground-tertiary">Loading product types...</p>
              ) : productTypes.error ? (
                <p className="text-xs text-error">
                  {getErrorMessage(productTypes.error) ?? 'Unable to load product types.'}
                </p>
              ) : productTypes.items.length === 0 ? (
                <p className="text-xs text-foreground-tertiary">No product types available yet.</p>
              ) : (
                <Controller
                  name="productTypeIds"
                  control={form.control}
                  render={({ field }) => (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {productTypes.items.map((type) => (
                        <div key={type.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            id={`brand-type-${type.id}`}
                            checked={(field.value ?? []).includes(type.id)}
                            onCheckedChange={(value) => toggleProductType(type.id, value === true)}
                          />
                          <FieldLabel
                            htmlFor={`brand-type-${type.id}`}
                            label={type.name}
                            tooltip={`Allow ${type.name} products for this brand.`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                />
              )}
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
                    description="Inactive brands are hidden from product selection."
                    tooltip="Inactive brands are hidden from new product selection."
                    labelPosition="left"
                  />
                )}
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
              'Create Brand'
            )}
          </Button>
        </MUIDialogFooter>
      </form>
    </MUIDialog>
  );
}
