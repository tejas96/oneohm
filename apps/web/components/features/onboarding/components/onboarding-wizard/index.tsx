'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Box, Button } from '@mui/material';
import {
  ConnectionType,
  DocumentEntityType,
  FollowupType,
  type LeadTemperature,
  nextFollowupDate,
  PropertyType,
  type StoredChangeRequest,
} from '@tejas96/shared/types';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { FormProvider, useForm, type DefaultValues, type Resolver } from 'react-hook-form';

import {
  Step0FindCustomer,
  Step1CustomerIdentity,
  Step2BillingAddress,
  Step4SiteAddress,
  StepReviewAssign,
} from './steps';
import {
  BlockedBanner,
  CustomerChip,
  ErrorSummary,
  MobileProgress,
  StepCard,
  WizardFooter,
  WizardHeader,
  WizardStepper,
} from './wizard-chrome';
import { getVisibleSteps, type OnboardingMode, type OnboardingStepKey } from '../../constants';
import {
  getOnboardingResolverSchema,
  type OnboardingFormData,
} from '../../schemas/onboarding.schema';

import {
  useCreateCustomer,
  useUpdateCustomer,
  useUpdateCustomerStatus,
  type Customer,
  type CustomerPropertyResponse,
  type CustomerResponse,
} from '@/components/features/customers';
import { useUploadDocumentsBulk } from '@/components/features/documents/hooks';
import { useCreateFollowup } from '@/components/features/followups';
import {
  useCreateProperty,
  useUpdateProperty,
  ChangeRequestFields,
  DocumentFields,
  FinancingFields,
  LeadFields,
  PropertyBasicsFields,
  UtilityFields,
} from '@/components/features/properties';
import { buildPropertyApiPayload } from '@/components/features/properties/utils';
import {
  getConvertedChangeRequests,
  pendingChangeRequestsToFormItems,
} from '@/components/features/properties/utils/change-request-display';
import { type DraftDocument } from '@/components/shared/document-manager';
import { showToast } from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { getErrorMessage } from '@/lib/utils';

interface OnboardingWizardProps {
  mode: OnboardingMode;
  /** create-site + edit-customer. */
  customerId?: string;
  customer?: CustomerResponse;
  /** edit-property. */
  propertyId?: string;
  property?: CustomerPropertyResponse;
}

/* -------------------------------------------------------------------------- */
/*  Defaults                                                                   */
/* -------------------------------------------------------------------------- */

