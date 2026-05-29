'use client';

import { CustomerStatus } from '@oneohm-epc/shared/types';
import { Building2, Edit, FileText, Mail, Phone, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type JSX, useCallback, useEffect, useState } from 'react';

import {
  CUSTOMER_DETAIL_TABS,
  type CustomerDetailTab,
  QUOTE_STATUS_BADGE_VARIANT,
} from '../constants';
import {
  useAssignCustomer,
  useCustomer,
  useCustomerProperties,
  useCustomerQuotes,
  useUpdateCustomer,
} from '../hooks';
import { CustomerDocumentsTab } from './customer-documents-tab';
import { PropertyCard } from './property-card';
import { PropertySelectModal } from './property-select-modal';

import { useEmployees } from '@/components/features/employees';
import { Alert, EditableField, EmptyState } from '@/components/shared';
import {
  MUIUserAssigneeSelector,
  Badge,
  Button,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  showToast,
  WhatsAppIcon,
  SystemSizeDisplay,
} from '@/components/ui';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import {
  formatCurrency,
  formatDate,
  formatPhoneForWhatsApp,
  getErrorMessage,
  getInitials,
  recordRecentView,
} from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Types
// ============================================================================

interface CustomerDetailPageProps {
  customerId: string;
}

const DEFAULT_TAB: CustomerDetailTab = 'quotes';
const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/;

function normalizeIndianMobileInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\+91[6-9]\d{9}$/.test(trimmed)) {
    return trimmed;
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length === 10 && INDIAN_MOBILE_PATTERN.test(digitsOnly)) {
    return `+91${digitsOnly}`;
  }

  if (
    digitsOnly.length === 12 &&
    digitsOnly.startsWith('91') &&
    INDIAN_MOBILE_PATTERN.test(digitsOnly.slice(2))
  ) {
    return `+${digitsOnly}`;
  }

  return null;
}

function validateIndianMobile(value: string, optional = false): string | null {
  if (!value.trim()) {
    return optional ? null : 'Phone number is required';
  }
  return normalizeIndianMobileInput(value) ? null : 'Enter a valid Indian mobile number';
}

// ============================================================================
// Skeleton Components
// ============================================================================

function HeaderSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div>
          <Skeleton className="mb-2 h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="mx-1 h-6 w-px" />
        <Skeleton className="h-9 w-16 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </div>
  );
}

