'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DeviceThermostatOutlinedIcon from '@mui/icons-material/DeviceThermostatOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import {
  Button,
  Card,
  CardContent,
  Chip,
  Checkbox,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { ConnectionType, DocumentEntityType, PropertyType } from '@oneohm-epc/shared/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';

import { type CustomerResponse } from '../../customers';
import { useCustomers } from '../../customers/hooks';
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
import { Alert, LeadTemperatureSelector, RadioCard, RadioCardGroup } from '@/components/shared';
import { DocumentManager, type DraftDocument } from '@/components/shared/document-manager';
import { showToast } from '@/components/ui';
import { MUIAvatar } from '@/components/ui/mui-avatar';
import { MUIInput } from '@/components/ui/mui-input';
import { MUISwitch } from '@/components/ui/mui-switch';
import { MUITypography } from '@/components/ui/mui-typography';
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
  propertyId?: string;
  initialData?: CustomerPropertyResponse;
}

// ============================================================================
// Section header — reused across all 5 sections
// ============================================================================

function SectionHeader({
  icon,
  title,
  subtitle,
  chip,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  chip?: string;
}): JSX.Element {
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-border-light">
      <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <MUITypography variant="sectionTitle">{title}</MUITypography>
          {chip && (
            <Chip label={chip} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
          )}
        </div>
        <MUITypography variant="body">{subtitle}</MUITypography>
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function PropertyForm({
  mode,
  customerId: initialCustomerId,
  customer: preloadedCustomer,
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

  // ── Customer search state (standalone create mode only) ──────────────────
  const [customerSearch, setCustomerSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleCustomerInputChange = (value: string): void => {
    setCustomerSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const { data: customersData, isLoading: isLoadingCustomers } = useCustomers({
    search: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
    limit: 10,
    enabled: !isEditMode && !initialCustomerId,
  });

  const customerOptions = (customersData?.data ?? []).map((c) => ({
    value: c.id,
    label: `${c.firstName} ${c.lastName ?? ''}`.trim(),
    secondaryText: c.phone,
  }));

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId ?? '');

  const effectiveCustomerId = isEditMode
    ? (initialData?.customerId ?? '')
    : (initialCustomerId ?? selectedCustomerId);

  const selectedCustomer = initialCustomerId
    ? customer
    : (customersData?.data ?? []).find((c) => c.id === selectedCustomerId);

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
    <div className="max-w-3xl mx-auto pb-24">
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link href={backLink} className="inline-flex items-center gap-1.5 mb-3 no-underline">
          <MUITypography variant="body" component="span">
            ← {backLabel}
          </MUITypography>
        </Link>
        <MUITypography variant="drawerTitle">{pageTitle}</MUITypography>
        <MUITypography variant="body" sx={{ mt: 0.5 }}>
          {pageSubtitle}
        </MUITypography>
      </div>

      {/* ── Customer Card / Selector (create mode only) ───────────────── */}
      {!isEditMode && (
        <div className="mb-5">
          {isContextAware ? (
            customer && (
              <Card variant="outlined">
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <div className="flex items-center gap-3">
                    <MUIAvatar
                      name={`${customer.firstName} ${customer.lastName ?? ''}`}
                      size="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <MUITypography variant="bodyPrimary" noWrap sx={{ fontWeight: 600 }}>
                        {customer.firstName} {customer.lastName ?? ''}
                      </MUITypography>
                      <MUITypography variant="timestamp">{customer.phone}</MUITypography>
                    </div>
                    <Chip label="Customer" size="small" color="success" variant="outlined" />
                  </div>
                </CardContent>
              </Card>
            )
          ) : (
            <Card variant="outlined">
              <CardContent sx={{ p: 2.5 }}>
                <MUITypography variant="sectionTitle" sx={{ mb: 0.5 }}>
                  Select Customer
                </MUITypography>
                <MUITypography variant="body" sx={{ display: 'block', mb: 2 }}>
                  Choose which customer this property belongs to
                </MUITypography>

                <MUIInput
                  mode="autocomplete"
                  fieldLabel="Customer"
                  required
                  options={customerOptions}
                  value={
                    selectedCustomerId
                      ? (customerOptions.find((o) => o.value === selectedCustomerId) ?? null)
                      : null
                  }
                  inputValue={customerSearch}
                  onInputChange={handleCustomerInputChange}
                  onChange={(option) => {
                    const id =
                      option && typeof option === 'object' && 'value' in option
                        ? String(option.value)
                        : '';
                    setSelectedCustomerId(id);
                  }}
                  loading={isLoadingCustomers}
                  showAvatar
                  secondaryTextKey="secondaryText"
                  getOptionLabel={(option) =>
                    typeof option === 'string'
                      ? option
                      : `${(option as { label?: string }).label ?? ''}`
                  }
                  isOptionEqualToValue={(option, val) =>
                    typeof option === 'object' &&
                    typeof val === 'object' &&
                    (option as { value?: string }).value === (val as { value?: string }).value
                  }
                  noOptionsText={
                    debouncedSearch.length < 2
                      ? 'Type at least 2 characters to search'
                      : 'No customers found'
                  }
                  loadingText="Searching customers…"
                  clearable
                  onClear={() => {
                    setSelectedCustomerId('');
                    setCustomerSearch('');
                    setDebouncedSearch('');
                  }}
                  error={
                    'customerId' in form.formState.errors
                      ? (form.formState.errors.customerId as { message?: string }).message
                      : undefined
                  }
                  textFieldProps={{ placeholder: 'Search by name or phone…', size: 'small' }}
                />

                {selectedCustomer && (
                  <div className="flex items-center gap-3 mt-3 p-3 bg-background-secondary rounded-lg">
                    <MUIAvatar
                      name={`${selectedCustomer.firstName} ${selectedCustomer.lastName ?? ''}`}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <MUITypography variant="bodyPrimary" noWrap sx={{ fontWeight: 500 }}>
                        {selectedCustomer.firstName} {selectedCustomer.lastName ?? ''}
                      </MUITypography>
                      <MUITypography variant="timestamp">{selectedCustomer.phone}</MUITypography>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Form ─────────────────────────────────────────────────────── */}
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-5">
        {/* Section 1: Property Details */}
        <Card variant="outlined">
          <SectionHeader
            icon={<HomeOutlinedIcon fontSize="small" />}
            title="Property Details"
            subtitle="Basic information about the property"
          />
          <CardContent sx={{ p: 2.5 }}>
            <div className="space-y-5">
              <Alert variant="info" appearance="minimal" title={PROPERTY_ALERTS.propertyTip.title}>
                {PROPERTY_ALERTS.propertyTip.message}
              </Alert>

              <MUIInput
                fieldLabel="Property Name"
                required
                id="propertyName"
                placeholder="e.g., Main Residence, Office Building"
                size="small"
                {...form.register('propertyName')}
                error={form.formState.errors.propertyName?.message}
              />

              {/* Property Type */}
              <div>
                <MUITypography variant="bodyPrimary" sx={{ fontWeight: 500, mb: 1 }}>
                  Property Type{' '}
                  <MUITypography variant="inherit" component="span" color="error">
                    *
                  </MUITypography>
                </MUITypography>
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
                  <MUITypography
                    variant="alertTitle"
                    color="error"
                    sx={{ mt: 0.5, display: 'block' }}
                  >
                    {form.formState.errors.propertyType.message}
                  </MUITypography>
                )}
              </div>

              {/* isPrimary — create mode only */}
              {!isEditMode && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-background-secondary">
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={
                          (form.watch('isPrimary' as keyof CreatePropertyFormData) as
                            | boolean
                            | undefined) ?? false
                        }
                        onChange={(e) =>
                          form.setValue(
                            'isPrimary' as keyof CreatePropertyFormData,
                            e.target.checked,
                          )
                        }
                      />
                    }
                    label={
                      <MUITypography variant="bodyPrimary">Set as primary property</MUITypography>
                    }
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Address */}
        <Card variant="outlined">
          <SectionHeader
            icon={<PlaceOutlinedIcon fontSize="small" />}
            title="Property Address"
            subtitle="Location details for site visits and installation"
          />
          <CardContent sx={{ p: 2.5 }}>
            <div className="space-y-5">
              {!isEditMode && resolvedCustomer?.address && (
                <Alert variant="info" appearance="minimal">
                  {PROPERTY_ALERTS.addressPrefill.message}
                </Alert>
              )}

              <MUIInput
                fieldLabel="Full Address"
                required
                id="address"
                placeholder="Street address, area, landmark"
                size="small"
                multiline
                rows={3}
                {...form.register('address')}
                error={form.formState.errors.address?.message}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MUIInput
                  fieldLabel="City"
                  required
                  id="city"
                  placeholder="Enter city"
                  size="small"
                  {...form.register('city')}
                  error={form.formState.errors.city?.message}
                />

                <MUIInput
                  mode="select"
                  fieldLabel="State"
                  id="state"
                  size="small"
                  value={form.watch('state') ?? ''}
                  onChange={(e) =>
                    form.setValue('state', e.target.value as string, { shouldDirty: true })
                  }
                  options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                  placeholder="Select state"
                />

                <MUIInput
                  fieldLabel="Pincode"
                  required
                  id="pincode"
                  placeholder="123456"
                  size="small"
                  inputProps={{ maxLength: 6 }}
                  {...form.register('pincode')}
                  error={form.formState.errors.pincode?.message}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Electricity Details */}
        <Card variant="outlined">
          <SectionHeader
            icon={<BoltOutlinedIcon fontSize="small" />}
            title="Electricity Details"
            subtitle="Power connection and billing information"
            chip="OPTIONAL"
          />
          <CardContent sx={{ p: 2.5 }}>
            <div className="space-y-5">
              <Alert
                variant="info"
                appearance="minimal"
                title={PROPERTY_ALERTS.electricityTip.title}
              >
                {PROPERTY_ALERTS.electricityTip.message}
              </Alert>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MUIInput
                  mode="select"
                  fieldLabel="DISCOM Provider"
                  id="discomName"
                  size="small"
                  value={form.watch('discomName') ?? ''}
                  onChange={(e) =>
                    form.setValue('discomName', e.target.value as string, { shouldDirty: true })
                  }
                  options={DISCOM_OPTIONS.map((d) => ({ value: d.value, label: d.label }))}
                  placeholder="Select DISCOM"
                />

                <MUIInput
                  fieldLabel="Consumer Number"
                  id="consumerNumber"
                  placeholder="Enter consumer number"
                  size="small"
                  {...form.register('consumerNumber')}
                />
              </div>

              {/* Connection Type toggle */}
              <div>
                <MUITypography variant="bodyPrimary" sx={{ fontWeight: 500, mb: 1 }}>
                  Connection Type
                </MUITypography>
                <ToggleButtonGroup
                  value={form.watch('connectionType') ?? null}
                  exclusive
                  onChange={(_, val) => {
                    if (val !== null) {
                      form.setValue('connectionType', val as ConnectionType, { shouldDirty: true });
                    }
                  }}
                  size="small"
                  fullWidth
                >
                  {CONNECTION_TYPE_OPTIONS.map((type) => (
                    <ToggleButton
                      key={type.value}
                      value={type.value}
                      sx={{ flexDirection: 'column', gap: 0.25, py: 1.5 }}
                    >
                      <MUITypography variant="bodyPrimary" sx={{ fontWeight: 500 }}>
                        {type.label}
                      </MUITypography>
                      <MUITypography variant="timestamp">
                        {type.value === ConnectionType.SINGLE_PHASE
                          ? 'Homes & small shops'
                          : 'Offices & factories'}
                      </MUITypography>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MUIInput
                  fieldLabel="Sanctioned Load (kW)"
                  id="sanctionedLoad"
                  type="number"
                  step="0.5"
                  placeholder="e.g., 5"
                  size="small"
                  {...form.register('sanctionedLoad', {
                    setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
                  })}
                  error={form.formState.errors.sanctionedLoad?.message}
                />

                <MUIInput
                  fieldLabel="Meter Number"
                  id="meterNumber"
                  placeholder="Enter meter number"
                  size="small"
                  {...form.register('meterNumber')}
                />

                <MUIInput
                  fieldLabel="Avg. Monthly Bill"
                  id="monthlyBill"
                  type="number"
                  placeholder="e.g., 2500"
                  size="small"
                  startIcon={<CurrencyRupeeIcon sx={{ fontSize: 16 }} />}
                  {...form.register('monthlyBill', {
                    setValueAs: (v: string) => (v === '' ? undefined : Number(v)),
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Lead Status & Financing */}
        <Card variant="outlined">
          <SectionHeader
            icon={<DeviceThermostatOutlinedIcon fontSize="small" />}
            title="Lead Status & Financing"
            subtitle="Interest level and loan preferences"
          />
          <CardContent sx={{ p: 2.5 }}>
            <div className="space-y-5">
              <div>
                <MUITypography variant="bodyPrimary" sx={{ fontWeight: 500, mb: 1 }}>
                  Lead Temperature{' '}
                  <MUITypography variant="inherit" component="span" color="error">
                    *
                  </MUITypography>
                </MUITypography>
                <LeadTemperatureSelector
                  value={form.watch('leadTemperature')}
                  onChange={(v) => form.setValue('leadTemperature', v, { shouldDirty: true })}
                  error={!!form.formState.errors.leadTemperature}
                  errorMessage={form.formState.errors.leadTemperature?.message}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-border-light rounded-lg bg-background-secondary/50">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <CurrencyRupeeIcon sx={{ fontSize: 16 }} />
                  </div>
                  <div>
                    <MUITypography variant="bodyPrimary" sx={{ fontWeight: 500 }}>
                      Interested in financing / loan
                    </MUITypography>
                    <MUITypography variant="body">
                      Enable if customer wants EMI options
                    </MUITypography>
                  </div>
                </div>
                <MUISwitch
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

              <MUIInput
                fieldLabel="Notes"
                id="notes"
                placeholder="Any additional notes about this lead..."
                size="small"
                multiline
                rows={3}
                {...form.register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Documents */}
        <Card variant="outlined">
          <SectionHeader
            icon={<DescriptionOutlinedIcon fontSize="small" />}
            title="Documents"
            subtitle="Upload property documents, identity proofs, and KYC documents"
          />
          <DocumentManager
            entityType={DocumentEntityType.PROPERTY}
            entityId={isEditMode && propertyId ? propertyId : undefined}
            title="Property Documents"
            description="Upload electricity bills, identity proofs, site photos, or other documents."
            readOnly={isSubmitting}
            onDraftDocumentsChange={!isEditMode ? handleDraftDocsChange : undefined}
          />
        </Card>

        {/* ── Sticky Footer ─────────────────────────────────────────── */}
        <div className="sticky bottom-0 z-10">
          <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background-tertiary to-transparent pointer-events-none" />
          <div className="bg-background border-t border-border-light py-4 px-4">
            <div className="flex items-center justify-between gap-4">
              {!isEditMode && (
                <MUITypography variant="body" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {isComplete
                    ? 'Ready to create property'
                    : `${REQUIRED_FIELDS_TOTAL - filledCount} required field(s) remaining`}
                </MUITypography>
              )}
              <div className="flex items-center gap-3 ml-auto">
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  onClick={() => router.push(backLink)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  size="small"
                  disabled={isSubmitting || (isEditMode ? !canSave : !effectiveCustomerId)}
                >
                  {isSubmitting
                    ? isEditMode
                      ? 'Saving…'
                      : 'Creating…'
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

  async function onSubmit(data: CreatePropertyFormData | EditPropertyFormData): Promise<void> {
    try {
      if (isEditMode && propertyId) {
        await updatePropertyMutation.mutateAsync({ id: propertyId, data });
        showToast.success('Property updated successfully');
        router.push(buildRoute(ROUTES.PROPERTIES.DETAIL, { id: propertyId }));
      } else {
        const createData = data as CreatePropertyFormData;
        const created = await createPropertyMutation.mutateAsync(createData);

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
