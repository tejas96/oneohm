'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ConnectionType,
  PropertyType,
} from '@oneohm-epc/shared-types';
import {
  ArrowLeft,
  Banknote,
  FileText,
  Home,
  MapPin,
  Thermometer,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';

import { type CustomerResponse } from '../../customers';
import { PROPERTY_ALERTS, REQUIRED_FIELDS_TOTAL } from '../constants';
import { useCreateProperty, useCustomerById } from '../hooks';
import { createPropertySchema, type CreatePropertyFormData } from '../schemas/property.schema';

import {
  Alert,
  DocumentCollector,
  LeadTemperatureSelector,
  RadioCard,
  RadioCardGroup,
  toPropertyDocuments,
  type CapturedDocument,
} from '@/components/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
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
import { FileCategory, uploadFile } from '@/lib/api/storage';
import {
  CONNECTION_TYPE_OPTIONS,
  DISCOM_OPTIONS,
  INDIAN_STATES,
  PROPERTY_TYPE_OPTIONS,
} from '@/lib/config/constants';
import { ROUTES } from '@/lib/config/routes';
import { getErrorMessage } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface CreatePropertyFormProps {
  customerId?: string;
  customer?: CustomerResponse;
  customers?: CustomerResponse[];
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
}: CreatePropertyFormProps): JSX.Element {
  const router = useRouter();
  const createPropertyMutation = useCreateProperty();

  const { data: fetchedCustomer } = useCustomerById(
    initialCustomerId && !preloadedCustomer ? initialCustomerId : undefined
  );

  const customer = preloadedCustomer ?? fetchedCustomer;

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomerId ?? ''
  );

  const effectiveCustomerId = initialCustomerId ?? selectedCustomerId;

  const selectedCustomer = initialCustomerId
    ? customer
    : customers.find((c) => c.id === selectedCustomerId);

  const resolvedCustomer = selectedCustomer ?? customer;
  const customerStateMatch = resolvedCustomer?.state
    ? INDIAN_STATES.find((s) => s.toLowerCase() === resolvedCustomer.state?.toLowerCase())
    : undefined;

  const [documents, setDocuments] = useState<CapturedDocument[]>([]);
  const [isUploadingDocs, setIsUploadingDocs] = useState(false);

  const form = useForm<CreatePropertyFormData>({
    resolver: zodResolver(createPropertySchema),
    defaultValues: {
      customerId: effectiveCustomerId,
      propertyName: '',
      propertyType: PropertyType.RESIDENTIAL,
      isPrimary: false,
      address: resolvedCustomer?.address || '',
      city: resolvedCustomer?.city || '',
      state: customerStateMatch || '',
      pincode: resolvedCustomer?.pincode || '',
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

  useEffect(() => {
    if (effectiveCustomerId) {
      form.setValue('customerId', effectiveCustomerId);
    }
  }, [effectiveCustomerId, form]);

  const documentsRef = useRef<CapturedDocument[]>([]);
  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    return () => {
      documentsRef.current.forEach((doc) => {
        if (doc.previewUrl) {
          URL.revokeObjectURL(doc.previewUrl);
        }
      });
    };
  }, []);

  const watchedCustomerId = form.watch('customerId');
  const watchedPropertyName = form.watch('propertyName');
  const watchedPropertyType = form.watch('propertyType');
  const watchedAddress = form.watch('address');
  const watchedCity = form.watch('city');
  const watchedPincode = form.watch('pincode');
  const watchedLeadTemp = form.watch('leadTemperature');
  const filledCount = [
    watchedCustomerId,
    watchedPropertyName,
    watchedPropertyType,
    watchedAddress,
    watchedCity,
    watchedPincode,
    watchedLeadTemp,
  ].filter(Boolean).length;
  const isComplete = filledCount === REQUIRED_FIELDS_TOTAL;

  const wantsLoan = form.watch('wantsLoan');
  const isContextAware = !!initialCustomerId;

  const isSubmitting =
    form.formState.isSubmitting || createPropertyMutation.isPending || isUploadingDocs;

  const backLink = isContextAware
    ? ROUTES.CUSTOMERS.DETAIL.replace('[id]', initialCustomerId)
    : ROUTES.PROPERTIES.LIST;
  const backLabel = isContextAware ? 'Back to Customer' : 'Back to Properties';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
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

      {/* Customer Card / Selector */}
      {isContextAware ? (
        customer && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-base font-semibold text-primary">
                    {customer.firstName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {customer.firstName} {customer.lastName ?? ''}
                  </p>
                  <p className="text-sm text-foreground-secondary">{customer.phone}</p>
                </div>
                <Badge variant="success" size="xs" shape="pill" className="ml-auto shrink-0">
                  Customer
                </Badge>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Select Customer</h3>
              <p className="text-xs text-foreground-secondary">Choose which customer this property belongs to</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerId" required>Customer</Label>
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
                        {c.firstName} {c.lastName ?? ''} &bull; {c.phone}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.customerId && (
                <p className="text-xs text-error">{form.formState.errors.customerId.message}</p>
              )}
            </div>

            {selectedCustomer && (
              <div className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-primary">
                    {selectedCustomer.firstName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
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
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-5">
        {/* Section 1: Property Details */}
        <Card>
          <CardContent className="p-0">
            {/* Section Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-light">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Home className="size-icon-sm text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Property Details</h3>
                <p className="text-xs text-foreground-secondary">Basic information about the property</p>
              </div>
            </div>

            {/* Section Body */}
            <div className="p-5 space-y-5">
              <Alert variant="info" appearance="minimal" title={PROPERTY_ALERTS.propertyTip.title}>
                {PROPERTY_ALERTS.propertyTip.message}
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="propertyName" className="text-sm" required>Property Name</Label>
                <Input
                  id="propertyName"
                  placeholder="e.g., Main Residence, Office Building"
                  {...form.register('propertyName')}
                  error={form.formState.errors.propertyName?.message}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm" required>Property Type</Label>
                <RadioCardGroup
                  value={form.watch('propertyType')}
                  onValueChange={(v) => form.setValue('propertyType', v as PropertyType)}
                  orientation="horizontal"
                >
                  {PROPERTY_TYPE_OPTIONS.map((type) => (
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

              <div className="flex items-center gap-2 p-3 rounded-lg bg-background-secondary">
                <Checkbox
                  id="isPrimary"
                  checked={form.watch('isPrimary')}
                  onCheckedChange={(checked) => form.setValue('isPrimary', checked === true)}
                />
                <Label htmlFor="isPrimary" className="cursor-pointer text-sm">
                  Set as primary property
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Address */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-light">
              <div className="size-9 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                <MapPin className="size-icon-sm text-info" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Property Address</h3>
                <p className="text-xs text-foreground-secondary">Location details for site visits and installation</p>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {resolvedCustomer?.address && (
                <Alert variant="info" appearance="minimal">
                  {PROPERTY_ALERTS.addressPrefill.message}
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm" required>Full Address</Label>
                <Textarea
                  id="address"
                  placeholder="Street address, area, landmark"
                  {...form.register('address')}
                  error={form.formState.errors.address?.message}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm" required>City</Label>
                  <Input
                    id="city"
                    placeholder="Enter city"
                    {...form.register('city')}
                    error={form.formState.errors.city?.message}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm">State</Label>
                  <Select
                    value={form.watch('state') || undefined}
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
                  <Label htmlFor="pincode" className="text-sm" required>Pincode</Label>
                  <Input
                    id="pincode"
                    placeholder="123456"
                    maxLength={6}
                    {...form.register('pincode')}
                    error={form.formState.errors.pincode?.message}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Electricity Details */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-light">
              <div className="size-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <Zap className="size-icon-sm text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Electricity Details</h3>
                  <Badge variant="muted" size="xs" shape="pill">OPTIONAL</Badge>
                </div>
                <p className="text-xs text-foreground-secondary">Power connection and billing information</p>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <Alert variant="info" appearance="minimal" title={PROPERTY_ALERTS.electricityTip.title}>
                {PROPERTY_ALERTS.electricityTip.message}
              </Alert>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discomName" className="text-sm">DISCOM Provider</Label>
                  <Select
                    value={form.watch('discomName') || undefined}
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consumerNumber" className="text-sm">Consumer Number</Label>
                  <Input
                    id="consumerNumber"
                    placeholder="Enter consumer number"
                    {...form.register('consumerNumber')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Connection Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {CONNECTION_TYPE_OPTIONS.map((type) => {
                    const isSelected = form.watch('connectionType') === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => form.setValue('connectionType', type.value as ConnectionType)}
                        className={`flex flex-col items-center gap-1 rounded-lg border-2 p-4 text-center transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border-light bg-background hover:border-primary/30'
                        }`}
                      >
                        <span className="text-sm font-medium">{type.label}</span>
                        <span className="text-xs text-foreground-secondary">
                          {type.value === ConnectionType.SINGLE_PHASE ? 'Homes & small shops' : 'Offices & factories'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sanctionedLoad" className="text-sm">Sanctioned Load (kW)</Label>
                  <Input
                    id="sanctionedLoad"
                    type="number"
                    step="0.5"
                    placeholder="e.g., 5"
                    {...form.register('sanctionedLoad', {
                      setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
                    })}
                    error={form.formState.errors.sanctionedLoad?.message}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meterNumber" className="text-sm">Meter Number</Label>
                  <Input
                    id="meterNumber"
                    placeholder="Enter meter number"
                    {...form.register('meterNumber')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyBill" className="text-sm">Avg. Monthly Bill</Label>
                  <Input
                    id="monthlyBill"
                    type="number"
                    prefix="₹"
                    placeholder="e.g., 2500"
                    {...form.register('monthlyBill', {
                      setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
                    })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Lead Status & Financing */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-light">
              <div className="size-9 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
                <Thermometer className="size-icon-sm text-error" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Lead Status & Financing</h3>
                <p className="text-xs text-foreground-secondary">Interest level and loan preferences</p>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div className="space-y-2">
                <Label className="text-sm" required>Lead Temperature</Label>
                <LeadTemperatureSelector
                  value={form.watch('leadTemperature')}
                  onChange={(v) => form.setValue('leadTemperature', v)}
                  error={!!form.formState.errors.leadTemperature}
                  errorMessage={form.formState.errors.leadTemperature?.message}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border-light p-4 bg-background-secondary/50">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Banknote className="size-icon-sm text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="wantsLoan" className="cursor-pointer text-sm font-medium">
                      Interested in financing / loan
                    </Label>
                    <p className="text-xs text-foreground-secondary">Enable if customer wants EMI options</p>
                  </div>
                </div>
                <Switch
                  id="wantsLoan"
                  checked={wantsLoan}
                  onCheckedChange={(checked) => form.setValue('wantsLoan', checked)}
                />
              </div>

              {wantsLoan && (
                <Alert variant="info" appearance="minimal" title={PROPERTY_ALERTS.loanBenefits.title}>
                  {PROPERTY_ALERTS.loanBenefits.message}
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes about this lead..."
                  rows={3}
                  {...form.register('notes')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Documents */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-light">
              <div className="size-9 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                <FileText className="size-icon-sm text-foreground-secondary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Documents</h3>
                <p className="text-xs text-foreground-secondary">
                  Upload identity and KYC documents
                  {wantsLoan && (
                    <span className="text-primary font-medium"> &mdash; Aadhaar required for loan</span>
                  )}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {wantsLoan && (
                <Alert variant="warning" title={PROPERTY_ALERTS.documentWarning.title}>
                  {PROPERTY_ALERTS.documentWarning.message}
                </Alert>
              )}

              <DocumentCollector
                wantsLoan={wantsLoan ?? false}
                documents={documents}
                onDocumentsChange={setDocuments}
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-10">
          <div className="absolute inset-x-0 -top-6 h-6 bg-linear-to-t from-background-tertiary to-transparent pointer-events-none" />
          <div className="bg-background border-t border-border-light py-4 -mx-4 px-4 lg:-mx-5 lg:px-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-foreground-secondary hidden sm:block">
                {isComplete ? 'Ready to create property' : `${REQUIRED_FIELDS_TOTAL - filledCount} required field(s) remaining`}
              </p>
              <div className="flex items-center gap-3 ml-auto">
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
            </div>
          </div>
        </div>
      </form>
    </div>
  );

  // ============================================================================
  // Private: Form submission handler
  // ============================================================================

  async function onSubmit(data: CreatePropertyFormData): Promise<void> {
    try {
      setIsUploadingDocs(true);

      const pendingDocs = documents.filter(
        (d) => d.status === 'pending' || d.status === 'error'
      );

      let currentDocs = [...documents];

      for (const doc of pendingDocs) {
        try {
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
          const msg = error instanceof Error ? error.message : 'Upload failed';
          currentDocs = currentDocs.map((d) =>
            d.id === doc.id ? { ...d, status: 'error' as const, error: msg } : d
          );
          setDocuments(currentDocs);
        }
      }

      setIsUploadingDocs(false);

      const failedDocs = currentDocs.filter((d) => d.status === 'error');
      if (failedDocs.length > 0) {
        const failedRequired = data.wantsLoan && failedDocs.some((d) => d.slotId === 'aadhaar_card');
        if (failedRequired) {
          showToast.error('Required document (Aadhaar) failed to upload. Please retry.');
          return;
        }
        showToast.warning(`${failedDocs.length} document(s) failed to upload. Property will be created without them.`);
      }

      const successfulDocs = currentDocs.filter((d) => d.status === 'success' && d.uploadedUrl);
      const propertyDocuments = toPropertyDocuments(successfulDocs, data.wantsLoan ?? false);

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
  }
}
