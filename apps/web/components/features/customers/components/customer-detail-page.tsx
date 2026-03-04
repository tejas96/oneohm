'use client';

import { Building2, Edit, FileText, Mail, Phone, Plus, Upload } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type JSX, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import {
  CUSTOMER_DETAIL_TABS,
  type CustomerDetailTab,
  QUOTE_STATUS_BADGE_VARIANT,
} from '../constants';
import {
  useCustomer,
  useCustomerProperties,
  useCustomerQuotes,
  useDocumentPreview,
  useRemovePropertyDocument,
  useUpdateCustomer,
} from '../hooks';
import { DocumentPreviewModal } from './document-preview-modal';
import { DocumentRow, type AggregatedDocument } from './document-row';
import { PropertyCard } from './property-card';
import { PropertySelectModal } from './property-select-modal';
import { UploadDocumentModal } from './upload-document-modal';

import { EditableField, EmptyState } from '@/components/shared';
import {
  Badge,
  Button,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
  ConfirmDialog,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  showToast,
  WhatsAppIcon,
} from '@/components/ui';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import {
  cn,
  formatCurrency,
  formatDate,
  formatPhoneForWhatsApp,
  recordRecentView,
} from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

// ============================================================================
// Types
// ============================================================================

interface CustomerDetailPageProps {
  customerId: string;
}

// ============================================================================
// Mock Activity Data (Phase 2 - will be replaced with API)
// ============================================================================

