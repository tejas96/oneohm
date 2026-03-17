'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { type JSX } from 'react';
import { useForm } from 'react-hook-form';

import { brandSchema, type BrandFormData } from '../schemas/brand.schema';

import { Alert, FieldLabel } from '@/components/shared';
import {
  Button,
  Checkbox,
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
  Switch,
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
  const productTypes = useProductTypeList({ syncToUrl: false, defaultPageSize: 200 });

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

  const selectedProductTypeIds = form.watch('productTypeIds') ?? [];
  const toggleProductType = (productTypeId: string, checked: boolean) => {
    const current = form.getValues('productTypeIds') ?? [];
    const next = checked
      ? Array.from(new Set([...current, productTypeId]))
      : current.filter((id) => id !== productTypeId);
    form.setValue('productTypeIds', next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Create Brand</DialogTitle>
          <DialogDescription>
            Add a new brand to the product catalog for selection in quotes.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogBody className="space-y-5 max-h-[70vh] overflow-y-auto">
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

                <div className="space-y-1.5">
                  <FieldLabel
                    htmlFor="brand-name"
                    label="Brand Name"
                    required
                    tooltip="The brand name shown in product selection (e.g., Jinko Solar)."
                  />
                  <Input
                    id="brand-name"
                    placeholder="e.g. Jinko Solar"
                    error={form.formState.errors.name?.message}
                    {...form.register('name')}
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-error">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <FieldLabel
                    htmlFor="brand-manufacturer"
                    label="Manufacturer"
                    tooltip="Legal manufacturer name for warranties and documentation."
                  />
                  <Input
                    id="brand-manufacturer"
                    placeholder="e.g. JinkoSolar Holding"
                    {...form.register('manufacturerName')}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="brand-website"
                      label="Website"
                      tooltip="Official brand website (e.g., https://jinkosolar.com)."
                    />
                    <Input
                      id="brand-website"
                      placeholder="e.g. https://brand.com"
                      error={form.formState.errors.website?.message}
                      {...form.register('website')}
                    />
                    {form.formState.errors.website && (
                      <p className="text-xs text-error">{form.formState.errors.website.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel
                      htmlFor="brand-logo"
                      label="Logo URL"
                      tooltip="Direct image URL used for brand display (PNG/JPG)."
                    />
                    <Input
                      id="brand-logo"
                      placeholder="e.g. https://brand.com/logo.png"
                      error={form.formState.errors.logoUrl?.message}
                      {...form.register('logoUrl')}
                    />
                    {form.formState.errors.logoUrl && (
                      <p className="text-xs text-error">{form.formState.errors.logoUrl.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel
                    htmlFor="brand-support"
                    label="Support Contact"
                    tooltip="Support email or phone shown in internal references."
                  />
                  <Input
                    id="brand-support"
                    placeholder="e.g. support@brand.com"
                    {...form.register('supportContact')}
                  />
                </div>

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
                  <p className="text-xs text-foreground-tertiary">
                    No product types available yet.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {productTypes.items.map((type) => (
                      <div key={type.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          id={`brand-type-${type.id}`}
                          checked={selectedProductTypeIds.includes(type.id)}
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
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <FieldLabel
                    label="Active"
                    tooltip="Inactive brands are hidden from new product selection."
                  />
                  <p className="text-xs text-foreground-tertiary">
                    Inactive brands are hidden from product selection.
                  </p>
                </div>
                <Switch
                  checked={form.watch('isActive')}
                  onCheckedChange={(value) => form.setValue('isActive', value)}
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
                'Create Brand'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