function buildDefaults(
  mode: OnboardingMode,
  customer?: CustomerResponse,
  property?: CustomerPropertyResponse,
): DefaultValues<OnboardingFormData> {
  const base = {
    useExistingCustomer: mode !== 'create',
    existingCustomerId: customer?.id,
    sameAsBilling: mode === 'create' || mode === 'create-site',
    siteVisitAssignee: property?.siteVisitAssignee ?? '',
    siteSurveyAssignee: property?.siteSurveyAssignee ?? '',
    customerCountry: customer?.country || 'India',
  };

  if (mode === 'edit-customer') {
    return {
      ...base,
      sameAsBilling: false,
      customer: customer
        ? {
            firstName: customer.firstName,
            middleName: (customer as { middleName?: string }).middleName ?? '',
            lastName: customer.lastName ?? '',
            phone: (customer.phone ?? '').replace(/^\+91/, ''),
            email: customer.email ?? '',
            alternatePhone: (customer.alternatePhone ?? '').replace(/^\+91/, ''),
            address: customer.address ?? '',
            city: customer.city ?? '',
            state: customer.state ?? '',
            pincode: customer.pincode ?? '',
            leadSource: customer.leadSource ?? '',
            leadSourceOther: '',
            referralCode: customer.referralCode ?? '',
            status: customer.status,
            groupCode: (customer as { groupCode?: string }).groupCode ?? '',
            groupName: (customer as { groupName?: string }).groupName ?? '',
          }
        : undefined,
    } as DefaultValues<OnboardingFormData>;
  }

  if (mode === 'edit-property') {
    return {
      ...base,
      sameAsBilling: false,
      propertyName: property?.propertyName ?? '',
      propertyType: (property?.propertyType as PropertyType) ?? PropertyType.RESIDENTIAL,
      isPrimary: property?.isPrimary ?? false,
      address: property?.address ?? '',
      city: property?.city ?? '',
      state: property?.state ?? '',
      pincode: property?.pincode ?? '',
      country: property?.country || 'India',
      latitude: property?.gpsCoordinates?.latitude,
      longitude: property?.gpsCoordinates?.longitude,
      consumerNumber: property?.consumerNumber ?? '',
      consumerName: property?.consumerName ?? '',
      discomId: property?.discomId ?? '',
      connectionType: property?.connectionType as ConnectionType | undefined,
      sanctionedLoad: property?.sanctionedLoad ?? undefined,
      currentLoad: property?.currentLoad ?? '',
      meterNumber: property?.meterNumber ?? '',
      leadTemperature: property?.leadTemperature,
      wantsLoan: property?.wantsLoan ?? false,
      notes: property?.notes ?? '',
      changeRequests: pendingChangeRequestsToFormItems(property?.changeRequests) ?? [],
    } as DefaultValues<OnboardingFormData>;
  }

  // create / create-site
  return {
    ...base,
    customer: undefined,
    propertyName: '',
    propertyType: PropertyType.RESIDENTIAL,
    // A customer's first site is their primary one. Defaulting it off filed a
    // brand-new customer's only site as "an additional site", which is both
    // wrong and something nobody thinks to correct. Adding a second site to an
    // existing customer keeps the old default.
    isPrimary: !customer,
    address: customer?.address ?? '',
    city: customer?.city ?? '',
    state: customer?.state ?? '',
    pincode: customer?.pincode ?? '',
    country: customer?.country || 'India',
    consumerNumber: '',
    consumerName: '',
    discomId: '',
    connectionType: undefined,
    sanctionedLoad: undefined,
    currentLoad: '',
    meterNumber: '',
    leadTemperature: undefined,
    wantsLoan: false,
    notes: '',
    changeRequests: [],
  } as DefaultValues<OnboardingFormData>;
}

/* -------------------------------------------------------------------------- */

