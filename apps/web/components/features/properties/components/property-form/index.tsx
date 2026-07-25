'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { Button } from '@mui/material';
import {
  ConnectionType,
  CustomerStatus,
  DocumentEntityType,
  PropertyType,
} from '@tejas96/shared/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import {
  Step1BasicInfo,
  Step2Location,
  Step3Utility,
  StepChangeRequests,
  Step4Finance,
  Step5Financing,
  Step5Documents,
  Step6Review,
} from './steps';
import { type CustomerResponse } from '../../../customers';
import {
  useCreateProperty,
  useCustomerById,
  useUpdateProperty,
  type CustomerPropertyResponse,
} from '../../hooks';
import {
  createPropertySchema,
  editPropertySchema,
  type CreatePropertyFormData,
  type EditPropertyFormData,
} from '../../schemas/property.schema';
import { buildPropertyApiPayload } from '../../utils';
import {
  getConvertedChangeRequests,
  pendingChangeRequestsToFormItems,
} from '../../utils/change-request-display';

import { useUploadDocumentsBulk } from '@/components/features/documents/hooks';
import { Alert } from '@/components/shared';
import { type DraftDocument } from '@/components/shared/document-manager';
import { showToast } from '@/components/ui';
import { MUITypography } from '@/components/ui/mui-typography';
import { INDIAN_STATES } from '@/lib/config/constants';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { cn, getErrorMessage } from '@/lib/utils';

interface StepConfig {
  id: string;
  label: string;
  description: string;
  fields: string[];
}

const WIZARD_STEPS: StepConfig[] = [
  {
    id: 'basic-info',
    label: 'Basic Info',
    description: 'Property name & type',
    fields: ['customerId', 'propertyName', 'propertyType'],
  },
  {
    id: 'location',
    label: 'Location',
    description: 'Address & city details',
    fields: ['address', 'city', 'state', 'pincode', 'country', 'latitude', 'longitude'],
  },
  {
    id: 'utility',
    label: 'Utility Details',
    description: 'Electricity & DISCOM info',
    fields: [
      'discomId',
      'consumerName',
      'consumerNumber',
      'connectionType',
      'sanctionedLoad',
      'currentLoad',
      'meterNumber',
    ],
  },
  {
    id: 'change-requests',
    label: 'Change of Request',
    description: 'Customer change requests',
    fields: ['changeRequests'],
  },
  {
    id: 'lead-status',
    label: 'Lead Tracking',
    description: 'Temperature & notes',
    fields: ['leadTemperature', 'notes'],
  },
  {
    id: 'finance',
    label: 'Financing',
    description: 'Loan options & documents',
    fields: ['wantsLoan'],
  },
  {
    id: 'documents',
    label: 'Documents',
    description: 'Electricity bills & KYC',
    fields: [],
  },
  {
    id: 'review',
    label: 'Review & Submit',
    description: 'Verify details',
    fields: [],
  },
];

type PropertyFormMode = 'create' | 'edit';

interface PropertyFormProps {
  mode: PropertyFormMode;
  customerId?: string;
  customer?: CustomerResponse;
  propertyId?: string;
  initialData?: CustomerPropertyResponse;
}