function CardSkeleton(): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="border-b border-border p-4">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-4 p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function CustomerDetailPage({ customerId }: CustomerDetailPageProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State
  const [propertySelectOpen, setPropertySelectOpen] = useState(false);

  // Get active tab and document filter from URL
  const rawTab = searchParams.get('tab') || DEFAULT_TAB;
  const activeTab: CustomerDetailTab = CUSTOMER_DETAIL_TABS.some((t) => t.value === rawTab)
    ? (rawTab as CustomerDetailTab)
    : DEFAULT_TAB;
  const propertyFilter = searchParams.get('docProperty') || 'all';

  // Data fetching
  const {
    data: customer,
    isLoading: isLoadingCustomer,
    error: customerError,
  } = useCustomer(customerId);
  const { data: properties, isLoading: isLoadingProperties } = useCustomerProperties(customerId);
  const { data: quotesData, isLoading: isLoadingQuotes } = useCustomerQuotes(customerId);
  const updateCustomerMutation = useUpdateCustomer();
  const assignCustomerMutation = useAssignCustomer();
  const {
    data: employees = [],
    isLoading: isLoadingEmployees,
    error: employeesError,
  } = useEmployees();
  const { user } = useAuth();

  useEffect(() => {
    if (customer && user?.id) {
      const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ');
      recordRecentView(user.id, {
        type: 'customer',
        id: customer.id,
        label: fullName,
        href: buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: customer.id }),
      });
    }
  }, [customer, user?.id]);

  // Tab change handler with URL persistence
  const handleTabChange = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Field save handler
  const handleFieldSave = useCallback(
    (field: string, value: string | null) => {
      updateCustomerMutation.mutate(
        { id: customerId, data: { [field]: value } },
        {
          onSuccess: () => {
            showToast.success(`${field} updated successfully`);
          },
          onError: (error) => {
            showToast.error(getErrorMessage(error));
          },
        },
      );
    },
    [customerId, updateCustomerMutation],
  );

  // Assignee change handler
  const handleAssigneeChange = useCallback(
    (userId: string | null) => {
      assignCustomerMutation.mutate(
        { id: customerId, assigneeId: userId },
        {
          onSuccess: () => {
            showToast.success(userId ? 'Customer assigned successfully' : 'Assignee removed');
          },
          onError: (error) => {
            showToast.error(getErrorMessage(error));
          },
        },
      );
    },
    [customerId, assignCustomerMutation],
  );

  // Document property filter handler
  const setPropertyFilterParam = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'all') {
        params.delete('docProperty');
      } else {
        params.set('docProperty', value);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Navigation handlers
  const handleEdit = (): void => {
    router.push(buildRoute(ROUTES.CUSTOMERS.EDIT, { id: customerId }));
  };

  const handleAddProperty = (): void => {
    if (customer?.status === CustomerStatus.INACTIVE) {
      showToast.error('Cannot perform this action: customer is inactive');
      return;
    }
    router.push(buildRoute(ROUTES.CUSTOMERS.ADD_PROPERTY, { id: customerId }));
  };

  const handleCreateQuote = (): void => {
    if (customer?.status === CustomerStatus.INACTIVE) {
      showToast.error('Cannot perform this action: customer is inactive');
      return;
    }
    if (properties && properties.length > 0) {
      setPropertySelectOpen(true);
    } else {
      // If no properties, navigate to add property first
      showToast.info('Please add a property first before creating a quote');
      handleAddProperty();
    }
  };

  // Loading state
  if (isLoadingCustomer) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-48" />
        <HeaderSkeleton />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <CardSkeleton />
          </div>
          <div className="lg:col-span-5">
            <CardSkeleton />
          </div>
          <div className="lg:col-span-4">
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (customerError || !customer) {
    return (
      <EmptyState
        iconColor="error"
        title="Customer not found"
        description="The customer you're looking for doesn't exist or has been deleted."
        action={{
          label: 'Back to Customers',
          onClick: () => router.push(ROUTES.CUSTOMERS.LIST),
        }}
      />
    );
  }

  const quotes = quotesData?.data || [];
  const customerFullName = `${customer.firstName} ${customer.lastName || ''}`.trim();
  const phoneForWhatsApp = customer.phone ? formatPhoneForWhatsApp(customer.phone) : '';
  const isInactiveCustomer = customer.status === CustomerStatus.INACTIVE;
  const inactiveTooltip = 'This customer is inactive. Reactivate to continue this action.';

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={ROUTES.CUSTOMERS.LIST}>Customers</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{customerFullName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Avatar size="xl">
            <AvatarFallback size="xl" name={customerFullName}>
              {getInitials(`${customer.firstName} ${customer.lastName ?? ''}`.trim())}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">{customerFullName}</h1>
              <Badge variant="success" size="xs">
                {customer.status}
              </Badge>
            </div>
            <p className="text-xs text-foreground-tertiary">
              Customer since {formatDate(customer.createdAt)}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Contact Buttons */}
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex size-9 items-center justify-center rounded-lg border border-border transition-colors hover:border-border-medium hover:bg-muted"
              title="Call Customer"
            >
              <Phone className="size-icon-sm text-foreground-secondary" />
            </a>
          )}
          {phoneForWhatsApp && (
            <a
              href={`https://wa.me/${phoneForWhatsApp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-9 items-center justify-center rounded-lg border border-success/30 transition-colors hover:border-success/50 hover:bg-success/10"
              title="WhatsApp"
            >
              <WhatsAppIcon className="size-icon-sm text-success" />
            </a>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="flex size-9 items-center justify-center rounded-lg border border-primary/30 transition-colors hover:border-primary/50 hover:bg-primary/10"
              title="Send Email"
            >
              <Mail className="size-icon-sm text-primary" />
            </a>
          )}

          {/* Divider */}
          <div className="mx-1 h-6 w-px bg-border" />

          {/* Action Buttons */}
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit className="size-icon-xs mr-1.5" />
            Edit
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddProperty}
                  disabled={isInactiveCustomer}
                >
                  <Building2 className="size-icon-xs mr-1.5" />
                  Add Property
                </Button>
              </span>
            </TooltipTrigger>
            {isInactiveCustomer && <TooltipContent>{inactiveTooltip}</TooltipContent>}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button size="sm" onClick={handleCreateQuote} disabled={isInactiveCustomer}>
                  <FileText className="size-icon-xs mr-1.5" />
                  Create Quote
                </Button>
              </span>
            </TooltipTrigger>
            {isInactiveCustomer && <TooltipContent>{inactiveTooltip}</TooltipContent>}
          </Tooltip>
        </div>
      </div>

      {isInactiveCustomer && (
        <Alert variant="warning" className="mb-4">
          This customer is inactive. Adding properties, creating quotes, and site activities are
          blocked until reactivated.
        </Alert>
      )}

      {/* Three Column Layout */}
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Column: Contact Information */}
        <div className="lg:col-span-3">
          <div className="rounded-lg border border-border bg-background">
            <div className="border-b border-border p-3">
              <h3 className="text-sm font-medium text-foreground">Contact Information</h3>
            </div>
            <div className="space-y-3 p-3">
              {/* Phone */}
              <EditableField
                label="Phone"
                showLabel
                value={customer.phone || ''}
                type="phone"
                validate={(v) => validateIndianMobile(v)}
                onSave={(v) => {
                  const normalized = normalizeIndianMobileInput(v);
                  if (!normalized) return;
                  handleFieldSave('phone', normalized);
                }}
                isLoading={updateCustomerMutation.isPending}
              />
              {/* Email */}
              <EditableField
                label="Email"
                showLabel
                value={customer.email || ''}
                type="email"
                placeholder="Add email"
                onSave={(v) => handleFieldSave('email', v)}
                isLoading={updateCustomerMutation.isPending}
              />
              {/* Alternate Phone */}
              <EditableField
                label="Alternate Phone"
                showLabel
                value={customer.alternatePhone || ''}
                type="phone"
                placeholder="Add alternate phone"
                validate={(v) => validateIndianMobile(v, true)}
                onSave={(v) => {
                  const normalized = normalizeIndianMobileInput(v);
                  handleFieldSave('alternatePhone', normalized);
                }}
                isLoading={updateCustomerMutation.isPending}
              />

              <div className="h-px bg-border" />

              {/* Billing Address */}
              <div>
                <label className="text-2xs font-medium uppercase tracking-wider text-foreground-secondary">
                  Billing Address
                </label>
                <EditableField
                  value={customer.address || ''}
                  placeholder="Add address"
                  onSave={(v) => handleFieldSave('address', v)}
                  isLoading={updateCustomerMutation.isPending}
                />
                {(customer.city || customer.state || customer.pincode) && (
                  <p className="mt-1 text-sm text-foreground-tertiary">
                    {[customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>

              <div className="h-px bg-border" />

              {/* Lead Source */}
              <div>
                <label className="text-2xs font-medium uppercase tracking-wider text-foreground-secondary">
                  Lead Source
                </label>
                <div className="mt-1">
                  <Badge variant="secondary" size="xs">
                    {(() => {
                      const src = customer.leadSource;
                      if (!src) return 'Not specified';
                      // If it's a known enum value, return friendly label
                      const knownLabels: Record<string, string> = {
                        referral: 'Referral',
                        walk_in: 'Walk-in',
                        social_media: 'Social Media',
                        website: 'Website',
                        exhibition: 'Exhibition',
                        cold_call: 'Cold Call',
                        advertisement: 'Advertisement',
                        reseller: 'Reseller',
                        other: 'Other',
                      };
                      return knownLabels[src] ?? src;
                    })()}
                  </Badge>
                </div>
              </div>

              {/* Customer Group */}
              {customer.groupCode && (
                <div>
                  <label className="text-2xs font-medium uppercase tracking-wider text-foreground-secondary">
                    Customer Group
                  </label>
                  <div className="mt-1">
                    <Badge variant="secondary" size="xs">
                      {customer.groupName
                        ? `${customer.groupName} (${customer.groupCode})`
                        : customer.groupCode}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Created By */}
              <div>
                <label className="text-2xs font-medium uppercase tracking-wider text-foreground-secondary">
                  Created By
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <Avatar size="xs" className="size-6">
                    <AvatarFallback size="xs" name={customer.creatorName || 'Self'}>
                      {getInitials(customer.creatorName || 'Self')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground">{customer.creatorName || 'Self'}</span>
                </div>
              </div>

              {/* Assigned To */}
              <div>
                <label className="text-2xs font-medium uppercase tracking-wider text-foreground-secondary">
                  Assigned To
                </label>
                <div className="mt-1">
                  <MUIUserAssigneeSelector
                    value={customer.assigneeId ?? null}
                    onChange={handleAssigneeChange}
                    employees={employees}
                    employeesLoading={isLoadingEmployees}
                    employeesError={
                      employeesError ? 'Failed to load employees. Please try again.' : null
                    }
                    loading={assignCustomerMutation.isPending}
                    allowUnassign
                    placeholder="Assign user"
                    triggerMinWidth={180}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Properties */}
        <div className="lg:col-span-9">
          <div className="rounded-lg border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-semibold text-foreground">
                Properties{' '}
                <span className="font-normal text-muted-foreground">
                  ({properties?.length || 0})
                </span>
              </h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <button
                      onClick={handleAddProperty}
                      className="text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-foreground-tertiary disabled:no-underline"
                      disabled={isInactiveCustomer}
                    >
                      + Add Property
                    </button>
                  </span>
                </TooltipTrigger>
                {isInactiveCustomer && <TooltipContent>{inactiveTooltip}</TooltipContent>}
              </Tooltip>
            </div>
            <div className="space-y-3 p-4">
              {isLoadingProperties ? (
                <>
                  <Skeleton className="h-28 w-full rounded-lg" />
                  <Skeleton className="h-28 w-full rounded-lg" />
                </>
              ) : properties && properties.length > 0 ? (
                properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    customerId={customerId}
                    onCreateQuote={() => {
                      router.push(
                        `${ROUTES.QUOTES.NEW}?customerId=${customerId}&propertyId=${property.id}`,
                      );
                    }}
                  />
                ))
              ) : (
                <div className="py-8 text-center">
                  <Building2 className="mx-auto mb-3 size-icon-xl text-foreground-muted" />
                  <p className="mb-1 font-medium text-foreground">No properties yet</p>
                  <p className="mb-4 text-sm text-foreground-secondary">
                    Add your first property to get started
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button size="sm" onClick={handleAddProperty} disabled={isInactiveCustomer}>
                          <Plus className="mr-1.5 size-icon-xs" />
                          Add Property
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {isInactiveCustomer && <TooltipContent>{inactiveTooltip}</TooltipContent>}
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="rounded-lg border border-border bg-background">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList
            variant="underline"
            className="overflow-x-auto overflow-y-hidden"
            aria-label="Customer detail tabs"
          >
            {CUSTOMER_DETAIL_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} variant="underline">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Quotes Tab */}
          <TabsContent value="quotes">
            <div className="p-4">
              {isLoadingQuotes ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded" />
                  ))}
                </div>
              ) : quotes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-light">
                        <th className="text-left py-2 px-3 text-2xs font-medium text-foreground-secondary uppercase">
                          Quote #
                        </th>
                        <th className="text-left py-2 px-3 text-2xs font-medium text-foreground-secondary uppercase">
                          Property
                        </th>
                        <th className="text-left py-2 px-3 text-2xs font-medium text-foreground-secondary uppercase">
                          System
                        </th>
                        <th className="text-right py-2 px-3 text-2xs font-medium text-foreground-secondary uppercase">
                          Value
                        </th>
                        <th className="text-left py-2 px-3 text-2xs font-medium text-foreground-secondary uppercase">
                          Status
                        </th>
                        <th className="text-left py-2 px-3 text-2xs font-medium text-foreground-secondary uppercase">
                          Date
                        </th>
                        <th className="text-right py-2 px-3 text-2xs font-medium text-foreground-secondary uppercase">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map((quote) => (
                        <tr
                          key={quote.id}
                          className="border-b border-border-light last:border-b-0 hover:bg-background-secondary transition-colors"
                        >
                          <td className="py-3 px-3 font-medium text-primary">
                            <Link
                              href={buildRoute(ROUTES.QUOTES.DETAIL, { id: quote.id })}
                              prefetch={false}
                              className="hover:underline"
                            >
                              {quote.quoteNumber}
                            </Link>
                          </td>
                          <td className="py-3 px-3 text-foreground-secondary">
                            {quote.propertyName || '—'}
                          </td>
                          <td className="py-3 px-3 text-foreground-secondary">
                            <SystemSizeDisplay
                              actualKw={quote.actualSystemSizeKw}
                              requestedKw={quote.systemSizeKw}
                              size="sm"
                              layout="inline"
                            />
                          </td>
                          <td className="py-3 px-3 text-right font-medium">
                            {quote.finalPrice ? formatCurrency(quote.finalPrice) : '—'}
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              variant={QUOTE_STATUS_BADGE_VARIANT[quote.status] ?? 'default'}
                              size="xs"
                            >
                              {quote.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-foreground-secondary">
                            {formatDate(quote.quoteDate)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Link
                              href={buildRoute(ROUTES.QUOTES.DETAIL, { id: quote.id })}
                              prefetch={false}
                              className="text-sm text-primary hover:underline"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={<FileText className="w-full h-full" />}
                  title="No quotes yet"
                  description={
                    isInactiveCustomer
                      ? 'Quote creation is blocked because this customer is inactive.'
                      : 'Create a quote to start the sales process.'
                  }
                  action={
                    isInactiveCustomer
                      ? undefined
                      : {
                          label: 'Create Quote',
                          onClick: handleCreateQuote,
                          icon: <FileText className="size-icon-sm" />,
                        }
                  }
                />
              )}
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <CustomerDocumentsTab
              properties={properties ?? []}
              propertyFilter={propertyFilter}
              onPropertyFilterChange={setPropertyFilterParam}
            />
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <EmptyState
              icon={<Building2 className="w-full h-full" />}
              title="No projects yet"
              description="Projects will appear here once a quote is accepted."
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Property Select Modal */}
      <PropertySelectModal
        open={propertySelectOpen}
        onClose={() => setPropertySelectOpen(false)}
        customerId={customerId}
        properties={properties || []}
      />
    </div>
  );
}
