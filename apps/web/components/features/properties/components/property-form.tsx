'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ConnectionType, DocumentEntityType, PropertyType } from '@oneohm-epc/shared/types';
import { ArrowLeft, Banknote, FileText, Home, MapPin, Thermometer, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';

import { type CustomerResponse } from '../../customers';
import { PROPERTY_ALERTS, REQUIRED_FIELDS_TOTAL } from '../constants';
import {
  useCreateProperty,
  useCustomerById,
  useUpdateProperty,
  type CustomerPropertyResponse,
} from '../hooks';
import {
  createPropertySchema,
  editPropertySchema,
  type CreatePropertyFormData,
  type EditPropertyFormData,
} from '../schemas/property.schema';

import { useUploadDocumentsBulk } from '@/components/features/documents/hooks';
import { Alert, AddressAutocompleteInput, LeadTemperatureSelector, RadioCard, RadioCardGroup } from '@/components/shared';
import { DocumentManager, type DraftDocument } from '@/components/shared/document-manager';
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
import {
  CONNECTION_TYPE_OPTIONS,
  DISCOM_OPTIONS,
  INDIAN_STATES,
  PROPERTY_TYPE_OPTIONS,
} from '@/lib/config/constants';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { getErrorMessage } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type PropertyFormMode = 'create' | 'edit';

interface PropertyFormProps {
  mode: PropertyFormMode;
  customerId?: string;
  customer?: CustomerResponse;
  customers?: CustomerResponse[];
  isLoadingCustomers?: boolean;
  propertyId?: string;
  initialData?: CustomerPropertyResponse;
}

// ============================================================================
// Component
// ============================================================================

export function PropertyForm({
  mode,
  customerId: initialCustomerId,
  customer: preloadedCustomer,
  customers = [],
  isLoadingCustomers = false,
  propertyId,
  initialData,
}: PropertyFormProps): JSX.Element {
  const router = useRouter();
  const isEditMode = mode === 'edit';

  const createPropertyMutation = useCreateProperty();
  const updatePropertyMutation = useUpdateProperty();

  const { data: fetchedCustomer } = useCustomerById(
    !isEditMode && initialCustomerId && !preloadedCustomer ? initialCustomerId : undefined,
  );

  const customer = preloadedCustomer ?? fetchedCustomer;

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId ?? '');

  const effectiveCustomerId = isEditMode
    ? (initialData?.customerId ?? '')
    : (initialCustomerId ?? selectedCustomerId);

  const selectedCustomer = initialCustomerId
    ? customer
    : customers.find((c) => c.id === selectedCustomerId);

  const resolvedCustomer = selectedCustomer ?? customer;
  const customerStateMatch = resolvedCustomer?.state
    ? INDIAN_STATES.find((s) => s.toLowerCase() === resolvedCustomer.state?.toLowerCase())
    : undefined;

  const [draftDocuments, setDraftDocuments] = useState<DraftDocument[]>([]);
  const uploadDocsBulk = useUploadDocumentsBulk();

  const handleDraftDocsChange = useCallback((docs: DraftDocument[]) => {
    setDraftDocuments(docs);
  }, []);

  const schema = isEditMode ? editPropertySchema : createPropertySchema;

  const form = useForm<CreatePropertyFormData | EditPropertyFormData>({
    resolver: zodResolver(schema),
    defaultValues: isEditMode
      ? {
          propertyName: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          consumerNumber: '',
          discomName: '',
          meterNumber: '',
          notes: '',
          wantsLoan: false,
        }
      : {
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

  // Populate form when initialData loads (edit mode)
  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset({
        propertyName: initialData.propertyName || '',
        propertyType: initialData.propertyType as PropertyType,
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state ?? '',
        pincode: initialData.pincode || '',
        consumerNumber: initialData.consumerNumber || '',
        discomName: initialData.discomName ?? '',
        connectionType: initialData.connectionType as ConnectionType | undefined,
        sanctionedLoad: initialData.sanctionedLoad ?? undefined,
        meterNumber: initialData.meterNumber || '',
        monthlyBill: initialData.monthlyBill ?? undefined,
        leadTemperature: initialData.leadTemperature,
        wantsLoan: initialData.wantsLoan || false,
        notes: initialData.notes || '',
      });
    }
  }, [isEditMode, initialData, form]);

  // Sync customerId into form when it changes (create mode)
  useEffect(() => {
    if (!isEditMode && effectiveCustomerId) {
      form.setValue('customerId' as keyof CreatePropertyFormData, effectiveCustomerId);
    }
  }, [isEditMode, effectiveCustomerId, form]);

  // Progress tracking (create mode only)
  const watchedPropertyName = form.watch('propertyName');
  const watchedPropertyType = form.watch('propertyType');
  const watchedAddress = form.watch('address');
  const watchedCity = form.watch('city');
  const watchedPincode = form.watch('pincode');
  const watchedLeadTemp = form.watch('leadTemperature');
  const filledCount = isEditMode
    ? 0
    : [
        effectiveCustomerId,
        watchedPropertyName,
        watchedPropertyType,
        watchedAddress,
        watchedCity,
        watchedPincode,
        watchedLeadTemp,
      ].filter(Boolean).length;
  const isComplete = filledCount === REQUIRED_FIELDS_TOTAL;

  const wantsLoan = form.watch('wantsLoan');
  const isContextAware = !isEditMode && !!initialCustomerId;

  const activeMutation = isEditMode ? updatePropertyMutation : createPropertyMutation;
  const isSubmitting = form.formState.isSubmitting || activeMutation.isPending;

  const canSave = isEditMode ? form.formState.isDirty : true;

  // Navigation
  const backLink = isEditMode
    ? buildRoute(ROUTES.PROPERTIES.DETAIL, { id: propertyId! })
    : isContextAware
      ? buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: initialCustomerId })
      : ROUTES.PROPERTIES.LIST;

  const backLabel = isEditMode
    ? 'Back to Property'
    : isContextAware
      ? 'Back to Customer'
      : 'Back to Properties';

  const pageTitle = isEditMode
    ? 'Edit Property'
    : isContextAware
      ? 'Add Property'
      : 'Create New Property';

  const pageSubtitle = isEditMode
    ? initialData?.propertyName || 'Unnamed Property'
    : isContextAware
      ? `Add a new property for ${customer ? `${customer.firstName} ${customer.lastName ?? ''}`.trim() : 'this customer'}`
      : 'Add a new property to your database';

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
        <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
        <p className="text-foreground-secondary text-sm mt-1">{pageSubtitle}</p>
      </div>

      {/* Customer Card / Selector (create mode only) */}
      {!isEditMode && (
        <>
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
                  <p className="text-xs text-foreground-secondary">
                    Choose which customer this property belongs to
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerId" required>
                    Customer
                  </Label>
                  <Select
                    value={selectedCustomerId}
                    onValueChange={setSelectedCustomerId}
                    disabled={isLoadingCustomers}
                  >
                    <SelectTrigger id="customerId">
                      <SelectValue
                        placeholder={
                          isLoadingCustomers ? 'Loading customers...' : 'Select a customer'
                        }
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
                  {'customerId' in form.formState.errors && form.formState.errors.customerId && (
                    <p className="text-xs text-error">
                      {(form.formState.errors.customerId as { message?: string }).message}
                    </p>
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
        </>
      )}

      {/* Form */}
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-5">
        {/* Section 1: Property Details */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border-light">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Home className="size-icon-sm text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Property Details</h3>
                <p className="text-xs text-foreground-secondary">
                  Basic information about the property
                </p>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <Alert variant="info" appearance="minimal" title={PROPERTY_ALERTS.propertyTip.title}>
                {PROPERTY_ALERTS.propertyTip.message}
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="propertyName" className="text-sm" required>
                  Property Name
                </Label>
                <Input
                  id="propertyName"
                  placeholder="e.g., Main Residence, Office Building"
                  {...form.register('propertyName')}
                  error={form.formState.errors.propertyName?.message}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm" required>
                  Property Type
                </Label>
                <RadioCardGroup
                  value={form.watch('propertyType')}
                  onValueChange={(v) =>
                    form.setValue('propertyType', v as PropertyType, { shouldDirty: true })
                  }
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

              {/* isPrimary checkbox — create mode only */}
              {!isEditMode && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-background-secondary">
                  <Checkbox
                    id="isPrimary"
                    checked={
                      form.watch('isPrimary' as keyof CreatePropertyFormData) as boolean | undefined
                    }
                    onCheckedChange={(checked) =>
                      form.setValue('isPrimary' as keyof CreatePropertyFormData, checked === true)
                    }
                  />
                  <Label htmlFor="isPrimary" className="cursor-pointer text-sm">
                    Set as primary property
                  </Label>
                </div>
              )}
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
                <p className="text-xs text-foreground-secondary">
                  Location details for site visits and installation
                </p>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {!isEditMode && resolvedCustomer?.address && (
                <Alert variant="info" appearance="minimal">
                  {PROPERTY_ALERTS.addressPrefill.message}
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm" required>
                  Full Address
                </Label>
                <AddressAutocompleteInput
                  control={form.control}
                  name="address"
                  placeholder="Search address or enter street address, area, landmark"
                  onAddressSelected={handleAddressSelected}
                  apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm" required>
                    City
                  </Label>
                  <Input
                    id="city"
                    placeholder="Enter city"
                    {...form.register('city')}
                    error={form.formState.errors.city?.message}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-sm">
                    State
                  </Label>
                  <Select
                    value={form.watch('state')}
                    onValueChange={(v) => form.setValue('state', v, { shouldDirty: true })}
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
                  <Label htmlFor="pincode" className="text-sm" required>
                    Pincode
                  </Label>
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
                  <Badge variant="muted" size="xs" shape="pill">
                    OPTIONAL
                  </Badge>
                </div>
                <p className="text-xs text-foreground-secondary">
                  Power connection and billing information
                </p>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <Alert
                variant="info"
                appearance="minimal"
                title={PROPERTY_ALERTS.electricityTip.title}
              >
                {PROPERTY_ALERTS.electricityTip.message}
              </Alert>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discomName" className="text-sm">
                    DISCOM Provider
                  </Label>
                  <Select
                    value={form.watch('discomName')}
                    onValueChange={(v) => form.setValue('discomName', v, { shouldDirty: true })}
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
                  <Label htmlFor="consumerNumber" className="text-sm">
                    Consumer Number
                  </Label>
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
                        onClick={() =>
                          form.setValue('connectionType', type.value as ConnectionType, {
                            shouldDirty: true,
                          })
                        }
                        className={`flex flex-col items-center gap-1 rounded-lg border-2 p-4 text-center transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border-light bg-background hover:border-primary/30'
                        }`}
                      >
                        <span className="text-sm font-medium">{type.label}</span>
                        <span className="text-xs text-foreground-secondary">
                          {type.value === ConnectionType.SINGLE_PHASE
                            ? 'Homes & small shops'
                            : 'Offices & factories'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sanctionedLoad" className="text-sm">
                    Sanctioned Load (kW)
                  </Label>
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
                  <Label htmlFor="meterNumber" className="text-sm">
                    Meter Number
                  </Label>
                  <Input
                    id="meterNumber"
                    placeholder="Enter meter number"
                    {...form.register('meterNumber')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyBill" className="text-sm">
                    Avg. Monthly Bill
                  </Label>
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
                <p className="text-xs text-foreground-secondary">
                  Interest level and loan preferences
                </p>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div className="space-y-2">
                <Label className="text-sm" required>
                  Lead Temperature
                </Label>
                <LeadTemperatureSelector
                  value={form.watch('leadTemperature')}
                  onChange={(v) => form.setValue('leadTemperature', v, { shouldDirty: true })}
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
                    <p className="text-xs text-foreground-secondary">
                      Enable if customer wants EMI options
                    </p>
                  </div>
                </div>
                <Switch
                  id="wantsLoan"
                  checked={wantsLoan}
                  onCheckedChange={(checked) =>
                    form.setValue('wantsLoan', checked, { shouldDirty: true })
                  }
                />
              </div>

              {wantsLoan && (
                <Alert
                  variant="info"
                  appearance="minimal"
                  title={PROPERTY_ALERTS.loanBenefits.title}
                >
                  {PROPERTY_ALERTS.loanBenefits.message}
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm">
                  Notes
                </Label>
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
                  Upload property documents, identity proofs, and KYC documents
                </p>
              </div>
            </div>

            <DocumentManager
              entityType={DocumentEntityType.PROPERTY}
              entityId={isEditMode && propertyId ? propertyId : undefined}
              title="Property Documents"
              description="Upload electricity bills, identity proofs, site photos, or other documents."
              readOnly={isSubmitting}
              onDraftDocumentsChange={!isEditMode ? handleDraftDocsChange : undefined}
            />
          </CardContent>
        </Card>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-10">
          <div className="absolute inset-x-0 -top-6 h-6 bg-linear-to-t from-background-tertiary to-transparent pointer-events-none" />
          <div className="bg-background border-t border-border-light py-4 px-4">
            <div className="flex items-center justify-between gap-4">
              {!isEditMode && (
                <p className="text-xs text-foreground-secondary hidden sm:block">
                  {isComplete
                    ? 'Ready to create property'
                    : `${REQUIRED_FIELDS_TOTAL - filledCount} required field(s) remaining`}
                </p>
              )}
              <div className="flex items-center gap-3 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(backLink)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || (isEditMode ? !canSave : !effectiveCustomerId)}
                >
                  {isSubmitting
                    ? isEditMode
                      ? 'Saving...'
                      : 'Creating...'
                    : isEditMode
                      ? 'Save Changes'
                      : 'Create Property'}
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

  /**
   * Handle address selection from Google Places autocomplete
   */
  function handleAddressSelected(addressComponents: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  }): void {
    form.setValue('address', addressComponents.address, { shouldDirty: true });
    form.setValue('city', addressComponents.city, { shouldDirty: true });
    form.setValue('state', addressComponents.state, { shouldDirty: true });
    form.setValue('pincode', addressComponents.pincode, { shouldDirty: true });
  }

  async function onSubmit(data: CreatePropertyFormData | EditPropertyFormData): Promise<void> {
    try {
      if (isEditMode && propertyId) {
        await updatePropertyMutation.mutateAsync({
          id: propertyId,
          data,
        });
        showToast.success('Property updated successfully');
        router.push(buildRoute(ROUTES.PROPERTIES.DETAIL, { id: propertyId }));
      } else {
        const createData = data as CreatePropertyFormData;
        const created = await createPropertyMutation.mutateAsync(createData);

        // Flush draft documents to the new property via the generic documents API
        const successDrafts = draftDocuments.filter((d) => d.status === 'success');
        if (successDrafts.length > 0 && created.id) {
          const payloads = successDrafts.map((d) => ({
            entityType: DocumentEntityType.PROPERTY,
            entityId: created.id,
            category: d.category,
            tag: d.tag,
            fileName: d.fileName,
            fileUrl: d.fileUrl,
            fileSizeBytes: d.fileSizeBytes,
            mimeType: d.mimeType,
          }));
          await uploadDocsBulk.mutateAsync(payloads);
        }

        showToast.success('Property created successfully');
        router.push(buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: createData.customerId }));
      }
    } catch (error) {
      showToast.error(getErrorMessage(error));
    }
  }
}
