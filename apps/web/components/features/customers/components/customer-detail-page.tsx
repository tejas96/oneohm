'use client';

import { QuoteStatus } from '@oneohm-epc/shared-types';
import { Building2, Edit, FileText, Mail, Phone, Plus, Upload } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { type JSX, useCallback, useMemo, useState } from 'react';

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
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { cn, formatPhoneForWhatsApp } from '@/lib/utils';

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
  title: React.ReactNode;
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
                'absolute -left-6 top-1 size-4 rounded-full border-2',
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
              <p className="mt-1 text-xs text-muted-foreground">{item.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const getInitials = (firstName?: string, lastName?: string): string => {
  const first = firstName?.charAt(0) || '';
  const last = lastName?.charAt(0) || '';
  return `${first}${last}`.toUpperCase() || 'NA';
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

const QUOTE_STATUS_STYLES: Record<QuoteStatus, { bg: string; text: string; label: string }> = {
  [QuoteStatus.DRAFT]: { bg: 'bg-muted', text: 'text-foreground-secondary', label: 'Draft' },
  [QuoteStatus.SENT]: { bg: 'bg-warning/10', text: 'text-warning', label: 'Sent' },
  [QuoteStatus.VIEWED]: { bg: 'bg-primary/10', text: 'text-primary', label: 'Viewed' },
  [QuoteStatus.ACCEPTED]: { bg: 'bg-success/10', text: 'text-success', label: 'Accepted' },
  [QuoteStatus.REJECTED]: { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Rejected' },
  [QuoteStatus.EXPIRED]: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Expired' },
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
  const activeTab = searchParams.get('tab') || 'quotes';
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
              <span className="rounded bg-success/10 px-1.5 py-0.5 text-[11px] font-medium text-success">
                {customer.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
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
              <Phone className="size-4 text-foreground-secondary" />
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
              <WhatsAppIcon className="size-4 text-success" />
            </a>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="flex size-9 items-center justify-center rounded-lg border border-primary/30 transition-colors hover:border-primary/50 hover:bg-primary/10"
              title="Send Email"
            >
              <Mail className="size-4 text-primary" />
            </a>
          )}

          {/* Divider */}
          <div className="mx-1 h-6 w-px bg-border" />

          {/* Action Buttons - Compact styling matching UX */}
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[13px] font-medium hover:bg-muted"
          >
            <Edit className="size-3.5" />
            Edit
          </button>
          <button
            onClick={handleAddProperty}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[13px] font-medium hover:bg-muted"
          >
            <Building2 className="size-3.5" />
            Add Property
          </button>
          <button
            onClick={handleCreateQuote}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-white hover:bg-primary-dark"
          >
            <FileText className="size-3.5" />
            Create Quote
          </button>
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
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Billing Address
                </label>
                <EditableField
                  value={customer.address || ''}
                  placeholder="Add address"
                  onSave={(v) => handleFieldSave('address', v)}
                  isLoading={updateCustomerMutation.isPending}
                />
                {(customer.city || customer.state || customer.pincode) && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>

              <div className="h-px bg-border" />

              {/* Lead Source */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Lead Source
                </label>
                <div className="mt-1">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground-secondary">
                    {customer.leadSource || 'Not specified'}
                  </span>
                </div>
              </div>

              {/* Created By */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
                  <Building2 className="mx-auto mb-3 size-12 text-muted-foreground" />
                  <p className="mb-1 font-medium text-foreground">No properties yet</p>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Add your first property to get started
                  </p>
                  <Button size="sm" onClick={handleAddProperty}>
                    <Plus className="mr-1.5 size-3.5" />
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
              <h3 className="font-semibold text-foreground">Recent Activity</h3>
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
        {/* Tab Buttons */}
        <div className="flex overflow-x-auto border-b border-border">
          {(['quotes', 'documents', 'projects', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={cn(
                'px-3.5 py-2.5 text-[13px] font-medium border-b-2 transition-all',
                activeTab === tab
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground',
              )}
            >
              {tab === 'quotes' && 'Quotes'}
              {tab === 'documents' && 'Documents'}
              {tab === 'projects' && 'Projects'}
              {tab === 'activity' && 'All Activity'}
            </button>
          ))}
        </div>

        {/* Quotes Tab */}
        {activeTab === 'quotes' && (
          <div className="p-4">
            {isLoadingQuotes ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : quotes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Quote #
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Property
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        System
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Value
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Date
                      </th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {quotes.map((quote) => {
                      const statusStyle = QUOTE_STATUS_STYLES[quote.status];
                      return (
                        <tr key={quote.id} className="hover:bg-muted">
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <Link
                              href={buildRoute(ROUTES.QUOTES.DETAIL, { id: quote.id })}
                              className="font-medium text-primary hover:underline"
                            >
                              {quote.quoteNumber}
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-sm">
                            {quote.propertyName || '—'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-sm">
                            {quote.systemSizeKw} kW
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-sm font-medium text-foreground">
                            {quote.finalPrice
                              ? `₹${quote.finalPrice.toLocaleString('en-IN')}`
                              : '—'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[11px] font-medium',
                                statusStyle.bg,
                                statusStyle.text,
                              )}
                            >
                              {statusStyle.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground">
                            {formatDate(quote.quoteDate)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right">
                            <Link
                              href={buildRoute(ROUTES.QUOTES.DETAIL, { id: quote.id })}
                              className="text-sm text-primary hover:underline"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <FileText className="mx-auto mb-3 size-12 text-muted-foreground" />
                <p className="mb-1 font-medium text-foreground">No quotes yet</p>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create a quote to start the sales process
                </p>
                <Button size="sm" onClick={handleCreateQuote}>
                  <Plus className="mr-1.5 size-3.5" />
                  Create Quote
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
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
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                disabled={!properties || properties.length === 0}
              >
                <Upload className="mr-1.5 size-icon-xs" />
                Upload Document
              </Button>
            </div>

            {/* Documents List */}
            {filteredDocuments.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="mx-auto mb-3 size-icon-xl text-foreground-muted" />
                <p className="mb-1 font-medium text-foreground">No documents yet</p>
                <p className="mb-4 text-sm text-foreground-secondary">
                  {properties && properties.length > 0
                    ? 'Upload documents for your properties'
                    : 'Add a property first to upload documents'}
                </p>
                {properties && properties.length > 0 && (
                  <Button size="sm" onClick={() => setIsUploadModalOpen(true)}>
                    <Upload className="mr-1.5 size-icon-xs" />
                    Upload Document
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDocuments.map((doc, idx) => (
                  <DocumentRow
                    key={`${doc.propertyId}-${doc.url}-${idx}`}
                    document={doc}
                    onPreview={openPreview}
                    onDownload={(doc) => {
                      void downloadToSystem(doc);
                    }}
                    onDelete={handleDeleteDocument}
                    isDeleting={removeMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="p-8">
            <div className="text-center">
              <Building2 className="mx-auto mb-3 size-icon-xl text-foreground-muted" />
              <h3 className="mb-1 font-medium text-foreground">No projects yet</h3>
              <p className="text-sm text-foreground-secondary">
                Projects will appear here once a quote is accepted
              </p>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
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
        )}
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
