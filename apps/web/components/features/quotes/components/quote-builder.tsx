'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CustomerStatus,
  DcrPreference,
  ProjectType,
  type PaymentMilestone,
} from '@tejas96/shared/types';
import { isAxiosError } from 'axios';
import {
  AlertCircle,
  Calculator,
  CircleDollarSign,
  Eye,
  Info,
  MapPin,
  Search,
  Settings2,
  AlertTriangle,
  StickyNote,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { useCustomerProperties, type CustomerPropertyResponse } from '../../customers';
import { useCustomer, useCustomers } from '../../customers/hooks';
import {
  PROJECT_TYPE_OPTIONS,
  DCR_PREFERENCE_OPTIONS,
  QUICK_SIZE_OPTIONS,
  DISCOUNT_PRESETS,
  DISTANCE_CONFIG,
  SYSTEM_SIZE_CONFIG,
} from '../constants';
import { useCalculateQuote } from '../hooks/use-calculate-quote';
import { useInstallationPricing } from '../hooks/use-installation-pricing';
import { useQuoteConfig } from '../hooks/use-quote-config';
import { useQuoteFormLogic } from '../hooks/use-quote-form-logic';
import { useQuotePdf } from '../hooks/use-quote-pdf';
import { useSaveQuote } from '../hooks/use-save-quote';
import { applyPreGstDiscount } from '../pricing-utils';
import { quoteBuilderSchema, type QuoteBuilderFormData } from '../schemas/quote.schema';
import type {
  CalculateQuoteRequest,
  CalculateQuoteResponse,
  CreateFromCalculationRequest,
  SubsidyConfigResponse,
} from '../types';
import { PaymentTermsModal } from './payment-terms-modal';
import { QuotePreviewPanel } from './quote-preview-panel';

import { NumberStepper } from '@/components/shared';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Spinner,
  Checkbox,
  Textarea,
  showToast,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui';
import { ROUTES, buildRoute } from '@/lib/config/routes';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/utils/error';
import { formatCurrency, formatCurrencyDecimal } from '@/lib/utils/format';

// ============================================================================
// Types
// ============================================================================

interface QuoteCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  status?: CustomerStatus;
}

// ============================================================================
// Component
// ============================================================================