export function PropertyForm({
  mode,
  customerId: initialCustomerId,
  customer: preloadedCustomer,
  propertyId,
  initialData,
}: PropertyFormProps): React.JSX.Element {
  const router = useRouter();
  const isEditMode = mode === 'edit';

  const createPropertyMutation = useCreateProperty();
  const updatePropertyMutation = useUpdateProperty();

  const { data: fetchedCustomer } = useCustomerById(
    !isEditMode && initialCustomerId && !preloadedCustomer ? initialCustomerId : undefined,
  );

  const customer = preloadedCustomer ?? fetchedCustomer;

  // Selected customer state (caching when navigating back/forth)
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>(
    initialCustomerId ?? '',
  );
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerResponse | undefined>(
    undefined,
  );

  const effectiveCustomerId = isEditMode
    ? (initialData?.customerId ?? '')
    : (initialCustomerId ?? selectedCustomerId);

  const resolvedCustomer = selectedCustomer ?? customer;

  const customerStateMatch = resolvedCustomer?.state
    ? INDIAN_STATES.find((s) => s.toLowerCase() === resolvedCustomer.state?.toLowerCase())
    : undefined;

  const [propertyDraftDocs, setPropertyDraftDocs] = React.useState<DraftDocument[]>([]);
  const [loanDraftDocs, setLoanDraftDocs] = React.useState<DraftDocument[]>([]);
  const uploadDocsBulk = useUploadDocumentsBulk();

  const handlePropertyDraftDocsChange = React.useCallback((docs: DraftDocument[]) => {
    setPropertyDraftDocs(docs);
  }, []);

  const handleLoanDraftDocsChange = React.useCallback((docs: DraftDocument[]) => {
    setLoanDraftDocs(docs);
  }, []);

  const schema = isEditMode ? editPropertySchema : createPropertySchema;

  const form = useForm<CreatePropertyFormData | EditPropertyFormData>({
    resolver: zodResolver(schema),
    defaultValues: isEditMode
      ? {
          propertyName: '',
          propertyType: PropertyType.RESIDENTIAL,
          address: '',
          city: '',
          state: '',
          pincode: '',
          country: '',
          latitude: undefined,
          longitude: undefined,
          consumerNumber: '',
          consumerName: '',
          discomId: '',
          connectionType: undefined,
          sanctionedLoad: undefined,
          currentLoad: '',
          meterNumber: '',
          leadTemperature: undefined,
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
          country: resolvedCustomer?.country || 'India',
          latitude: undefined,
          longitude: undefined,
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
        },
  });

  const convertedChangeRequests = React.useMemo(
    () => getConvertedChangeRequests(initialData?.changeRequests),
    [initialData?.changeRequests],
  );

  // Populate form when initialData loads (edit mode)
  React.useEffect(() => {
    if (isEditMode && initialData) {
      form.reset({
        propertyName: initialData.propertyName || '',
        propertyType: initialData.propertyType as PropertyType,
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state ?? '',
        pincode: initialData.pincode || '',
        country: initialData.country || '',
        latitude: initialData.gpsCoordinates?.latitude,
        longitude: initialData.gpsCoordinates?.longitude,
        consumerNumber: initialData.consumerNumber || '',
        consumerName: initialData.consumerName || '',
        discomId: initialData.discomId ?? '',
        connectionType: initialData.connectionType as ConnectionType | undefined,
        sanctionedLoad: initialData.sanctionedLoad ?? undefined,
        currentLoad: initialData.currentLoad || '',
        meterNumber: initialData.meterNumber || '',
        leadTemperature: initialData.leadTemperature,
        wantsLoan: initialData.wantsLoan || false,
        notes: initialData.notes || '',
        changeRequests: pendingChangeRequestsToFormItems(
          initialData.changeRequests,
        ) as EditPropertyFormData['changeRequests'],
      });
    }
  }, [isEditMode, initialData, form]);

  // Prefill consumer name from customer profile on create (do not overwrite user input)
  React.useEffect(() => {
    if (isEditMode || !resolvedCustomer) return;
    const current = form.getValues('consumerName');
    if (current?.trim()) return;
    const fullName = [resolvedCustomer.firstName, resolvedCustomer.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (fullName) {
      form.setValue('consumerName', fullName, { shouldDirty: false });
    }
  }, [isEditMode, resolvedCustomer, form]);

  // Sync customerId into form when it changes (create mode)
  React.useEffect(() => {
    if (!isEditMode && effectiveCustomerId) {
      form.setValue('customerId' as keyof CreatePropertyFormData, effectiveCustomerId);
    }
  }, [isEditMode, effectiveCustomerId, form]);

  const activeMutation = isEditMode ? updatePropertyMutation : createPropertyMutation;
  const isSubmitting = form.formState.isSubmitting || activeMutation.isPending;

  const canSave = isEditMode ? form.formState.isDirty : true;
  const isInactiveCustomer = !isEditMode && resolvedCustomer?.status === CustomerStatus.INACTIVE;

  // Wizard Navigation States
  const [activeStep, setActiveStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set());

  const handleNext = async (): Promise<void> => {
    const fieldsToValidate = WIZARD_STEPS[activeStep]?.fields || [];
    const isValid =
      fieldsToValidate.length > 0 ? await form.trigger(fieldsToValidate as any[]) : true;

    if (isValid) {
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        next.add(activeStep);
        return next;
      });
      setActiveStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    } else {
      showToast.error('Please fix validation errors before moving forward.');
    }
  };

  const handleBack = (): void => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleStepClick = (stepIndex: number): void => {
    if (stepIndex < activeStep || completedSteps.has(stepIndex - 1)) {
      setActiveStep(stepIndex);
    }
  };

  const onSubmit = async (data: CreatePropertyFormData | EditPropertyFormData): Promise<void> => {
    try {
      if (isInactiveCustomer) {
        showToast.error('Cannot perform this action: customer is inactive');
        return;
      }
      if (isEditMode && propertyId) {
        const payload = buildPropertyApiPayload(data);
        await updatePropertyMutation.mutateAsync({
          id: propertyId,
          data: {
            ...payload,
            changeRequests: payload.changeRequests ?? [],
          },
        });
        showToast.success('Property updated successfully');
        router.push(buildRoute(ROUTES.PROPERTIES.DETAIL, { id: propertyId }));
      } else {
        const createData = buildPropertyApiPayload(data as CreatePropertyFormData);
        const payload = {
          ...createData,
          changeRequests: createData.changeRequests ?? [],
        };
        const created = await createPropertyMutation.mutateAsync(payload);

        const wantsLoan = Boolean(form.getValues('wantsLoan'));
        const successPropertyDrafts = propertyDraftDocs.filter((d) => d.status === 'success');
        const successLoanDrafts = loanDraftDocs.filter((d) => d.status === 'success');
        const payloads: any[] = [];

        if (created.id) {
          if (successPropertyDrafts.length > 0) {
            payloads.push(
              ...successPropertyDrafts.map((d) => ({
                entityType: DocumentEntityType.PROPERTY,
                entityId: created.id,
                propertyId: created.id,
                category: d.category,
                tag: d.tag,
                fileName: d.fileName,
                fileUrl: d.fileUrl,
                fileSizeBytes: d.fileSizeBytes,
                mimeType: d.mimeType,
              })),
            );
          }

          if (wantsLoan && successLoanDrafts.length > 0) {
            payloads.push(
              ...successLoanDrafts.map((d) => ({
                entityType: DocumentEntityType.LOAN,
                entityId: created.id,
                propertyId: created.id,
                category: d.category,
                tag: d.tag,
                fileName: d.fileName,
                fileUrl: d.fileUrl,
                fileSizeBytes: d.fileSizeBytes,
                mimeType: d.mimeType,
              })),
            );
          }

          if (payloads.length > 0) {
            await uploadDocsBulk.mutateAsync(payloads);
          }
        }

        showToast.success('Property created successfully');
        router.push(buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: createData.customerId }));
      }
    } catch (error) {
      showToast.error(getErrorMessage(error));
    }
  };

  // Navigation Links
  const isContextAware = !isEditMode && !!initialCustomerId;
  const backLink = isEditMode
    ? buildRoute(ROUTES.PROPERTIES.DETAIL, { id: propertyId! })
    : isContextAware
      ? buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: initialCustomerId })
      : ROUTES.CUSTOMERS.LIST;

  const backLabel = isEditMode
    ? 'Back to Property'
    : isContextAware
      ? 'Back to Customer'
      : 'Back to Customers';

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

  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === WIZARD_STEPS.length - 1;

  // Active step rendering helper
  const renderStepComponent = (): React.JSX.Element | null => {
    switch (activeStep) {
      case 0:
        return (
          <Step1BasicInfo
            isEditMode={isEditMode}
            initialCustomerId={initialCustomerId}
            preloadedCustomer={customer}
            selectedCustomerId={selectedCustomerId}
            setSelectedCustomerId={setSelectedCustomerId}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
          />
        );
      case 1:
        return <Step2Location isEditMode={isEditMode} customer={resolvedCustomer} />;
      case 2:
        return <Step3Utility />;
      case 3:
        return <StepChangeRequests convertedChangeRequests={convertedChangeRequests} />;
      case 4:
        return <Step4Finance isSubmitting={isSubmitting} />;
      case 5:
        return (
          <Step5Financing
            isEditMode={isEditMode}
            propertyId={propertyId}
            isSubmitting={isSubmitting}
            handleDraftDocsChange={handleLoanDraftDocsChange}
          />
        );
      case 6:
        return (
          <Step5Documents
            isEditMode={isEditMode}
            propertyId={propertyId}
            initialData={initialData}
            isSubmitting={isSubmitting}
            handleDraftDocsChange={handlePropertyDraftDocsChange}
          />
        );
      case 7:
        return (
          <Step6Review
            isEditMode={isEditMode}
            propertyId={propertyId}
            resolvedCustomer={resolvedCustomer}
            propertyDraftDocs={propertyDraftDocs}
            loanDraftDocs={loanDraftDocs}
            convertedChangeRequests={convertedChangeRequests}
            onJumpToStep={handleStepClick}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 px-4">
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link
          href={backLink}
          className="inline-flex items-center gap-1.5 mb-3 no-underline text-foreground-secondary hover:text-primary transition-colors"
        >
          <span>← {backLabel}</span>
        </Link>
        <MUITypography variant="drawerTitle">{pageTitle}</MUITypography>
        <MUITypography variant="body" className="mt-1 text-foreground-secondary block">
          {pageSubtitle}
        </MUITypography>
      </div>

      {isInactiveCustomer && (
        <Alert variant="warning" className="mb-6">
          This customer is inactive. Property creation is blocked until the customer is reactivated.
        </Alert>
      )}

      {/* ── Mobile Progress Stepper Header ─────────────────────────────── */}
      <div className="md:hidden mb-6 p-4 rounded-lg bg-background-secondary">
        <div className="flex justify-between items-center mb-2">
          <MUITypography variant="bodyPrimary" className="font-semibold text-sm">
            Step {activeStep + 1} of {WIZARD_STEPS.length}
          </MUITypography>
          <MUITypography variant="timestamp" className="text-foreground-secondary">
            {WIZARD_STEPS[activeStep]?.label || ''}
          </MUITypography>
        </div>
        <div className="w-full bg-border-light h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${((activeStep + 1) / WIZARD_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Two-Column Layout ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sticky Sidebar Stepper (Desktop only) */}
        <div className="hidden md:block md:col-span-4 sticky top-6">
          <div className="flex flex-col gap-3">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = activeStep === index;
              const isCompleted = completedSteps.has(index) || activeStep > index;
              const isClickable = index < activeStep || completedSteps.has(index - 1);

              return (
                <div
                  key={step.id}
                  onClick={() => isClickable && handleStepClick(index)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
                    isActive
                      ? 'bg-primary/5 border-primary/20 text-foreground'
                      : isClickable
                        ? 'bg-background border-border-light hover:border-primary/40 cursor-pointer'
                        : 'bg-background-secondary/30 border-border-light/50 text-foreground-tertiary select-none',
                  )}
                >
                  <div className="flex items-center justify-center size-8 shrink-0">
                    {isCompleted ? (
                      <CheckCircleRoundedIcon className="text-success size-7" />
                    ) : (
                      <div
                        className={cn(
                          'flex items-center justify-center size-7 rounded-full text-xs font-semibold border-2',
                          isActive
                            ? 'border-primary bg-primary text-white'
                            : 'border-border-medium text-foreground-secondary',
                        )}
                      >
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <MUITypography
                      variant="bodyPrimary"
                      className={cn(
                        'font-medium block text-sm',
                        isActive ? 'text-primary' : 'text-foreground',
                      )}
                    >
                      {step.label}
                    </MUITypography>
                    <MUITypography variant="timestamp" className="text-foreground-secondary block">
                      {step.description}
                    </MUITypography>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Card Panel */}
        <div className="col-span-1 md:col-span-8">
          <FormProvider {...form}>
            <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-6">
              {/* Render step components with animation wrapper */}
              <div className="transition-opacity duration-300 ease-in-out">
                {renderStepComponent()}
              </div>

              {/* Sticky Footer for Navigation */}
              <div className="sticky bottom-0 z-10">
                <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-background-tertiary to-transparent pointer-events-none" />
                <div className="bg-background py-4 px-4 rounded-lg shadow-card">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 ml-auto">
                      {isFirstStep ? (
                        <Button
                          key="cancel-btn"
                          type="button"
                          variant="outlined"
                          size="small"
                          onClick={() => router.push(backLink)}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          key="back-btn"
                          type="button"
                          variant="outlined"
                          size="small"
                          onClick={handleBack}
                          disabled={isSubmitting}
                        >
                          Back
                        </Button>
                      )}

                      {!isLastStep ? (
                        <Button
                          key="next-btn"
                          type="button"
                          variant="contained"
                          size="small"
                          onClick={() => void handleNext()}
                          disabled={isSubmitting || isInactiveCustomer}
                        >
                          Next
                        </Button>
                      ) : (
                        <Button
                          key="submit-btn"
                          type="submit"
                          variant="contained"
                          size="small"
                          disabled={
                            isSubmitting ||
                            isInactiveCustomer ||
                            (isEditMode ? !canSave : !effectiveCustomerId)
                          }
                        >
                          {isSubmitting
                            ? isEditMode
                              ? 'Saving…'
                              : 'Creating…'
                            : isEditMode
                              ? 'Save Changes'
                              : 'Create Property'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </FormProvider>
        </div>
      </div>
    </div>
  );
}
