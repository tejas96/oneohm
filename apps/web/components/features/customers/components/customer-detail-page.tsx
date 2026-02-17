'use client';

import { QuoteStatus } from '@oneohm-epc/shared-types';
import {
  Building2,
  Download,
  Edit,
  FileText,
  Mail,
  Phone,
  Plus,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { type JSX, useCallback, useState } from 'react';

import {
  useCustomer,
  useCustomerProperties,
  useCustomerQuotes,
  useUpdateCustomer,
} from '../hooks';
import { PropertyCard } from './property-card';
import { PropertySelectModal } from './property-select-modal';

import { EditableField, EmptyState } from '@/components/shared';
import {
  Button,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
  Skeleton,
  showToast,
  WhatsAppIcon,
} from '@/components/ui';
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

// Mock documents (Phase 2 - will be fetched from properties documents field)
const mockDocuments = [
  {
    id: '1',
    fileName: 'Electricity_Bill_Jan.pdf',
    size: '245 KB',
    uploadedAt: 'Jan 18, 2026',
    type: 'pdf',
  },
  {
    id: '2',
    fileName: 'Site_Photos.zip',
    size: '12.4 MB',
    uploadedAt: 'Jan 20, 2026',
    type: 'zip',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

// Get dot variant for timeline based on activity type
const getActivityDotVariant = (type: 'quote' | 'visit' | 'property' | 'update' | 'created'): 'primary' | 'secondary' | 'default' => {
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
      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gray-200" />
      
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
                    : 'border-gray-200 bg-white'
              )}
            />
            {/* Content */}
            <div>
              <p className="text-sm text-gray-900">{item.title}</p>
              <p className="mt-1 text-xs text-gray-500">{item.timestamp}</p>
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
  [QuoteStatus.DRAFT]: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  [QuoteStatus.SENT]: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Sent' },
  [QuoteStatus.VIEWED]: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Viewed' },
  [QuoteStatus.ACCEPTED]: { bg: 'bg-green-100', text: 'text-green-700', label: 'Accepted' },
  [QuoteStatus.REJECTED]: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  [QuoteStatus.EXPIRED]: { bg: 'bg-gray-200', text: 'text-gray-600', label: 'Expired' },
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
    <div className="rounded-lg border border-gray-100 bg-white">
      <div className="border-b border-gray-100 p-4">
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

  // Get active tab from URL (default to 'quotes')
  const activeTab = searchParams.get('tab') || 'quotes';

  // Data fetching
  const { data: customer, isLoading: isLoadingCustomer, error: customerError } = useCustomer(customerId);
  const { data: properties, isLoading: isLoadingProperties } = useCustomerProperties(customerId);
  const { data: quotesData, isLoading: isLoadingQuotes } = useCustomerQuotes(customerId);
  const updateCustomerMutation = useUpdateCustomer();

  // Tab change handler with URL persistence
  const handleTabChange = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
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
        }
      );
    },
    [customerId, updateCustomerMutation]
  );

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
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-2xl font-semibold text-primary">
            {getInitials(customer.firstName, customer.lastName)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">{customerFullName}</h1>
              <span className="rounded bg-green-50 px-1.5 py-0.5 text-[11px] font-medium text-green-700">
                {customer.status}
              </span>
            </div>
            <p className="text-xs text-gray-400">
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
              className="flex size-9 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:border-gray-300 hover:bg-gray-50"
              title="Call Customer"
            >
              <Phone className="size-4 text-gray-600" />
            </a>
          )}
          {phoneForWhatsApp && (
            <a
              href={`https://wa.me/${phoneForWhatsApp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-9 items-center justify-center rounded-lg border border-green-200 transition-colors hover:border-green-300 hover:bg-green-50"
              title="WhatsApp"
            >
              <WhatsAppIcon className="size-4 text-green-600" />
            </a>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="flex size-9 items-center justify-center rounded-lg border border-blue-200 transition-colors hover:border-blue-300 hover:bg-blue-50"
              title="Send Email"
            >
              <Mail className="size-4 text-blue-600" />
            </a>
          )}

          {/* Divider */}
          <div className="mx-1 h-6 w-px bg-gray-200" />

          {/* Action Buttons - Compact styling matching UX */}
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 rounded-md border border-gray-100 px-3 py-1.5 text-[13px] font-medium hover:bg-gray-50"
          >
            <Edit className="size-3.5" />
            Edit
          </button>
          <button
            onClick={handleAddProperty}
            className="flex items-center gap-1.5 rounded-md border border-gray-100 px-3 py-1.5 text-[13px] font-medium hover:bg-gray-50"
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
          <div className="rounded-lg border border-gray-100 bg-white">
            <div className="border-b border-gray-100 p-3">
              <h3 className="text-sm font-medium text-gray-900">Contact Information</h3>
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

              <div className="h-px bg-gray-100" />

              {/* Billing Address */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Billing Address
                </label>
                <EditableField
                  value={customer.address || ''}
                  placeholder="Add address"
                  onSave={(v) => handleFieldSave('address', v)}
                  isLoading={updateCustomerMutation.isPending}
                />
                {(customer.city || customer.state || customer.pincode) && (
                  <p className="mt-1 text-sm text-gray-500">
                    {[customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>

              <div className="h-px bg-gray-100" />

              {/* Lead Source */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Lead Source
                </label>
                <div className="mt-1">
                  <span className="rounded bg-pink-50 px-1.5 py-0.5 text-[11px] font-medium text-pink-700">
                    {customer.leadSource || 'Not specified'}
                  </span>
                </div>
              </div>

              {/* Created By */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created By
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-full bg-secondary/15 text-xs font-semibold text-secondary">
                    {getInitials(customer.creatorName?.split(' ')[0], customer.creatorName?.split(' ')[1])}
                  </div>
                  <span className="text-sm text-gray-900">{customer.creatorName || 'Self'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Properties */}
        <div className="lg:col-span-5">
          <div className="rounded-lg border border-gray-100 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900">
                Properties <span className="font-normal text-gray-400">({properties?.length || 0})</span>
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
                      router.push(`${ROUTES.QUOTES.NEW}?customerId=${customerId}&propertyId=${property.id}`);
                    }}
                  />
                ))
              ) : (
                <div className="py-8 text-center">
                  <Building2 className="mx-auto mb-3 size-12 text-gray-400" />
                  <p className="mb-1 font-medium text-gray-900">No properties yet</p>
                  <p className="mb-4 text-sm text-gray-500">
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
          <div className="rounded-lg border border-gray-100 bg-white">
            <div className="border-b border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-4">
              <SimpleTimeline
                items={mockActivityData.map((a) => ({
                  id: a.id,
                  title: (
                    <span>
                      {a.description}
                    </span>
                  ),
                  timestamp: formatActivityTimestamp(a.timestamp),
                  dotVariant: getActivityDotVariant(a.type),
                }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="rounded-lg border border-gray-100 bg-white">
        {/* Tab Buttons */}
        <div className="flex overflow-x-auto border-b border-gray-100">
          {(['quotes', 'documents', 'projects', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={cn(
                'px-3.5 py-2.5 text-[13px] font-medium border-b-2 transition-all',
                activeTab === tab
                  ? 'text-primary border-primary'
                  : 'text-zinc-500 border-transparent hover:text-gray-900'
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
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Quote #
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Property
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        System
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Value
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Date
                      </th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {quotes.map((quote) => {
                      const statusStyle = QUOTE_STATUS_STYLES[quote.status];
                      return (
                        <tr key={quote.id} className="hover:bg-gray-50">
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
                          <td className="whitespace-nowrap px-3 py-2.5 text-sm font-medium text-gray-900">
                            {quote.finalPrice
                              ? `₹${quote.finalPrice.toLocaleString('en-IN')}`
                              : '—'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[11px] font-medium',
                                statusStyle.bg,
                                statusStyle.text
                              )}
                            >
                              {statusStyle.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-sm text-gray-500">
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
                <FileText className="mx-auto mb-3 size-12 text-gray-400" />
                <p className="mb-1 font-medium text-gray-900">No quotes yet</p>
                <p className="mb-4 text-sm text-gray-500">
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
            {/* Upload Area */}
            <div className="mb-4 rounded-lg border-2 border-dashed border-gray-100 p-8 text-center">
              <Upload className="mx-auto mb-3 size-12 text-gray-400" />
              <p className="mb-2 text-gray-500">
                Drag and drop files here, or click to browse
              </p>
              <button className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white">
                Upload Document
              </button>
            </div>

            {/* Document List */}
            {mockDocuments.length > 0 ? (
              <div className="space-y-2">
                {mockDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex size-8 items-center justify-center rounded',
                          doc.type === 'pdf' ? 'text-red-500' : 'text-blue-500'
                        )}
                      >
                        <svg className="size-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9v6h2v-6h3l-4-4-4 4h3z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {doc.size} • Uploaded {doc.uploadedAt}
                        </p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-500">
                      <Download className="size-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="p-8">
            <div className="text-center">
              <svg className="mx-auto mb-3 size-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
              <h3 className="mb-1 font-medium text-gray-900">No projects yet</h3>
              <p className="text-sm text-gray-500">
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
                title: (
                  <span>
                    {a.description}
                  </span>
                ),
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
    </div>
  );
}