export function OnboardingWizard({
  mode,
  customerId,
  customer: initialCustomer,
  propertyId,
  property,
}: OnboardingWizardProps): React.JSX.Element {
  const router = useRouter();

  const isCreate = mode === 'create';
  const isEditCustomer = mode === 'edit-customer';
  const isEditProperty = mode === 'edit-property';
  const isEdit = isEditCustomer || isEditProperty;

  const [usingExistingCustomer, setUsingExistingCustomer] = React.useState(!isCreate);
  const [resolvedCustomer, setResolvedCustomer] = React.useState<CustomerResponse | undefined>(
    initialCustomer,
  );
  const [resolvedCustomerId, setResolvedCustomerId] = React.useState<string>(
    customerId ?? property?.customerId ?? '',
  );
  const [customerLocked, setCustomerLocked] = React.useState(!isCreate);
  const [isSavingCustomer, setIsSavingCustomer] = React.useState(false);
  const [blocked, setBlocked] = React.useState<{ title: string; body: string } | null>(null);
  const [showErrors, setShowErrors] = React.useState(false);

  const visibleSteps = React.useMemo(
    () => getVisibleSteps(mode, { usingExistingCustomer }),
    [mode, usingExistingCustomer],
  );

  const [activeStep, setActiveStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set());

  const activeConfig = visibleSteps[activeStep] ?? visibleSteps[0]!;
  const activeStepKey: OnboardingStepKey = activeConfig.key;

  const [propertyDraftDocs, setPropertyDraftDocs] = React.useState<DraftDocument[]>([]);
  const [loanDraftDocs, setLoanDraftDocs] = React.useState<DraftDocument[]>([]);

  const form = useForm<OnboardingFormData>({
    // The zod resolver's inferred type and `OnboardingFormData` are
    // structurally identical, but TS can't line up two independently
    // elaborated ~25-field object types across the merged schemas.
    resolver: zodResolver(getOnboardingResolverSchema(mode)) as Resolver<OnboardingFormData>,
    defaultValues: buildDefaults(mode, initialCustomer, property),
    mode: 'onChange',
  });

  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const updateCustomerStatusMutation = useUpdateCustomerStatus();
  const createPropertyMutation = useCreateProperty();
  const createFollowupMutation = useCreateFollowup();
  const updatePropertyMutation = useUpdateProperty();
  const uploadDocsBulk = useUploadDocumentsBulk();

  const isSubmitting =
    createPropertyMutation.isPending ||
    updatePropertyMutation.isPending ||
    updateCustomerMutation.isPending ||
    isSavingCustomer;

  const convertedChangeRequests = React.useMemo(
    () => getConvertedChangeRequests(property?.changeRequests) as StoredChangeRequest[],
    [property?.changeRequests],
  );

  // Re-seed once async data lands (edit modes fetch after first paint).
  React.useEffect(() => {
    if (isEditProperty && property) form.reset(buildDefaults(mode, initialCustomer, property));
  }, [isEditProperty, property?.id]);

  React.useEffect(() => {
    if (isEditCustomer && initialCustomer) form.reset(buildDefaults(mode, initialCustomer));
  }, [isEditCustomer, initialCustomer?.id]);

  // When editing a site, its owner is looked up from the property and so
  // arrives a beat after mount — adopt it once it does.
  React.useEffect(() => {
    if (!initialCustomer) return;
    setResolvedCustomer((current) =>
      current?.id === initialCustomer.id ? current : initialCustomer,
    );
    setResolvedCustomerId((current) => current || initialCustomer.id);
  }, [initialCustomer]);

  // Prefill consumerName from the resolved customer — never overwriting input.
  React.useEffect(() => {
    if (isEditProperty || !resolvedCustomer) return;
    if ((form.getValues('consumerName') ?? '').trim()) return;
    const fullName = [resolvedCustomer.firstName, resolvedCustomer.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (fullName) form.setValue('consumerName', fullName, { shouldDirty: false });
  }, [resolvedCustomer, isEditProperty, form]);

  const billingAddress = usingExistingCustomer
    ? {
        address: resolvedCustomer?.address,
        city: resolvedCustomer?.city,
        state: resolvedCustomer?.state,
        pincode: resolvedCustomer?.pincode,
        country: resolvedCustomer?.country,
      }
    : {
        address: form.watch('customer.address'),
        city: form.watch('customer.city'),
        state: form.watch('customer.state'),
        pincode: form.watch('customer.pincode'),
        country: 'India',
      };

  /* ── Step 0 actions ──────────────────────────────────────────────────── */

  const handleContinueExisting = (found: Customer): void => {
    setUsingExistingCustomer(true);
    setResolvedCustomer(found);
    setResolvedCustomerId(found.id);
    setCustomerLocked(true);
    setBlocked(null);
    form.setValue('useExistingCustomer', true);
    form.setValue('existingCustomerId', found.id);
    form.setValue('sameAsBilling', true);
    setCompletedSteps((prev) => new Set(prev).add(0));
    setActiveStep(1);
  };

  const handleStartNew = (prefillPhone: string | undefined): void => {
    setUsingExistingCustomer(false);
    setBlocked(null);
    form.setValue('useExistingCustomer', false);
    form.setValue('customer.phone', prefillPhone ?? '');
    setCompletedSteps((prev) => new Set(prev).add(0));
    setActiveStep(1);
  };

  /* ── Persistence ─────────────────────────────────────────────────────── */

  const ensureCustomerCreated = async (): Promise<string | null> => {
    if (resolvedCustomerId) return resolvedCustomerId;
    const customerData = form.getValues('customer');
    if (!customerData) return null;
    setIsSavingCustomer(true);
    try {
      const created = await createCustomerMutation.mutateAsync(customerData);
      setResolvedCustomerId(created.id);
      setResolvedCustomer(created);
      setCustomerLocked(true);
      return created.id;
    } catch (error: unknown) {
      showToast.error(getErrorMessage(error));
      return null;
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const submitCustomerEdit = async (): Promise<void> => {
    const valid = await form.trigger(['customer'] as never);
    if (!valid) {
      setShowErrors(true);
      return;
    }
    const data = form.getValues('customer');
    if (!data || !customerId) return;
    try {
      const { status, leadSourceOther, groupCode, groupName, ...profile } = data;
      const resolvedLeadSource =
        data.leadSource === 'other'
          ? (leadSourceOther ?? undefined)
          : (data.leadSource ?? undefined);
      await updateCustomerMutation.mutateAsync({
        id: customerId,
        data: {
          ...profile,
          phone: `+91${data.phone}`,
          email: profile.email?.trim() ? profile.email.trim().toLowerCase() : null,
          alternatePhone: data.alternatePhone ? `+91${data.alternatePhone}` : null,
          leadSource: resolvedLeadSource,
          groupCode: groupCode || null,
          groupName: groupName || null,
        },
      });
      if (status && status !== initialCustomer?.status) {
        await updateCustomerStatusMutation.mutateAsync({ id: customerId, status });
      }
      showToast.success('Customer updated successfully');
      router.push(buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: customerId }));
    } catch (error) {
      showToast.error(getErrorMessage(error));
    }
  };

  /** Form keys that drive the wizard itself and never reach the property API. */
  const WIZARD_ONLY_KEYS = [
    'useExistingCustomer',
    'existingCustomerId',
    'customer',
    'sameAsBilling',
    'siteVisitAssignee',
    'siteSurveyAssignee',
    'customerCountry',
    'customerLatitude',
    'customerLongitude',
    'nextFollowupDate',
    'nextFollowupAssignee',
  ];

  const buildPropertyPayload = (): Record<string, unknown> => {
    const data = form.getValues() as Record<string, unknown>;
    const propertyFields = Object.fromEntries(
      Object.entries(data).filter(([key]) => !WIZARD_ONLY_KEYS.includes(key)),
    );
    const payload = buildPropertyApiPayload(propertyFields as never) as Record<string, unknown>;
    return { ...payload, changeRequests: payload.changeRequests ?? [] };
  };

  const uploadStagedDocs = async (createdId: string, wantsLoan: boolean): Promise<void> => {
    const toPayload = (d: DraftDocument, entityType: DocumentEntityType) => ({
      entityType,
      entityId: createdId,
      propertyId: createdId,
      category: d.category,
      tag: d.tag,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      fileSizeBytes: d.fileSizeBytes,
      mimeType: d.mimeType,
    });
    const docs = [
      ...propertyDraftDocs
        .filter((d) => d.status === 'success')
        .map((d) => toPayload(d, DocumentEntityType.PROPERTY)),
      ...(wantsLoan
        ? loanDraftDocs
            .filter((d) => d.status === 'success')
            .map((d) => toPayload(d, DocumentEntityType.LOAN))
        : []),
    ];
    if (docs.length > 0) await uploadDocsBulk.mutateAsync(docs as never);
  };

  const submitPropertyEdit = async (): Promise<void> => {
    if (!propertyId) return;
    try {
      const payload = buildPropertyPayload();
      await updatePropertyMutation.mutateAsync({
        id: propertyId,
        data: {
          ...payload,
          siteVisitAssignee: form.getValues('siteVisitAssignee') || null,
          siteSurveyAssignee: form.getValues('siteSurveyAssignee') || null,
        } as never,
      });
      showToast.success('Site updated successfully');
      router.push(buildRoute(ROUTES.PROPERTIES.DETAIL, { id: propertyId }));
    } catch (error) {
      showToast.error(getErrorMessage(error));
    }
  };

  const submitCreate = async (): Promise<void> => {
    try {
      const created = await createPropertyMutation.mutateAsync({
        ...buildPropertyPayload(),
        customerId: resolvedCustomerId,
      } as never);

      await uploadStagedDocs(created.id, Boolean(form.getValues('wantsLoan')));

      const siteVisitAssignee = form.getValues('siteVisitAssignee');
      const siteSurveyAssignee = form.getValues('siteSurveyAssignee');
      if (siteVisitAssignee || siteSurveyAssignee) {
        // Best-effort: the site and its documents already exist by now, so a
        // failure here shouldn't read as "nothing was saved".
        try {
          await updatePropertyMutation.mutateAsync({
            id: created.id,
            data: {
              siteVisitAssignee: siteVisitAssignee || null,
              siteSurveyAssignee: siteSurveyAssignee || null,
            },
          });
        } catch {
          showToast.warning('Site created — assign the engineer from the site record.');
        }
      }

      // The lead now owes someone an action from the moment it exists.
      // Best-effort: the site and its documents are already saved, so a failure
      // here must not read as "nothing was created" — it surfaces in the
      // Needs follow-up bucket instead.
      const followupDate = form.getValues('nextFollowupDate');
      const followupOwner = form.getValues('nextFollowupAssignee');
      if (resolvedCustomerId && followupDate && followupOwner) {
        try {
          await createFollowupMutation.mutateAsync({
            customerId: resolvedCustomerId,
            propertyId: created.id,
            type: FollowupType.TASK,
            subject: 'First follow-up',
            scheduledAt: new Date(followupDate).toISOString(),
            assignedToUserId: followupOwner,
          });
        } catch {
          showToast.warning('Site created — schedule the first follow-up from the site record.');
        }
      }

      showToast.success(
        usingExistingCustomer ? 'Site created successfully' : 'Customer and site created',
      );
      router.push(buildRoute(ROUTES.PROPERTIES.DETAIL, { id: created.id }));
    } catch (error) {
      showToast.error(getErrorMessage(error));
    }
  };

  /* ── Navigation ──────────────────────────────────────────────────────── */

  const backLink = isEditProperty
    ? buildRoute(ROUTES.PROPERTIES.DETAIL, { id: propertyId ?? '' })
    : resolvedCustomerId
      ? buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: resolvedCustomerId })
      : ROUTES.CUSTOMERS.LIST;

  const isLastStep = activeStep === visibleSteps.length - 1;

  /**
   * Prefill the first-followup date from the lead temperature.
   *
   * Watched rather than set once, because temperature is chosen on an earlier
   * step — a user who goes back and switches HOT to COLD should not be left
   * with the HOT rhythm. Only overwrites while the field is untouched.
   */
  const watchedTemperature = form.watch('leadTemperature') as LeadTemperature | undefined;
  const followupDateTouched = form.formState.dirtyFields.nextFollowupDate;
  React.useEffect(() => {
    if (isEditProperty || isEditCustomer || followupDateTouched) return;
    form.setValue('nextFollowupDate', nextFollowupDate(new Date(), watchedTemperature ?? null));
  }, [watchedTemperature, followupDateTouched, isEditProperty, isEditCustomer, form]);

  const handleBack = (): void => {
    setShowErrors(false);
    if (activeStep === 0) {
      router.push(backLink);
      return;
    }
    setActiveStep((s) => s - 1);
  };

  const handleNext = async (): Promise<void> => {
    // Customer edit is a single logical save, not a run to a final step.
    if (isEditCustomer && isLastStep) {
      await submitCustomerEdit();
      return;
    }

    const fields = activeConfig.fields;
    const valid = fields.length ? await form.trigger(fields as never) : true;
    if (!valid) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);

    // Persist the customer when leaving the billing step of a create run.
    if (isCreate && activeStepKey === 'billing-address' && !resolvedCustomerId) {
      const id = await ensureCustomerCreated();
      if (!id) return;
      showToast.success('Customer saved — site details save when you finish.');
    }

    setCompletedSteps((prev) => new Set(prev).add(activeStep));

    if (isLastStep) {
      if (isEditProperty) await submitPropertyEdit();
      else await submitCreate();
      return;
    }
    setActiveStep((s) => s + 1);
  };

  const handleSaveCustomerOnly = async (): Promise<void> => {
    const valid = await form.trigger(activeConfig.fields as never);
    if (!valid) {
      setShowErrors(true);
      return;
    }
    const id = await ensureCustomerCreated();
    if (!id) return;
    showToast.success('Customer created successfully');
    router.push(buildRoute(ROUTES.CUSTOMERS.DETAIL, { id }));
  };

  const handleStepClick = (index: number): void => {
    if (index < activeStep || completedSteps.has(index - 1)) {
      setShowErrors(false);
      setActiveStep(index);
    }
  };

  const jumpToKey = (key: OnboardingStepKey): number =>
    visibleSteps.findIndex((s) => s.key === key);

  /* ── Derived copy ────────────────────────────────────────────────────── */

  const customerName = resolvedCustomer
    ? `${resolvedCustomer.firstName} ${resolvedCustomer.lastName ?? ''}`.trim()
    : '';

  const header = isEditCustomer
    ? {
        overline: 'Sales & CRM · Customer',
        title: 'Edit customer',
        blurb: customerName ? `Update the profile for ${customerName}.` : 'Update this profile.',
      }
    : isEditProperty
      ? {
          overline: 'Sales & CRM · Site',
          title: 'Edit site',
          blurb: property?.propertyName
            ? `Update ${property.propertyName} and its DISCOM connection.`
            : 'Update this site and its DISCOM connection.',
        }
      : mode === 'create-site'
        ? {
            overline: 'Sales & CRM · New site',
            // The owning customer is named by the header chip, so the blurb
            // doesn't repeat it.
            title: 'Add a site',
            blurb:
              'Capture the installation site and its DISCOM connection, then hand the visit to an engineer.',
          }
        : {
            overline: 'Sales & CRM · New onboarding',
            title: 'Onboard a customer and their site',
            blurb:
              'One run: find or create the customer, capture the installation site and its DISCOM connection, then hand the site visit to an engineer.',
          };

  const nextLabel = isLastStep
    ? isEditCustomer
      ? 'Save changes'
      : isEditProperty
        ? 'Save changes'
        : usingExistingCustomer
          ? 'Create site & assign'
          : 'Create customer, site & assign'
    : 'Next';

  const footerHint = isEdit
    ? 'Changes save when you finish'
    : activeStepKey === 'billing-address'
      ? 'Moving on saves the customer'
      : resolvedCustomerId
        ? 'Site details save when you finish'
        : 'Fields marked * are required';

  const errorMessages = React.useMemo(() => {
    if (!showErrors) return [];
    const out: string[] = [];
    const walk = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const maybe = node as { message?: unknown };
      if (typeof maybe.message === 'string') {
        out.push(maybe.message);
        return;
      }
      Object.values(node as Record<string, unknown>).forEach(walk);
    };
    walk(form.formState.errors);
    return Array.from(new Set(out));
  }, [showErrors, form.formState.errors]);

  const stepIndices = {
    customer: jumpToKey('customer-identity'),
    propertyLocation: jumpToKey('site-address'),
    utility: jumpToKey('utility'),
    changeRequests: jumpToKey('change-requests'),
    lead: jumpToKey('lead'),
    finance: jumpToKey('financing'),
    documents: jumpToKey('documents'),
  };

  /* ── Step body ───────────────────────────────────────────────────────── */

  const renderStepBody = (): React.JSX.Element | null => {
    switch (activeStepKey) {
      case 'find-customer':
        return (
          <Step0FindCustomer
            onContinueExisting={handleContinueExisting}
            onStartNew={handleStartNew}
            onBlockedChange={setBlocked}
          />
        );
      case 'customer-identity':
        return (
          <Step1CustomerIdentity
            isLocked={customerLocked && !isEditCustomer}
            onUseExistingCustomer={handleContinueExisting}
            excludeCustomerId={isEditCustomer ? customerId : undefined}
          />
        );
      case 'billing-address':
        return (
          <Step2BillingAddress
            isLocked={customerLocked && !isEditCustomer}
            showSaveNote={isCreate}
          />
        );
      case 'property-basics':
        return <PropertyBasicsFields showIsPrimary={!isEditProperty} />;
      case 'site-address':
        return (
          <Step4SiteAddress billingAddress={billingAddress} showSameAsBilling={!isEditProperty} />
        );
      case 'utility':
        return <UtilityFields />;
      case 'change-requests':
        return <ChangeRequestFields convertedChangeRequests={convertedChangeRequests} />;
      case 'lead':
        return <LeadFields isSubmitting={isSubmitting} />;
      case 'financing':
        return (
          <FinancingFields
            isEditMode={isEditProperty}
            propertyId={propertyId}
            isSubmitting={isSubmitting}
            handleDraftDocsChange={setLoanDraftDocs}
          />
        );
      case 'documents':
        return (
          <DocumentFields
            isEditMode={isEditProperty}
            propertyId={propertyId}
            initialData={property}
            isSubmitting={isSubmitting}
            handleDraftDocsChange={setPropertyDraftDocs}
          />
        );
      case 'review-assign':
        return (
          <StepReviewAssign
            isEditMode={isEditProperty}
            propertyId={propertyId}
            resolvedCustomer={resolvedCustomer}
            propertyDraftDocs={propertyDraftDocs}
            loanDraftDocs={loanDraftDocs}
            convertedChangeRequests={convertedChangeRequests}
            stepIndices={stepIndices}
            onJumpToStep={(idx) => idx >= 0 && setActiveStep(idx)}
          />
        );
      default:
        return null;
    }
  };

  const nextDisabled = isSubmitting || !!blocked;
  const showNext = activeStepKey !== 'find-customer';

  /**
   * Header chip. On a create run it confirms the customer was saved; when the
   * wizard is scoped to a site (adding one, or editing one) it answers "whose
   * site is this?" and links back to that record.
   */
  const renderChip = (): React.ReactNode => {
    if (isEditCustomer || !resolvedCustomer) return undefined;

    const customerHref = resolvedCustomerId
      ? buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: resolvedCustomerId })
      : undefined;

    if (isCreate) {
      const code = (resolvedCustomer as { customerCode?: string }).customerCode;
      const note = usingExistingCustomer ? 'existing profile' : 'saved · site pending';
      return (
        <CustomerChip name={customerName || 'Customer'} meta={code ? `${code} · ${note}` : note} />
      );
    }

    // create-site / edit-property
    return (
      <CustomerChip
        showAvatar
        href={customerHref}
        name={customerName || 'Customer'}
        meta={resolvedCustomer.phone ?? 'Customer'}
      />
    );
  };

  return (
    <Box sx={{ maxWidth: 1152, mx: 'auto', px: 2, pb: 6 }}>
      <Box sx={{ mb: 3 }}>
        <WizardHeader
          overline={header.overline}
          title={header.title}
          blurb={header.blurb}
          chip={renderChip()}
        />
      </Box>

      <MobileProgress
        activeLabel={activeConfig.label}
        stepCounter={`Step ${activeStep + 1} of ${visibleSteps.length}`}
        progressPct={Math.round(((activeStep + 1) / visibleSteps.length) * 100)}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '250px minmax(0, 1fr)' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'sticky', top: 24 }}>
          <WizardStepper
            steps={visibleSteps}
            activeStep={activeStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
          />
        </Box>

        <FormProvider {...form}>
          <Box
            component="form"
            onSubmit={(e) => e.preventDefault()}
            sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, minWidth: 0 }}
          >
            {blocked && <BlockedBanner title={blocked.title} body={blocked.body} />}
            <ErrorSummary messages={errorMessages} />

            <StepCard
              overline={activeConfig.overline}
              title={activeConfig.title}
              blurb={activeConfig.blurb}
            >
              {renderStepBody()}
            </StepCard>

            <WizardFooter hint={footerHint}>
              <Button
                type="button"
                variant="text"
                size="small"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                {activeStep === 0 ? 'Cancel' : 'Back'}
              </Button>
              {isCreate && activeStepKey === 'billing-address' && (
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  onClick={() => void handleSaveCustomerOnly()}
                  disabled={isSubmitting}
                >
                  Save customer, add a site later
                </Button>
              )}
              {showNext && (
                <Button
                  type="button"
                  variant="contained"
                  size="small"
                  onClick={() => void handleNext()}
                  disabled={nextDisabled}
                  endIcon={isLastStep ? undefined : <ArrowForwardRoundedIcon />}
                >
                  {isSubmitting ? 'Saving…' : nextLabel}
                </Button>
              )}
            </WizardFooter>
          </Box>
        </FormProvider>
      </Box>
    </Box>
  );
}