const mockActivityData = [
  {
    id: '1',
    type: 'quote' as const,
    title: 'Quote sent',
    description: 'Quote #QT-2026-0042 sent to customer',
    timestamp: new Date('2026-01-28T10:30:00Z'),
  },
  {
    id: '2',
    type: 'visit' as const,
    title: 'Site visit completed',
    description: 'Technical assessment at Koramangala Residence',
    timestamp: new Date('2026-01-27T14:30:00Z'),
  },
  {
    id: '3',
    type: 'property' as const,
    title: 'Property added',
    description: 'HSR Layout Office property added',
    timestamp: new Date('2026-01-20T11:00:00Z'),
  },
  {
    id: '4',
    type: 'update' as const,
    title: 'Lead temperature changed',
    description: 'Temperature changed to Hot',
    timestamp: new Date('2026-01-18T09:00:00Z'),
  },
  {
    id: '5',
    type: 'created' as const,
    title: 'Customer created',
    description: 'Customer profile created by Arun Kumar',
    timestamp: new Date('2026-01-15T10:00:00Z'),
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

// Get dot variant for timeline based on activity type
const getActivityDotVariant = (
  type: 'quote' | 'visit' | 'property' | 'update' | 'created',
): 'primary' | 'secondary' | 'default' => {
  switch (type) {
    case 'quote':
      return 'primary';
    case 'visit':
      return 'secondary';
    case 'property':
    case 'update':
    case 'created':
      return 'default';
  }
};

// ============================================================================
// Simple Timeline Component (matches UX design exactly)
// ============================================================================

interface SimpleTimelineItem {
  id: string;
  title: ReactNode;
  timestamp: string;
  dotVariant?: 'primary' | 'secondary' | 'default';
}

interface SimpleTimelineProps {
  items: SimpleTimelineItem[];
}

function SimpleTimeline({ items }: SimpleTimelineProps): JSX.Element {
  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />

      {/* Items */}
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="relative">
            {/* Dot */}
            <div
              className={cn(
                'absolute -left-6 top-1 size-icon-sm rounded-full border-2',
                item.dotVariant === 'primary'
                  ? 'border-primary bg-primary'
                  : item.dotVariant === 'secondary'
                    ? 'border-secondary bg-secondary'
                    : 'border-border bg-background',
              )}
            />
            {/* Content */}
            <div>
              <p className="text-sm text-foreground">{item.title}</p>
              <p className="mt-1 text-xs text-foreground-tertiary">{item.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DEFAULT_TAB: CustomerDetailTab = 'quotes';

const getInitials = (firstName?: string, lastName?: string): string => {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  return `${first}${last}`.toUpperCase() || 'NA';
};

const formatActivityTimestamp = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
};

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
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<AggregatedDocument | null>(null);

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

  // Document mutations & preview
  const removeMutation = useRemovePropertyDocument();
  const { previewDocument, isPreviewOpen, openPreview, closePreview, downloadToSystem } =
    useDocumentPreview();

  // Aggregate documents from all properties
  const allDocuments = useMemo((): AggregatedDocument[] => {
    if (!properties) return [];
    return properties.flatMap((property) =>
      (property.documents || []).map((doc) => ({
        ...doc,
        propertyId: property.id,
        propertyName: property.propertyName || property.address || 'Unnamed Property',
      })),
    );
  }, [properties]);

  // Filter documents by selected property
  const filteredDocuments = useMemo(() => {
    if (propertyFilter === 'all') return allDocuments;
    return allDocuments.filter((doc) => doc.propertyId === propertyFilter);
  }, [allDocuments, propertyFilter]);

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
    (field: string, value: string) => {
      updateCustomerMutation.mutate(
        { id: customerId, data: { [field]: value } },
        {
          onSuccess: () => {
            showToast.success(`${field} updated successfully`);
          },
          onError: () => {
            showToast.error(`Failed to update ${field}`);
          },
        },
      );
    },
    [customerId, updateCustomerMutation],
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

  // Document action handlers
  const handleDeleteDocument = useCallback((doc: AggregatedDocument) => {
    setDocToDelete(doc);
  }, []);

  const confirmDeleteDocument = useCallback(async () => {
    if (!docToDelete) return;
    try {
      await removeMutation.mutateAsync({
        propertyId: docToDelete.propertyId,
        documentUrl: docToDelete.url,
      });
      showToast.success('Document deleted');
    } catch {
      showToast.error('Failed to delete document');
    } finally {
      setDocToDelete(null);
    }
  }, [docToDelete, removeMutation]);

  // Navigation handlers
  const handleEdit = (): void => {
    router.push(buildRoute(ROUTES.CUSTOMERS.EDIT, { id: customerId }));
  };

  const handleAddProperty = (): void => {
    router.push(buildRoute(ROUTES.CUSTOMERS.ADD_PROPERTY, { id: customerId }));
  };

  const handleCreateQuote = (): void => {
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
              {getInitials(customer.firstName, customer.lastName)}
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
          <Button variant="outline" size="sm" onClick={handleAddProperty}>
            <Building2 className="size-icon-xs mr-1.5" />
            Add Property
          </Button>
          <Button size="sm" onClick={handleCreateQuote}>
            <FileText className="size-icon-xs mr-1.5" />
            Create Quote
          </Button>
        </div>
      </div>

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
                onSave={(v) => handleFieldSave('phone', v)}
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
                onSave={(v) => handleFieldSave('alternatePhone', v)}
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
                    {customer.leadSource || 'Not specified'}
                  </Badge>
                </div>
              </div>

              {/* Created By */}
              <div>
                <label className="text-2xs font-medium uppercase tracking-wider text-foreground-secondary">
                  Created By
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <Avatar size="xs" className="size-6">
                    <AvatarFallback size="xs" name={customer.creatorName || 'Self'}>
                      {getInitials(
                        customer.creatorName?.split(' ')[0],
                        customer.creatorName?.split(' ')[1],
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground">{customer.creatorName || 'Self'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Properties */}
        <div className="lg:col-span-5">
          <div className="rounded-lg border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-semibold text-foreground">
                Properties{' '}
                <span className="font-normal text-muted-foreground">
                  ({properties?.length || 0})
                </span>
              </h3>
              <button
                onClick={handleAddProperty}
                className="text-sm font-medium text-primary hover:underline"
              >
                + Add Property
              </button>
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
                  <Button size="sm" onClick={handleAddProperty}>
                    <Plus className="mr-1.5 size-icon-xs" />
                    Add Property
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="lg:col-span-4">
          <div className="rounded-lg border border-border bg-background">
            <div className="border-b border-border p-4">
              <h3 className="text-sm font-medium text-foreground">Recent Activity</h3>
            </div>
            <div className="p-4">
              <SimpleTimeline
                items={mockActivityData.map((a) => ({
                  id: a.id,
                  title: <span>{a.description}</span>,
                  timestamp: formatActivityTimestamp(a.timestamp),
                  dotVariant: getActivityDotVariant(a.type),
                }))}
              />
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
                              className="hover:underline"
                            >
                              {quote.quoteNumber}
                            </Link>
                          </td>
                          <td className="py-3 px-3 text-foreground-secondary">
                            {quote.propertyName || '—'}
                          </td>
                          <td className="py-3 px-3 text-foreground-secondary">
                            {quote.systemSizeKw} kW
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
                  description="Create a quote to start the sales process."
                  action={{
                    label: 'Create Quote',
                    onClick: handleCreateQuote,
                    icon: <FileText className="size-icon-sm" />,
                  }}
                />
              )}
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <div className="p-4">
              {/* Documents Tab Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Select value={propertyFilter} onValueChange={setPropertyFilterParam}>
                    <SelectTrigger className="h-input-sm w-48">
                      <SelectValue placeholder="All Properties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Properties</SelectItem>
                      {properties?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.propertyName || p.address || 'Unnamed'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(true)}
                  disabled={!properties || properties.length === 0}
                >
                  <Upload className="mr-2 size-icon-sm" />
                  Upload
                </Button>
              </div>

              {/* Documents List */}
              {filteredDocuments.length === 0 ? (
                <EmptyState
                  icon={<FileText className="w-full h-full" />}
                  title="No documents yet"
                  description={
                    properties && properties.length > 0
                      ? 'Upload documents for your properties.'
                      : 'Add a property first to upload documents.'
                  }
                  action={
                    properties && properties.length > 0
                      ? {
                          label: 'Upload Document',
                          onClick: () => setIsUploadModalOpen(true),
                          icon: <Upload className="size-icon-sm" />,
                        }
                      : undefined
                  }
                />
              ) : (
                <div className="space-y-2">
                  {filteredDocuments.map((doc, idx) => (
                    <DocumentRow
                      key={`${doc.propertyId}-${doc.url}-${idx}`}
                      document={doc}
                      onPreview={openPreview}
                      onDownload={(d) => {
                        void downloadToSystem(d);
                      }}
                      onDelete={handleDeleteDocument}
                      isDeleting={removeMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <EmptyState
              icon={<Building2 className="w-full h-full" />}
              title="No projects yet"
              description="Projects will appear here once a quote is accepted."
            />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <div className="p-4">
              <SimpleTimeline
                items={mockActivityData.map((a) => ({
                  id: a.id,
                  title: <span>{a.description}</span>,
                  timestamp: `${a.timestamp.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} at ${a.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`,
                  dotVariant: getActivityDotVariant(a.type),
                }))}
              />
            </div>
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

      {/* Upload Document Modal */}
      <UploadDocumentModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        properties={properties || []}
      />

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDocument}
        open={isPreviewOpen}
        onOpenChange={closePreview}
        onDownload={(doc) => {
          void downloadToSystem(doc);
        }}
      />

      {/* Delete Document Confirmation */}
      <ConfirmDialog
        open={!!docToDelete}
        onOpenChange={(open) => !open && setDocToDelete(null)}
        title="Delete Document"
        description={`Are you sure you want to delete "${docToDelete?.fileName}"? This action cannot be undone.`}
        iconVariant="error"
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={confirmDeleteDocument}
      />
    </div>
  );
}