export function QuoteBuilder(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId') ?? undefined;
  const preselectedPropertyId = searchParams.get('propertyId') ?? undefined;

  // ── Config hook ──
  const config = useQuoteConfig();

  // ── Customer search state ──
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<QuoteCustomer | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(customerSearch), 550);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const { data: customerList, isPending: isCustomersLoading } = useCustomers(
    debouncedSearch.length >= 2 ? { search: debouncedSearch, limit: 20 } : { limit: 20 },
  );
  const customers: QuoteCustomer[] = useMemo(
    () =>
      (customerList?.data ?? []).map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName ?? '',
        phone: c.phone,
        email: c.email,
        status: c.status,
      })),
    [customerList],
  );

  // Pre-selected customer: fetch single by ID
  const { data: preselectedCustomerData } = useCustomer(preselectedCustomerId ?? '');

  useEffect(() => {
    if (preselectedCustomerData && preselectedCustomerId) {
      setSelectedCustomer({
        id: preselectedCustomerData.id,
        firstName: preselectedCustomerData.firstName,
        lastName: preselectedCustomerData.lastName ?? '',
        phone: preselectedCustomerData.phone,
        email: preselectedCustomerData.email,
        status: preselectedCustomerData.status,
      });
    }
  }, [preselectedCustomerData, preselectedCustomerId]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Form ──
  const form = useForm<QuoteBuilderFormData>({
    resolver: zodResolver(quoteBuilderSchema) as never,
    defaultValues: {
      customerId: preselectedCustomerId ?? '',
      propertyId: preselectedPropertyId,
      projectType: ProjectType.RESIDENTIAL,
      systemSizeKw: 5,
      phaseType: 'single_phase',
      selectedSubsidyIds: [],
      dcrPreference: DcrPreference.DCR_ONLY,
      structureType: '',
      floorNumber: 0,
      distanceKm: DISTANCE_CONFIG.default,
      discountAmount: 0,
      internalNotes: '',
      customerNotes: '',
    },
  });

  const customerId = form.watch('customerId');
  const propertyId = form.watch('propertyId');
  const discountAmount = form.watch('discountAmount');
  const distanceKm = form.watch('distanceKm');
  const floorNumber = form.watch('floorNumber');
  const systemSizeKw = form.watch('systemSizeKw');
  const projectType = form.watch('projectType');
  const structureType = form.watch('structureType');
  const isInactiveCustomer = selectedCustomer?.status === CustomerStatus.INACTIVE;

  const {
    transportRatePerKm,
    floorIncrementPercent,
    isFetched: isPricingFetched,
  } = useInstallationPricing(systemSizeKw);

  // Fetch properties for selected customer (use isFetching since query is disabled when customerId is empty)
  const { data: propertiesRaw, isFetching: isPropertiesFetching } =
    useCustomerProperties(customerId);
  const properties = useMemo(
    () =>
      (propertiesRaw ?? []).map((p: CustomerPropertyResponse) => ({
        id: p.id,
        propertyName: p.propertyName ?? 'Unnamed',
        propertyType: p.propertyType,
        address: p.address ?? '',
        city: p.city ?? '',
      })),
    [propertiesRaw],
  );

  // ── Calculation state ──
  const [calculation, setCalculation] = useState<CalculateQuoteResponse | null>(null);
  const calculateMutation = useCalculateQuote();

  // Detect missing product categories (no products configured at all)
  const missingProductCategories = useMemo(() => {
    if (config.isLoading) return [];
    const missing: string[] = [];
    if (config.panelBrands.length === 0) missing.push('Solar Panels');
    if (config.inverterBrands.length === 0) missing.push('Inverters');
    if (config.structureTypes.length === 0) missing.push('Mounting Structures');
    return missing;
  }, [config.isLoading, config.panelBrands, config.inverterBrands, config.structureTypes]);

  // Validate required fields for calculate button
  const { isCalculateDisabled, missingFields, tooltipMessage } = useMemo(() => {
    const missing = [];
    if (!structureType) missing.push('Structure Type');

    const hasMissingFields = missing.length > 0;
    const hasNoProducts = missingProductCategories.length > 0;
    const hasMissingPricing =
      isPricingFetched && floorIncrementPercent == null && transportRatePerKm == null;
    const isDisabled =
      isInactiveCustomer ||
      calculateMutation.isPending ||
      config.isLoading ||
      hasMissingFields ||
      hasNoProducts ||
      hasMissingPricing;

    const parts: string[] = [];
    if (hasNoProducts) {
      parts.push(`Missing product data: ${missingProductCategories.join(', ')}`);
    }
    if (hasMissingFields) {
      parts.push(`Please select: ${missing.join(', ')}`);
    }
    if (hasMissingPricing) {
      parts.push(
        `No installation pricing configured for ${systemSizeKw} kW — ask your admin to add a pricing tier`,
      );
    }

    let message = '';
    if (parts.length > 0) {
      message = parts.join('. ');
    } else if (calculateMutation.isPending) {
      message = 'Calculating quote...';
    } else if (isInactiveCustomer) {
      message = 'Quote creation is blocked because this customer is inactive';
    } else if (config.isLoading) {
      message = 'Loading configuration...';
    }

    return {
      isCalculateDisabled: isDisabled,
      missingFields: missing,
      tooltipMessage: message,
    };
  }, [
    calculateMutation.isPending,
    config.isLoading,
    structureType,
    missingProductCategories,
    isPricingFetched,
    floorIncrementPercent,
    transportRatePerKm,
    systemSizeKw,
    isInactiveCustomer,
  ]);

  // Manual quantity adjusters
  const [manualDcrPanelCount, setManualDcrPanelCount] = useState<number | undefined>();
  const [manualNonDcrPanelCount, setManualNonDcrPanelCount] = useState<number | undefined>();
  const [manualInverterCount, setManualInverterCount] = useState<number | undefined>();
  const [hasQuantityChanges, setHasQuantityChanges] = useState(false);

  // ── Business rules hook ──
  const onCalculationCleared = useCallback(() => {
    setCalculation(null);
    setSavedQuoteNumber(null);
    setManualDcrPanelCount(undefined);
    setManualNonDcrPanelCount(undefined);
    setManualInverterCount(undefined);
    setHasQuantityChanges(false);
  }, []);

  const formLogic = useQuoteFormLogic({
    form: form as never,
    onCalculationCleared,
  });

  const prevProjectTypeRef = useRef<ProjectType | null>(null);
  const initialSubsidySyncedRef = useRef(false);

  const eligibleSubsidiesForProject = useMemo((): SubsidyConfigResponse[] => {
    return config.subsidyConfigs.filter((c) => c.isActive && c.projectType === projectType);
  }, [config.subsidyConfigs, projectType]);

  useEffect(() => {
    if (config.isLoading) return;
    const activeIds = eligibleSubsidiesForProject.map((c) => c.id);
    const prev = prevProjectTypeRef.current;
    const typeChanged = prev !== null && prev !== projectType;

    if (!initialSubsidySyncedRef.current) {
      initialSubsidySyncedRef.current = true;
      formLogic.handleSelectedSubsidyIdsChange(activeIds);
    } else if (typeChanged) {
      formLogic.handleSelectedSubsidyIdsChange(activeIds);
    }

    prevProjectTypeRef.current = projectType;
  }, [
    config.isLoading,
    eligibleSubsidiesForProject,
    projectType,
    formLogic.handleSelectedSubsidyIdsChange,
  ]);

  // Set default structure type from API once loaded
  useEffect(() => {
    const firstStructure = config.structureTypes[0];
    if (firstStructure && !form.getValues('structureType')) {
      form.setValue('structureType', firstStructure.value);
    }
  }, [config.structureTypes, form]);

  // Auto-map project type when pre-selected property loads
  useEffect(() => {
    if (preselectedPropertyId && propertiesRaw && propertiesRaw.length > 0) {
      const prop = propertiesRaw.find(
        (p: CustomerPropertyResponse) => p.id === preselectedPropertyId,
      );
      if (prop?.propertyType) {
        formLogic.handlePropertySelect(prop.propertyType);
      }
    }
  }, [preselectedPropertyId, propertiesRaw, formLogic.handlePropertySelect]);

  // ── Save / Download state ──
  const saveMutation = useSaveQuote();
  const [savedQuoteNumber, setSavedQuoteNumber] = useState<string | null>(null);
  const [savedMilestones, setSavedMilestones] = useState<PaymentMilestone[] | null>(null);
  const [paymentTermsModalOpen, setPaymentTermsModalOpen] = useState(false);
  const { generatePdf, isGenerating: isDownloading } = useQuotePdf();
  const profitabilityAmount = calculation?.profitabilityAmount ?? 0;
  const maxDiscountAmount = Math.max(0, profitabilityAmount * 0.5);
  const isDiscountInputDisabled = !!calculation && profitabilityAmount <= 0;
  const isDiscountOverLimit = !!calculation && discountAmount > maxDiscountAmount;

  useEffect(() => {
    if (isDiscountInputDisabled && discountAmount > 0) {
      form.setValue('discountAmount', 0);
    }
  }, [discountAmount, form, isDiscountInputDisabled]);

  // ── Handlers ──
  const handleCustomerSelect = useCallback(
    (customer: QuoteCustomer | null) => {
      setSelectedCustomer(customer);
      setCustomerSearch('');
      setIsDropdownOpen(false);
      form.setValue('customerId', customer?.id ?? '');
      form.setValue('propertyId', undefined);
      setCalculation(null);
      setSavedQuoteNumber(null);
    },
    [form],
  );

  const handlePropertySelect = useCallback(
    (propId: string) => {
      form.setValue('propertyId', propId);
      const prop = propertiesRaw?.find((p: CustomerPropertyResponse) => p.id === propId);
      if (prop) {
        formLogic.handlePropertySelect(prop.propertyType);
      }
    },
    [form, propertiesRaw, formLogic],
  );

  const buildCalculateRequest = useCallback(
    (values: QuoteBuilderFormData): CalculateQuoteRequest => ({
      customerId: values.customerId,
      propertyId: values.propertyId,
      projectType: values.projectType,
      systemSizeKw: values.systemSizeKw,
      phaseType: values.phaseType,
      subsidyApplicable: (values.selectedSubsidyIds?.length ?? 0) > 0,
      selectedSubsidyIds:
        (values.selectedSubsidyIds?.length ?? 0) > 0 ? values.selectedSubsidyIds : undefined,
      dcrPreference: values.dcrPreference,
      preferredPanelBrand: values.preferredPanelBrand || undefined,
      preferredPanelTechnology: values.preferredPanelTechnology,
      preferredPanelWattage: values.preferredPanelWattage,
      preferredInverterBrand: values.preferredInverterBrand || undefined,
      preferredInverterCapacityKw: values.preferredInverterCapacityKw || undefined,
      structureType: values.structureType,
      floorNumber: values.floorNumber,
      distanceKm: values.distanceKm,
      manualDcrPanelCount,
      manualNonDcrPanelCount,
      manualInverterCount,
    }),
    [manualDcrPanelCount, manualNonDcrPanelCount, manualInverterCount],
  );

  const toggleSubsidySelection = useCallback(
    (subsidyId: string, checked: boolean, current: string[]): void => {
      const next = checked
        ? Array.from(new Set([...current, subsidyId]))
        : current.filter((id) => id !== subsidyId);
      formLogic.handleSelectedSubsidyIdsChange(next);
    },
    [formLogic],
  );

  const handleCalculate = useCallback(
    async (options?: { resetManualCounts?: boolean }) => {
      if (isInactiveCustomer) {
        showToast.error('Cannot perform this action: customer is inactive');
        return;
      }
      const gc = config.quoteConfig?.gstConfig;
      if (!gc?.rate1 || !gc.rate2) {
        showToast.error(
          'GST configuration is incomplete. Please configure GST rates in Admin → Quote Config.',
        );
        return;
      }

      const valid = await form.trigger([
        'customerId',
        'projectType',
        'systemSizeKw',
        'phaseType',
        'structureType',
      ]);
      if (!valid) {
        showToast.error('Please fill all required fields before calculating');
        return;
      }

      const values = form.getValues();
      let request = buildCalculateRequest(values);

      if (options?.resetManualCounts) {
        request = {
          ...request,
          manualDcrPanelCount: undefined,
          manualNonDcrPanelCount: undefined,
          manualInverterCount: undefined,
        };
        setManualDcrPanelCount(undefined);
        setManualNonDcrPanelCount(undefined);
        setManualInverterCount(undefined);
        setHasQuantityChanges(false);
      }

      calculateMutation.mutate(request, {
        onSuccess: (data) => {
          setCalculation(data);
          setHasQuantityChanges(false);
          setSavedQuoteNumber(null);
        },
        onError: (error) => {
          const message = getErrorMessage(error);
          let suggestion = '';
          if (isAxiosError(error)) {
            const suggestionData = error.response?.data?.suggestion;
            if (Array.isArray(suggestionData)) {
              suggestion = `Try: ${suggestionData.join(', ')} units`;
            } else if (suggestionData && typeof suggestionData === 'object') {
              const sug = suggestionData as { dcr?: number; nonDcr?: number };
              if (sug.dcr) suggestion = `Try ${sug.dcr} DCR panels`;
              else if (sug.nonDcr) suggestion = `Try ${sug.nonDcr} Non-DCR panels`;
            }
          }
          showToast.error(suggestion ? `${message} ${suggestion}` : message);
        },
      });
    },
    [
      form,
      buildCalculateRequest,
      calculateMutation,
      config.quoteConfig?.gstConfig,
      isInactiveCustomer,
    ],
  );

  const handleRecalculate = useCallback(() => {
    void handleCalculate();
  }, [handleCalculate]);

  const handleQuantityChange = useCallback(
    (setter: (v: number | undefined) => void) => (val: number | undefined) => {
      setter(val);
      setHasQuantityChanges(true);
      setSavedQuoteNumber(null);
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!calculation) return;
    if (isInactiveCustomer) {
      showToast.error('Cannot perform this action: customer is inactive');
      return;
    }
    if (isDiscountOverLimit) {
      showToast.error('Discount cannot exceed 50% of the margin');
      return;
    }
    if (!propertyId) {
      showToast.error('Please select a property before saving the quote');
      return;
    }
    setPaymentTermsModalOpen(true);
  }, [calculation, propertyId, isInactiveCustomer, isDiscountOverLimit]);

  const handlePaymentTermsConfirm = useCallback(
    (milestones: PaymentMilestone[]) => {
      setPaymentTermsModalOpen(false);
      if (!calculation) return;
      const values = form.getValues();
      if (!values.propertyId) {
        showToast.error('Please select a property before saving the quote');
        return;
      }
      const request: CreateFromCalculationRequest = {
        ...buildCalculateRequest(values),
        propertyId: values.propertyId,
        discountAmount: values.discountAmount,
        internalNotes: values.internalNotes || undefined,
        customerNotes: values.customerNotes || undefined,
        paymentMilestones: milestones,
      };

      saveMutation.mutate(request, {
        onSuccess: (data) => {
          setSavedQuoteNumber(data.quoteNumber);
          setSavedMilestones(milestones);
          showToast.success(`Quote ${data.quoteNumber} saved`);
          if (data.quoteId) {
            router.push(buildRoute(ROUTES.QUOTES.DETAIL, { id: data.quoteId }));
          } else {
            showToast.error('Quote saved, but unable to redirect: quote ID is missing.');
          }
        },
        onError: (error: unknown) => {
          showToast.error(getErrorMessage(error));
        },
      });
    },
    [calculation, form, buildCalculateRequest, saveMutation],
  );

  const handleDownload = useCallback(async () => {
    if (!calculation || !savedQuoteNumber) return;
    const gstCfg = config.quoteConfig?.gstConfig;
    if (!gstCfg) {
      showToast.error('GST configuration not loaded. Please refresh the page.');
      return;
    }

    const cust = selectedCustomer;
    const prop = propertiesRaw?.find((p: CustomerPropertyResponse) => p.id === propertyId);
    const discount = discountAmount;

    try {
      await generatePdf({
        calculation,
        customer: {
          name: cust ? `${cust.firstName} ${cust.lastName}`.trim() : 'Customer',
          phone: cust?.phone,
          email: cust?.email,
        },
        property: {
          propertyName: prop?.propertyName,
          address: prop?.address,
          city: prop?.city,
          state: prop?.state,
          pincode: prop?.pincode,
        },
        quoteNumber: savedQuoteNumber,
        validityDays: config.quoteConfig?.defaultValidityDays ?? 30,
        paymentMilestones:
          savedMilestones ??
          config.quoteConfig?.paymentMilestones?.map(
            (m: {
              stage: string;
              name: string;
              description?: string;
              percentage: number;
              color?: string;
            }) => {
              const postDiscountTotal = applyPreGstDiscount(
                calculation.pricing.basePrice,
                discount,
                gstCfg,
              ).grossTotal;
              return {
                ...m,
                amount: Math.round(postDiscountTotal * (m.percentage / 100)),
              };
            },
          ),
        discountAmount: discount,
        gstConfig: gstCfg,
      });
      showToast.success('PDF downloaded');
    } catch {
      showToast.error('Failed to generate PDF');
    }
  }, [
    calculation,
    savedQuoteNumber,
    savedMilestones,
    selectedCustomer,
    propertiesRaw,
    propertyId,
    config.quoteConfig,
    discountAmount,
    generatePdf,
  ]);

  // ── Render helpers ──

  const previewPanel = (
    <QuotePreviewPanel
      calculation={calculation}
      isCalculating={calculateMutation.isPending}
      calculationError={calculateMutation.error ? getErrorMessage(calculateMutation.error) : null}
      discountAmount={discountAmount}
      gstConfig={config.quoteConfig?.gstConfig ?? null}
      floorNumber={floorNumber}
      distanceKm={distanceKm}
      manualDcrPanelCount={manualDcrPanelCount}
      manualNonDcrPanelCount={manualNonDcrPanelCount}
      manualInverterCount={manualInverterCount}
      onManualDcrPanelCountChange={handleQuantityChange(setManualDcrPanelCount)}
      onManualNonDcrPanelCountChange={handleQuantityChange(setManualNonDcrPanelCount)}
      onManualInverterCountChange={handleQuantityChange(setManualInverterCount)}
      hasQuantityChanges={hasQuantityChanges}
      onRecalculate={handleRecalculate}
      isSaving={saveMutation.isPending}
      savedQuoteNumber={savedQuoteNumber}
      isSaveDisabled={!propertyId || isInactiveCustomer || isDiscountOverLimit}
      onSave={handleSave}
      isDownloading={isDownloading}
      onDownload={() => void handleDownload()}
    />
  );

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.QUOTES.LIST}>Quotes</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>New Quote</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Config loading state */}
      {config.isLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-border-light bg-background p-4">
          <Spinner size="sm" />
          <span className="text-sm text-foreground-secondary">Loading configuration...</span>
        </div>
      )}

      {config.error && (
        <div className="flex items-center gap-2 rounded-lg border border-error/30 bg-error/5 p-4">
          <AlertCircle className="size-4 text-error" />
          <span className="text-sm text-error">Failed to load configuration: {config.error}</span>
        </div>
      )}

      {!config.isLoading && missingProductCategories.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-warning">
              {missingProductCategories.length === 3
                ? 'No products configured'
                : `Missing product configuration: ${missingProductCategories.join(', ')}`}
            </p>
            <p className="text-xs text-foreground-secondary">
              Quote calculation requires active solar panels, inverters, and mounting structures.
              Please configure products in the{' '}
              <a href={ROUTES.ADMIN.PRODUCTS} className="font-medium text-primary hover:underline">
                Admin &rarr; Products
              </a>{' '}
              section before creating quotes.
            </p>
          </div>
        </div>
      )}

      {isInactiveCustomer && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-sm text-foreground-secondary">
            This customer is inactive. Quote creation is blocked until the customer is reactivated.
          </p>
        </div>
      )}

      {/* 50/50 Split Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── LEFT: Form ── */}
        <div className="space-y-5">
          {/* Section 1: Customer & Property */}
          <section className="rounded-lg border border-border-light bg-background p-4">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="size-4 text-foreground-secondary" />
              <h2 className="text-sm font-semibold">Customer & Property</h2>
            </div>

            <div className="space-y-4">
              {/* Customer */}
              <div className="space-y-2">
                <Label>Customer *</Label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between rounded-md border border-border-light bg-background-secondary px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-2xs font-medium text-primary">
                        {selectedCustomer.firstName.charAt(0)}
                        {selectedCustomer.lastName.charAt(0)}
                      </div>
                      <span className="font-medium">
                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                      </span>
                      <span className="text-foreground-secondary">{selectedCustomer.phone}</span>
                    </div>
                    {!preselectedCustomerId && (
                      <button
                        type="button"
                        onClick={() => handleCustomerSelect(null)}
                        className="rounded p-0.5 text-foreground-tertiary transition-colors duration-fast hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div ref={dropdownRef} className="relative">
                    <Input
                      placeholder="Search by name, phone, or email..."
                      leftIcon={<Search className="size-4" />}
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                    />
                    {isDropdownOpen && customerSearch.length >= 2 && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-border-light bg-background shadow-sm">
                        <div className="max-h-48 overflow-auto p-1">
                          {isCustomersLoading ? (
                            <div className="px-3 py-4 text-center text-sm text-foreground-tertiary">
                              Searching...
                            </div>
                          ) : customers.length > 0 ? (
                            customers.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleCustomerSelect(c)}
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-fast hover:bg-background-secondary"
                              >
                                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xs font-medium text-primary">
                                  {c.firstName.charAt(0)}
                                  {c.lastName.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-medium">
                                    {c.firstName} {c.lastName}
                                  </span>
                                  <span className="ml-2 text-foreground-secondary">{c.phone}</span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-4 text-center text-sm text-foreground-tertiary">
                              No customers found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {form.formState.errors.customerId && (
                  <p className="text-xs text-error">{form.formState.errors.customerId.message}</p>
                )}
              </div>

              {/* Property */}
              {customerId && (
                <div className="space-y-2">
                  <Label>Property</Label>
                  {isPropertiesFetching ? (
                    <Skeleton className="h-9 w-full" />
                  ) : properties.length > 0 ? (
                    <Select
                      value={propertyId || ''}
                      onValueChange={handlePropertySelect}
                      disabled={!!preselectedPropertyId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a property..." />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.propertyName}
                            <span className="ml-2 text-foreground-secondary">
                              {p.address}, {p.city}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-foreground-tertiary">
                      No properties found for this customer.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Section 2: System Configuration */}
          <section className="rounded-lg border border-border-light bg-background p-4">
            <div className="mb-4 flex items-center gap-2">
              <Settings2 className="size-4 text-foreground-secondary" />
              <h2 className="text-sm font-semibold">System Configuration</h2>
            </div>

            <div className="space-y-4">
              {/* System Size */}
              <div className="space-y-3">
                <Label>System Size (kW) *</Label>
                <div className="flex flex-col items-center gap-3">
                  {/* Editable stepper */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-lg"
                      disabled={form.watch('systemSizeKw') <= SYSTEM_SIZE_CONFIG.min}
                      onClick={() =>
                        formLogic.handleSystemSizeChange(
                          Math.max(
                            SYSTEM_SIZE_CONFIG.min,
                            form.watch('systemSizeKw') - SYSTEM_SIZE_CONFIG.step,
                          ),
                        )
                      }
                    >
                      <span className="text-base font-medium">−</span>
                    </Button>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={SYSTEM_SIZE_CONFIG.min}
                        max={SYSTEM_SIZE_CONFIG.max}
                        step={SYSTEM_SIZE_CONFIG.step}
                        value={form.watch('systemSizeKw')}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!Number.isNaN(val) && val >= 0) {
                            formLogic.handleSystemSizeChange(
                              Math.min(
                                SYSTEM_SIZE_CONFIG.max,
                                Math.max(SYSTEM_SIZE_CONFIG.min, val),
                              ),
                            );
                          }
                        }}
                        className={cn(
                          'w-20 rounded-lg border border-border-light bg-background py-2 text-center text-lg font-semibold tabular-nums',
                          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15',
                          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-lg"
                      disabled={form.watch('systemSizeKw') >= SYSTEM_SIZE_CONFIG.max}
                      onClick={() =>
                        formLogic.handleSystemSizeChange(
                          Math.min(
                            SYSTEM_SIZE_CONFIG.max,
                            form.watch('systemSizeKw') + SYSTEM_SIZE_CONFIG.step,
                          ),
                        )
                      }
                    >
                      <span className="text-base font-medium">+</span>
                    </Button>
                    <span className="text-sm font-medium text-foreground-secondary">kW</span>
                  </div>

                  {/* Quick presets */}
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {QUICK_SIZE_OPTIONS.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => formLogic.handleSystemSizeChange(size)}
                        className={cn(
                          'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-fast',
                          form.watch('systemSizeKw') === size
                            ? 'bg-primary text-white'
                            : 'bg-muted text-foreground-secondary hover:bg-primary/10 hover:text-primary',
                        )}
                      >
                        {size} kW
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-center text-xs text-foreground-tertiary">
                  Min: {SYSTEM_SIZE_CONFIG.min} kW &middot; Max: {SYSTEM_SIZE_CONFIG.max} kW
                </p>
                {form.formState.errors.systemSizeKw && (
                  <p className="text-xs text-error">{form.formState.errors.systemSizeKw.message}</p>
                )}
              </div>

              {/* Project Type */}
              <div className="space-y-2">
                <Label>Project Type *</Label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = form.watch('projectType') === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => formLogic.handleFieldChange('projectType', opt.value)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-fast',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border-light bg-background text-foreground-secondary hover:border-primary/50 hover:bg-primary/5',
                        )}
                      >
                        <Icon className="size-3.5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {form.formState.errors.projectType && (
                  <p className="text-xs text-error">{form.formState.errors.projectType.message}</p>
                )}
              </div>

              {/* Phase Type */}
              <div className="space-y-2">
                <Label>Phase Type *</Label>
                <div className="flex gap-2">
                  {config.phaseTypeOptions.map((opt) => {
                    const isSelected = form.watch('phaseType') === opt.value;
                    const isDisabled =
                      opt.value === 'single_phase' && formLogic.shouldDisableSinglePhase;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => formLogic.handlePhaseChange(opt.value)}
                        className={cn(
                          'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-fast',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border-light bg-background text-foreground-secondary hover:border-primary/50 hover:bg-primary/5',
                          isDisabled && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        <div>{opt.label}</div>
                        <div className="mt-0.5 text-2xs font-normal text-foreground-tertiary">
                          {opt.subtitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {formLogic.shouldDisableSinglePhase && (
                  <div className="flex items-center gap-2 rounded-lg bg-info/10 p-2">
                    <Info className="size-3.5 text-info" />
                    <p className="text-xs text-info">
                      Systems above 7 kW require three phase connection
                    </p>
                  </div>
                )}
              </div>

              {/* Subsidy selection */}
              <div className="space-y-3 rounded-lg border border-primary/30 bg-linear-to-r from-primary/5 to-success/5 p-4">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary">
                    <CircleDollarSign className="size-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Government subsidies</p>
                    <p className="text-xs text-foreground-secondary">
                      Select schemes to include in this quote.
                    </p>
                  </div>
                </div>
                {config.isLoading && (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full rounded-lg" />
                    <Skeleton className="h-16 w-full rounded-lg" />
                  </div>
                )}
                {!config.isLoading && config.error && (
                  <p className="text-xs text-error">
                    Subsidy rules could not be loaded. You can still calculate without subsidies.
                  </p>
                )}
                {!config.isLoading && !config.error && eligibleSubsidiesForProject.length === 0 && (
                  <p className="text-xs text-foreground-secondary">
                    No active subsidy schemes for this project type.
                  </p>
                )}
                {!config.isLoading && !config.error && (
                  <Controller
                    control={form.control}
                    name="selectedSubsidyIds"
                    render={({ field }) => {
                      const selectedIds = field.value ?? [];
                      return (
                        <>
                          {eligibleSubsidiesForProject.map((scheme) => {
                            const checked = selectedIds.includes(scheme.id);
                            const maxAmountLabel =
                              scheme.maxSubsidyAmount != null && scheme.maxSubsidyAmount > 0
                                ? formatCurrency(scheme.maxSubsidyAmount)
                                : 'Tier-based';
                            return (
                              <label
                                key={scheme.id}
                                htmlFor={`subsidy-${scheme.id}`}
                                className={cn(
                                  'flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors duration-fast',
                                  checked
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border-light bg-background hover:border-primary/40',
                                )}
                              >
                                <Checkbox
                                  id={`subsidy-${scheme.id}`}
                                  checked={checked}
                                  onCheckedChange={(v) =>
                                    toggleSubsidySelection(scheme.id, v === true, selectedIds)
                                  }
                                  className="mt-0.5"
                                />
                                <div className="min-w-0 flex-1 space-y-1">
                                  <p className="text-sm font-medium text-foreground">
                                    {scheme.schemeName}
                                  </p>
                                  <p className="text-2xs text-foreground-secondary">
                                    Max {scheme.maxSubsidyKw} kW eligible &middot; Max subsidy{' '}
                                    {maxAmountLabel} &middot;{' '}
                                    {scheme.requiresDcr ? 'DCR required' : 'DCR not required'}
                                    {scheme.autoSplitEnabled ? ' · Auto split on' : ''}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </>
                      );
                    }}
                  />
                )}
              </div>

              {/* DCR Preference */}
              {formLogic.shouldShowDcrPreference && (
                <div className="space-y-2">
                  <Label>DCR Preference</Label>
                  <div className="flex flex-col gap-2">
                    {DCR_PREFERENCE_OPTIONS.map((opt) => {
                      const isSelected = form.watch('dcrPreference') === opt.value;
                      const isDisabled = formLogic.isDcrDisabled;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => formLogic.handleFieldChange('dcrPreference', opt.value)}
                          className={cn(
                            'flex items-start gap-3 rounded-lg border p-3 text-left transition-all duration-fast',
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border-light bg-background hover:border-primary/50 hover:bg-primary/5',
                            isDisabled && 'cursor-not-allowed opacity-50',
                          )}
                        >
                          {/* Radio circle */}
                          <div
                            className={cn(
                              'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-fast',
                              isSelected ? 'border-primary' : 'border-border-medium',
                            )}
                          >
                            {isSelected && <div className="size-2 rounded-full bg-primary" />}
                          </div>
                          {/* Content */}
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-foreground">
                                {opt.label}
                              </span>
                              {opt.recommended && (
                                <Badge variant="info" size="xs">
                                  Recommended
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-foreground-tertiary">
                              {opt.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 3: Equipment */}
          <section className="rounded-lg border border-border-light bg-background p-4">
            <div className="mb-4 flex items-center gap-2">
              <Wrench className="size-4 text-foreground-secondary" />
              <h2 className="text-sm font-semibold">Equipment Preferences</h2>
            </div>

            <div className="space-y-4">
              {/* Panel Brand */}
              <div className="space-y-2">
                <Label>Panel Brand</Label>
                {config.isLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : config.panelBrands.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
                    <AlertTriangle className="size-3.5 shrink-0 text-warning" />
                    <p className="text-xs text-foreground-secondary">
                      No active solar panels found.{' '}
                      <a
                        href={ROUTES.ADMIN.PRODUCTS}
                        className="font-medium text-primary hover:underline"
                      >
                        Add panels
                      </a>
                    </p>
                  </div>
                ) : (
                  <Select
                    value={form.watch('preferredPanelBrand') || 'auto'}
                    onValueChange={(v) => formLogic.handleBrandChange(v === 'auto' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-select best available" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        <span className="text-foreground-tertiary">Auto-select best available</span>
                      </SelectItem>
                      {config.panelBrands.map((brand) => (
                        <SelectItem key={brand.value} value={brand.value}>
                          {brand.label}
                          {brand.wattageRange && (
                            <span className="ml-2 text-foreground-secondary">
                              {brand.wattageRange}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Technology Variant */}
              {form.watch('preferredPanelBrand') &&
                config.getTechnologyVariantsForBrand(form.watch('preferredPanelBrand')!).length >
                  0 && (
                  <div className="space-y-2">
                    <Label>Panel Technology & Wattage</Label>
                    <div className="flex flex-wrap gap-2">
                      {config
                        .getTechnologyVariantsForBrand(form.watch('preferredPanelBrand')!)
                        .map((variant) => {
                          const isSelected =
                            form.watch('preferredPanelTechnology') === variant.technology &&
                            form.watch('preferredPanelWattage') === variant.minWattage;
                          return (
                            <button
                              key={`${variant.technology}-${variant.minWattage}`}
                              type="button"
                              onClick={() =>
                                formLogic.handleTechnologyVariantSelect(
                                  variant.technology,
                                  variant.minWattage,
                                )
                              }
                              className={cn(
                                'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-fast',
                                isSelected
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border-light bg-background hover:border-primary/50 hover:bg-primary/5',
                              )}
                            >
                              <div
                                className={cn(
                                  'flex size-3.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-fast',
                                  isSelected ? 'border-primary' : 'border-border-medium',
                                )}
                              >
                                {isSelected && <div className="size-1.5 rounded-full bg-primary" />}
                              </div>
                              {variant.label}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

              {/* Inverter Brand */}
              <div className="space-y-2">
                <Label>Inverter Brand</Label>
                {config.isLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : config.inverterBrands.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
                    <AlertTriangle className="size-3.5 shrink-0 text-warning" />
                    <p className="text-xs text-foreground-secondary">
                      No active inverters found.{' '}
                      <a
                        href={ROUTES.ADMIN.PRODUCTS}
                        className="font-medium text-primary hover:underline"
                      >
                        Add inverters
                      </a>
                    </p>
                  </div>
                ) : (
                  <Select
                    value={form.watch('preferredInverterBrand') || 'auto'}
                    onValueChange={(v) =>
                      formLogic.handleInverterBrandChange(v === 'auto' ? '' : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-select best available" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        <span className="text-foreground-tertiary">Auto-select best available</span>
                      </SelectItem>
                      {config.inverterBrands.map((brand) => (
                        <SelectItem key={brand.value} value={brand.value}>
                          {brand.label}
                          {brand.capacityRange && (
                            <span className="ml-2 text-foreground-secondary">
                              {brand.capacityRange}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Inverter Capacity */}
              <div className="space-y-2">
                <Label>Inverter Capacity</Label>
                {config.isLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  (() => {
                    const capacityOptions = config.getInverterCapacities(
                      form.watch('phaseType'),
                      form.watch('preferredInverterBrand'),
                    );
                    return capacityOptions.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-md border border-border-light bg-background-secondary px-3 py-2">
                        <Info className="size-3.5 shrink-0 text-foreground-tertiary" />
                        <p className="text-xs text-foreground-tertiary">
                          {config.inverterBrands.length === 0
                            ? 'No inverters configured yet.'
                            : 'No capacity options for the selected brand and phase type. Try a different brand or leave on auto-select.'}
                        </p>
                      </div>
                    ) : (
                      <Select
                        value={form.watch('preferredInverterCapacityKw')?.toString() ?? 'auto'}
                        onValueChange={(v) =>
                          formLogic.handleFieldChange(
                            'preferredInverterCapacityKw',
                            v === 'auto' ? undefined : Number(v),
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Auto-select optimal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">
                            <span className="text-foreground-tertiary">Auto-select optimal</span>
                          </SelectItem>
                          {capacityOptions.map((cap) => (
                            <SelectItem key={cap.value} value={cap.value.toString()}>
                              {cap.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  })()
                )}
              </div>

              {/* Structure Type */}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Structure Type *</Label>
                  {missingFields.includes('Structure Type') && (
                    <Badge variant="destructive" size="xs">
                      Required
                    </Badge>
                  )}
                </div>
                {config.isLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-28 rounded-lg" />
                    ))}
                  </div>
                ) : config.structureTypes.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
                    <AlertTriangle className="size-3.5 shrink-0 text-warning" />
                    <p className="text-xs text-foreground-secondary">
                      No active mounting structures found.{' '}
                      <a
                        href={ROUTES.ADMIN.PRODUCTS}
                        className="font-medium text-primary hover:underline"
                      >
                        Add structures
                      </a>
                    </p>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'flex flex-wrap gap-2 rounded-lg p-3 transition-colors',
                      missingFields.includes('Structure Type') &&
                        'border-2 border-destructive/30 bg-destructive/5',
                    )}
                  >
                    {config.structureTypes.map((opt) => {
                      const isSelected = form.watch('structureType') === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => formLogic.handleFieldChange('structureType', opt.value)}
                          className={cn(
                            'rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-fast',
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border-light bg-background text-foreground-secondary hover:border-primary/50 hover:bg-primary/5',
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {form.formState.errors.structureType && (
                  <p className="text-xs text-error">
                    {form.formState.errors.structureType.message}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Section 4: Installation Details */}
          <section className="rounded-lg border border-border-light bg-background p-4">
            <div className="mb-4 flex items-center gap-2">
              <Wrench className="size-4 text-foreground-secondary" />
              <h2 className="text-sm font-semibold">Installation Details</h2>
            </div>

            {isPricingFetched && floorIncrementPercent == null && transportRatePerKm == null && (
              <div className="mb-4 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
                <span className="mt-0.5 shrink-0">⚠️</span>
                <span>
                  No installation pricing tier is configured for a{' '}
                  <strong>{systemSizeKw} kW</strong> system. Please ask your administrator to add a
                  pricing tier covering this size before calculating.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Floor Number */}
              <div className="space-y-2">
                <Label>Installation Floor</Label>
                <NumberStepper
                  value={floorNumber}
                  onChange={(v) => formLogic.handleFieldChange('floorNumber', v)}
                  min={0}
                  max={20}
                  step={1}
                  size="sm"
                />
                <p
                  className={cn(
                    'text-xs',
                    floorNumber === 0 ? 'text-foreground-tertiary' : 'text-warning font-medium',
                  )}
                >
                  {floorNumber === 0
                    ? 'Ground floor — No extra charges'
                    : floorIncrementPercent != null
                      ? `Floor ${floorNumber} — +${floorNumber * floorIncrementPercent}% extra charges`
                      : `Floor ${floorNumber} — Loading charges...`}
                </p>
              </div>

              {/* Distance */}
              <div className="space-y-2">
                <Label htmlFor="distanceKm">Distance (km)</Label>
                <Input
                  id="distanceKm"
                  type="number"
                  inputMode="numeric"
                  step="5"
                  min="0"
                  max="500"
                  value={distanceKm}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    formLogic.handleFieldChange('distanceKm', val);
                  }}
                  error={form.formState.errors.distanceKm?.message}
                />
                <div className="flex items-center gap-1.5 text-xs text-foreground-secondary">
                  <Truck className="size-3" />
                  <span>Transport:</span>
                  <span className="font-semibold text-foreground">
                    {transportRatePerKm != null
                      ? formatCurrency((distanceKm || 0) * transportRatePerKm)
                      : '...'}
                  </span>
                  {isPricingFetched && transportRatePerKm != null && (
                    <span className="text-foreground-tertiary">
                      @ {formatCurrencyDecimal(transportRatePerKm)}/km
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Discount */}
          <section className="rounded-lg border border-border-light bg-background p-4">
            <div className="mb-4 flex items-center gap-2">
              <CircleDollarSign className="size-4 text-foreground-secondary" />
              <h2 className="text-sm font-semibold">Discount</h2>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-foreground-secondary">
                  ₹
                </span>
                <Input
                  type="number"
                  min="0"
                  className="pl-7 pr-8"
                  placeholder="0"
                  disabled={isDiscountInputDisabled}
                  value={discountAmount || ''}
                  onChange={(e) => form.setValue('discountAmount', Number(e.target.value) || 0)}
                />
                {discountAmount > 0 && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-foreground-tertiary hover:text-foreground"
                    onClick={() => form.setValue('discountAmount', 0)}
                    disabled={isDiscountInputDisabled}
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              {calculation && (
                <p
                  className={cn(
                    'text-xs',
                    isDiscountOverLimit ? 'text-error' : 'text-foreground-secondary',
                  )}
                >
                  {isDiscountInputDisabled
                    ? 'Discount unavailable when margin is zero or negative.'
                    : `Maximum discount allowed: ${formatCurrency(maxDiscountAmount)} (50% of margin)`}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {DISCOUNT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => form.setValue('discountAmount', preset)}
                    disabled={isDiscountInputDisabled}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-fast',
                      isDiscountInputDisabled && 'cursor-not-allowed opacity-50',
                      discountAmount === preset
                        ? 'bg-primary text-white'
                        : 'bg-muted text-foreground-secondary hover:bg-primary/10 hover:text-primary',
                    )}
                  >
                    ₹{preset.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Section 6: Notes */}
          <section className="rounded-lg border border-border-light bg-background p-4">
            <div className="mb-4 flex items-center gap-2">
              <StickyNote className="size-4 text-foreground-secondary" />
              <h2 className="text-sm font-semibold">Notes</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerNotes">Customer Notes</Label>
                <Textarea
                  id="customerNotes"
                  placeholder="Requirements or site conditions visible to customer..."
                  rows={2}
                  {...form.register('customerNotes')}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="internalNotes">Internal Notes</Label>
                  <Badge variant="muted" size="xs">
                    Private
                  </Badge>
                </div>
                <Textarea
                  id="internalNotes"
                  placeholder="Internal notes (not visible to customer)..."
                  rows={2}
                  {...form.register('internalNotes')}
                />
              </div>
            </div>
          </section>

          {/* Calculate Button */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push(ROUTES.QUOTES.LIST)}
            >
              Cancel
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    type="button"
                    onClick={() => {
                      void handleCalculate({ resetManualCounts: true });
                    }}
                    disabled={isCalculateDisabled}
                  >
                    {calculateMutation.isPending ? (
                      <>
                        <Spinner size="xs" className="mr-1.5" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <Calculator className="mr-1.5 size-4" />
                        Calculate Quote
                      </>
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {tooltipMessage && (
                <TooltipContent>
                  <p className="text-sm">{tooltipMessage}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>

        {/* ── RIGHT: Preview (desktop) ── */}
        <div className="hidden lg:block">
          <div className="sticky top-6">{previewPanel}</div>
        </div>
      </div>

      {/* ── Payment Terms Modal ── */}
      <PaymentTermsModal
        open={paymentTermsModalOpen}
        onClose={() => setPaymentTermsModalOpen(false)}
        defaultMilestones={(config.quoteConfig?.paymentMilestones ?? []).map(
          (m: { stage: string; name: string; percentage: number; order?: number }, i: number) => ({
            stage: m.stage,
            name: m.name,
            percentage: m.percentage,
            order: m.order ?? i + 1,
          }),
        )}
        grossTotal={
          calculation && config.quoteConfig?.gstConfig
            ? applyPreGstDiscount(
                calculation.pricing.basePrice,
                discountAmount,
                config.quoteConfig.gstConfig,
              ).grossTotal
            : 0
        }
        onConfirm={handlePaymentTermsConfirm}
      />

      {/* ── Mobile preview: Sheet drawer ── */}
      <div className="fixed bottom-6 right-6 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-lg shadow-sm">
              <Eye className="mr-1.5 size-4" />
              Preview
              {calculation && (
                <Badge variant="default" size="xs" className="ml-2">
                  Ready
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Quote Preview</SheetTitle>
            </SheetHeader>
            <div className="mt-4">{previewPanel}</div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
