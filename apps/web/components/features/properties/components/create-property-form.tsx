'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ConnectionType,
  LeadTemperature,
  PropertyType,
} from '@oneohm-epc/shared-types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { useCreateProperty, useCustomerById } from '../hooks';
import { type CustomerResponse } from '../../customers';
import { createPropertySchema, type CreatePropertyFormData } from '../schemas/property.schema';

import {
  DocumentCollector,
  RadioCard,
  RadioCardGroup,
  toPropertyDocuments,
  type CapturedDocument,
} from '@/components/shared';
import { FileCategory, uploadFile } from '@/lib/api/storage';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  showToast,
  Switch,
  Textarea,
} from '@/components/ui';
import {
  CONNECTION_TYPE_OPTIONS,
  DISCOM_OPTIONS,
  INDIAN_STATES,
  LEAD_TEMPERATURE_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
} from '@/lib/config/constants';
import { ROUTES } from '@/lib/config/routes';
import { getErrorMessage } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface CreatePropertyFormProps {
  /** Pre-selected customer ID (context-aware mode) */
  customerId?: string;
  /** Pre-loaded customer data (avoids extra fetch) */
  customer?: CustomerResponse;
  /** List of customers for selector (standalone mode) */
  customers?: CustomerResponse[];
  /** Whether customers are loading */
  isLoadingCustomers?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function CreatePropertyForm({
  customerId: initialCustomerId,
  customer: preloadedCustomer,
  customers = [],
  isLoadingCustomers = false,
}: CreatePropertyFormProps): React.JSX.Element {
  const router = useRouter();
  const createPropertyMutation = useCreateProperty();

  // For context-aware mode, fetch customer if not preloaded
  const { data: fetchedCustomer } = useCustomerById(
    initialCustomerId && !preloadedCustomer ? initialCustomerId : undefined
  );

  // Use preloaded customer or fetched customer
  const customer = preloadedCustomer ?? fetchedCustomer;

  // Track selected customer in standalone mode
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>(
    initialCustomerId ?? ''
  );

  // Determine effective customer ID
  const effectiveCustomerId = initialCustomerId ?? selectedCustomerId;

  // Find selected customer from list (for standalone mode display)
  const selectedCustomer = initialCustomerId
    ? customer
    : customers.find((c) => c.id === selectedCustomerId);

  // Document collection state
  const [documents, setDocuments] = React.useState<CapturedDocument[]>([]);
  const [isUploadingDocs, setIsUploadingDocs] = React.useState(false);

  const form = useForm<CreatePropertyFormData>({
    resolver: zodResolver(createPropertySchema),
    defaultValues: {
      customerId: effectiveCustomerId,
      propertyName: '',
      propertyType: undefined,
      isPrimary: false,
      address: '',
      city: '',
      state: '',
      pincode: '',
      consumerNumber: '',
      discomName: '',
      connectionType: undefined,
      sanctionedLoad: undefined,
      meterNumber: '',
      monthlyBill: undefined,
      leadTemperature: undefined,
      wantsLoan: false,
      notes: '',
    },
  });

  // Update form customerId when selection changes
  React.useEffect(() => {
    if (effectiveCustomerId) {
      form.setValue('customerId', effectiveCustomerId);
    }
  }, [effectiveCustomerId, form]);

  // Track documents ref for cleanup (avoids stale closure issue)
  const documentsRef = React.useRef<CapturedDocument[]>([]);
  React.useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  // Cleanup blob URLs on unmount to prevent memory leaks
  React.useEffect(() => {
    return () => {
      documentsRef.current.forEach((doc) => {
        if (doc.previewUrl) {
          URL.revokeObjectURL(doc.previewUrl);
        }
      });
    };
  }, []);

  const onSubmit = async (data: CreatePropertyFormData): Promise<void> => {
    try {
      setIsUploadingDocs(true);

      // Step 1: Upload all pending documents
      const pendingDocs = documents.filter(
        (d) => d.status === 'pending' || d.status === 'error'
      );

      let currentDocs = [...documents];

      for (const doc of pendingDocs) {
        try {
          // Update status to uploading
          currentDocs = currentDocs.map((d) =>
            d.id === doc.id ? { ...d, status: 'uploading' as const, progress: 0 } : d
          );
          setDocuments(currentDocs);

          const result = await uploadFile({
            file: doc.file,
            category: FileCategory.DOCUMENT,
            entityType: 'property-document',
            subCategory: doc.slotId,
            onProgress: (progress) => {
              setDocuments((prev) =>
                prev.map((d) =>
                  d.id === doc.id ? { ...d, progress: progress.percent } : d
                )
              );
            },
          });

          // Update with success
          currentDocs = currentDocs.map((d) =>
            d.id === doc.id
              ? {
                  ...d,
                  status: 'success' as const,
                  progress: 100,
                  uploadedUrl: result.publicUrl,
                  fileKey: result.fileKey,
                }
              : d
          );
          setDocuments(currentDocs);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          currentDocs = currentDocs.map((d) =>
            d.id === doc.id ? { ...d, status: 'error' as const, error: errorMessage } : d
          );
          setDocuments(currentDocs);
        }
      }

      setIsUploadingDocs(false);

      // Step 2: Check for failed required documents (Aadhaar when loan wanted)
      const failedDocs = currentDocs.filter((d) => d.status === 'error');
      if (failedDocs.length > 0) {
        const failedRequired = data.wantsLoan && failedDocs.some((d) => d.slotId === 'aadhaar_card');
        if (failedRequired) {
          showToast.error('Required document (Aadhaar) failed to upload. Please retry.');
          return;
        }
        // Warn about failed optional documents but continue
        showToast.warning(`${failedDocs.length} document(s) failed to upload. Property will be created without them.`);
      }

      // Step 3: Convert successfully uploaded documents to API format
      const successfulDocs = currentDocs.filter((d) => d.status === 'success' && d.uploadedUrl);
      const propertyDocuments = toPropertyDocuments(successfulDocs, data.wantsLoan ?? false);

      // Step 4: Create property with documents
      await createPropertyMutation.mutateAsync({
        ...data,
        documents: propertyDocuments,
      });

      showToast.success('Property created successfully');
      router.push(ROUTES.CUSTOMERS.DETAIL.replace('[id]', data.customerId));
    } catch (error) {
      setIsUploadingDocs(false);
      showToast.error(getErrorMessage(error));
    }
  };

  const isSubmitting =
    form.formState.isSubmitting || createPropertyMutation.isPending || isUploadingDocs;

  // Determine breadcrumb based on mode
  const isContextAware = !!initialCustomerId;

  // Determine back link based on mode
  const backLink = isContextAware
    ? ROUTES.CUSTOMERS.DETAIL.replace('[id]', initialCustomerId)
    : ROUTES.PROPERTIES.LIST;
  const backLabel = isContextAware ? 'Back to Customer' : 'Back to Properties';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <Link
          href={backLink}
          className="inline-flex items-center gap-2 text-sm text-foreground-secondary hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="size-icon-sm" />
          {backLabel}
        </Link>
        <h1 className="text-xl font-semibold text-foreground">
          {isContextAware ? 'Add Property' : 'Create New Property'}
        </h1>
        <p className="text-foreground-secondary text-sm mt-1">
          {isContextAware
            ? `Add a new property for ${customer ? `${customer.firstName} ${customer.lastName ?? ''}`.trim() : 'this customer'}`
            : 'Add a new property to your database'}
        </p>
      </div>

      {/* Customer Selector (standalone mode) or Customer Context Card (context-aware mode) */}
      {isContextAware ? (
        // Context-aware: Show customer card (readonly)
        customer && (
          <Card variant="minimal">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="size-container-md rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {customer.firstName.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {customer.firstName} {customer.lastName ?? ''}
                  </p>
                  <p className="text-xs text-foreground-secondary">{customer.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        // Standalone: Show customer selector
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Select Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer *</Label>
              <Select
                value={selectedCustomerId}
                onValueChange={setSelectedCustomerId}
                disabled={isLoadingCustomers}
              >
                <SelectTrigger id="customerId">
                  <SelectValue
                    placeholder={isLoadingCustomers ? 'Loading customers...' : 'Select a customer'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {customers.length === 0 && !isLoadingCustomers ? (
                    <div className="p-2 text-sm text-foreground-secondary text-center">
                      No customers found.{' '}
                      <button
                        type="button"
                        onClick={() => router.push(ROUTES.CUSTOMERS.NEW)}
                        className="text-primary hover:underline"
                      >
                        Create one first
                      </button>
                    </div>
                  ) : (
                    customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.firstName} {c.lastName ?? ''} • {c.phone}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.customerId && (
                <p className="text-xs text-error">{form.formState.errors.customerId.message}</p>
              )}
            </div>

            {/* Show selected customer card */}
            {selectedCustomer && (
              <div className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg">
                <div className="size-container-md rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {selectedCustomer.firstName.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {selectedCustomer.firstName} {selectedCustomer.lastName ?? ''}
                  </p>
                  <p className="text-xs text-foreground-secondary">{selectedCustomer.phone}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Property Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="propertyName">Property Name</Label>
              <Input
                id="propertyName"
                placeholder="e.g., Main Residence, Office Building"
                {...form.register('propertyName')}
                error={form.formState.errors.propertyName?.message}
              />
            </div>

            <div className="space-y-2">
              <Label>Property Type *</Label>
              <RadioCardGroup
                value={form.watch('propertyType')}
                onValueChange={(v) => form.setValue('propertyType', v as PropertyType)}
                orientation="horizontal"
              >
                {PROPERTY_TYPE_OPTIONS.slice(0, 4).map((type) => (
                  <RadioCard
                    key={type.value}
                    value={type.value}
                    title={type.label}
                    description={type.description}
                  />
                ))}
              </RadioCardGroup>
              {form.formState.errors.propertyType && (
                <p className="text-xs text-error">{form.formState.errors.propertyType.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isPrimary"
                checked={form.watch('isPrimary')}
                onCheckedChange={(checked) => form.setValue('isPrimary', checked === true)}
              />
              <Label htmlFor="isPrimary" className="cursor-pointer">
                Set as primary property
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Full Address *</Label>
              <Textarea
                id="address"
                placeholder="Street address, area, landmark"
                {...form.register('address')}
                error={form.formState.errors.address?.message}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...form.register('city')}
                  error={form.formState.errors.city?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select
                  value={form.watch('state') ?? ''}
                  onValueChange={(v) => form.setValue('state', v)}
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  maxLength={6}
                  {...form.register('pincode')}
                  error={form.formState.errors.pincode?.message}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Electricity Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Electricity Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discomName">DISCOM Name *</Label>
                <Select
                  value={form.watch('discomName') ?? ''}
                  onValueChange={(v) => form.setValue('discomName', v)}
                >
                  <SelectTrigger id="discomName">
                    <SelectValue placeholder="Select DISCOM" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCOM_OPTIONS.map((discom) => (
                      <SelectItem key={discom.value} value={discom.value}>
                        {discom.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.discomName && (
                  <p className="text-xs text-error">{form.formState.errors.discomName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="consumerNumber">Consumer Number</Label>
                <Input id="consumerNumber" {...form.register('consumerNumber')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Connection Type *</Label>
              <RadioCardGroup
                value={form.watch('connectionType')}
                onValueChange={(v) => form.setValue('connectionType', v as ConnectionType)}
                orientation="horizontal"
              >
                {CONNECTION_TYPE_OPTIONS.map((type) => (
                  <RadioCard key={type.value} value={type.value} title={type.label} />
                ))}
              </RadioCardGroup>
              {form.formState.errors.connectionType && (
                <p className="text-xs text-error">{form.formState.errors.connectionType.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sanctionedLoad">Sanctioned Load (kW) *</Label>
                <Input
                  id="sanctionedLoad"
                  type="number"
                  step="0.1"
                  {...form.register('sanctionedLoad', { valueAsNumber: true })}
                  error={form.formState.errors.sanctionedLoad?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meterNumber">Meter Number</Label>
                <Input id="meterNumber" {...form.register('meterNumber')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyBill">Avg. Monthly Bill (₹)</Label>
                <Input
                  id="monthlyBill"
                  type="number"
                  {...form.register('monthlyBill', { valueAsNumber: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lead Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Lead Temperature *</Label>
              <RadioCardGroup
                value={form.watch('leadTemperature')}
                onValueChange={(v) => form.setValue('leadTemperature', v as LeadTemperature)}
                orientation="horizontal"
              >
                {LEAD_TEMPERATURE_OPTIONS.map((temp) => (
                  <RadioCard
                    key={temp.value}
                    value={temp.value}
                    title={temp.label}
                    description={temp.description}
                  />
                ))}
              </RadioCardGroup>
              {form.formState.errors.leadTemperature && (
                <p className="text-xs text-error">
                  {form.formState.errors.leadTemperature.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 py-2">
              <Switch
                id="wantsLoan"
                checked={form.watch('wantsLoan')}
                onCheckedChange={(checked) => form.setValue('wantsLoan', checked)}
              />
              <Label htmlFor="wantsLoan" className="cursor-pointer">
                Interested in financing / loan
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                {...form.register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Documents</CardTitle>
            <p className="text-xs text-foreground-secondary mt-1">
              Upload identity and KYC documents
              {form.watch('wantsLoan') && (
                <span className="text-primary"> (Aadhaar required for loan)</span>
              )}
            </p>
          </CardHeader>
          <CardContent>
            <DocumentCollector
              wantsLoan={form.watch('wantsLoan') ?? false}
              documents={documents}
              onDocumentsChange={setDocuments}
              disabled={isSubmitting}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.push(
                isContextAware
                  ? ROUTES.CUSTOMERS.DETAIL.replace('[id]', initialCustomerId)
                  : ROUTES.PROPERTIES.LIST
              )
            }
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !effectiveCustomerId}>
            {isSubmitting ? 'Creating...' : 'Create Property'}
          </Button>
        </div>
      </form>
    </div>
  );
}
