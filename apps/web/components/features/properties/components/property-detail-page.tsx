'use client';

import { LeadTemperature, PropertyType, QuoteStatus } from '@oneohm-epc/shared-types';
import {
  AlertCircle,
  Calendar,
  Edit,
  FileText,
  FolderOpen,
  Loader2,
  MapPin,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type JSX, useCallback, useMemo } from 'react';

import { useProperty, useUpdateProperty } from '../hooks';
import { FollowupMiniList } from './followup-mini-list';
import { PropertyActivityTab } from './property-activity-tab';
import { PropertyFollowupsTab } from './property-followups-tab';
import { usePropertyQuotes } from '../hooks/use-property-quotes';

import { useFollowups, useMarkFollowupComplete } from '@/components/features/followups/hooks';
import { EditableField } from '@/components/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
  showToast,
} from '@/components/ui';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { cn, getErrorMessage } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface PropertyDetailPageProps {
  propertyId: string;
}

type TabKey = 'sitevisit' | 'quotes' | 'followups' | 'notes' | 'activity';

const VALID_TABS: TabKey[] = ['sitevisit', 'quotes', 'followups', 'notes', 'activity'];
const DEFAULT_TAB: TabKey = 'sitevisit';

// ============================================================================
// Badge Mappings
// ============================================================================

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  [PropertyType.RESIDENTIAL]: 'Residential',
  [PropertyType.RESIDENTIAL_APARTMENT]: 'Apartment',
  [PropertyType.COMMERCIAL]: 'Commercial',
  [PropertyType.INDUSTRIAL]: 'Industrial',
  [PropertyType.AGRICULTURAL]: 'Agricultural',
  [PropertyType.INSTITUTIONAL]: 'Institutional',
};

// ============================================================================
// Tab Labels
// ============================================================================

const TAB_LABELS: Record<TabKey, string> = {
  sitevisit: 'Site Visit',
  quotes: 'Quotes',
  followups: 'Followups',
  notes: 'Notes',
  activity: 'Activity',
};

// ============================================================================
// Component
// ============================================================================

export function PropertyDetailPage({ propertyId }: PropertyDetailPageProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL-synced tab
  const rawTab = searchParams.get('tab') || DEFAULT_TAB;
  const activeTab: TabKey = VALID_TABS.includes(rawTab as TabKey)
    ? (rawTab as TabKey)
    : DEFAULT_TAB;

  // Data fetching
  const { data: property, isLoading, isError, error, refetch } = useProperty(propertyId);
  const updateProperty = useUpdateProperty();

  const { data: followupsData, isLoading: isLoadingFollowups } = useFollowups({
    propertyId,
    limit: 100,
  });

  const { data: quotesData, isLoading: isLoadingQuotes } = usePropertyQuotes(propertyId);

  const markFollowupComplete = useMarkFollowupComplete();

  const followups = useMemo(() => followupsData?.data ?? [], [followupsData]);

  // Tab change handler with URL persistence
  const handleTabChange = useCallback(
    (tab: TabKey) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleTemperatureChange = useCallback(
    (temp: LeadTemperature): void => {
      if (!property) return;
      if (property.leadTemperature === temp) return;
      updateProperty.mutate(
        { id: propertyId, data: { leadTemperature: temp } },
        {
          onSuccess: () => showToast.success(`Temperature changed to ${temp}`),
          onError: (err) => showToast.error(getErrorMessage(err)),
        },
      );
    },
    [property, propertyId, updateProperty],
  );

  const handleNotesSave = useCallback(
    (value: string): void => {
      updateProperty.mutate(
        { id: propertyId, data: { notes: value } },
        {
          onSuccess: () => showToast.success('Notes updated'),
          onError: (err) => showToast.error(getErrorMessage(err)),
        },
      );
    },
    [propertyId, updateProperty],
  );

  const handleFollowupComplete = useCallback(
    (followupId: string) => {
      markFollowupComplete.mutate(
        { id: followupId, propertyId },
        {
          onSuccess: () => showToast.success('Followup marked as completed'),
          onError: (err) => showToast.error(getErrorMessage(err)),
        },
      );
    },
    [markFollowupComplete, propertyId],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-foreground-secondary">Loading property...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !property) {
    return (
      <div className="bg-background rounded-lg border border-error/30 p-4">
        <div className="flex items-center gap-3 text-error">
          <AlertCircle className="size-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Failed to load property</p>
            <p className="text-sm text-foreground-secondary mt-1">
              {error ? getErrorMessage(error) : 'Property not found'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const customerName = property.customerName || 'Unknown Customer';
  const propertyTypeName = PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType;
  const quotes = quotesData?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb: Customers > Customer Name > Property Name */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.CUSTOMERS.LIST}>Customers</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: property.customerId })}
            >
              {customerName}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{property.propertyName || 'Unnamed Property'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Large Temperature Badge */}
          <div
            className={cn(
              'size-14 rounded-lg flex items-center justify-center shrink-0',
              property.leadTemperature === LeadTemperature.HOT && 'bg-error/10 text-error',
              property.leadTemperature === LeadTemperature.WARM && 'bg-warning/10 text-warning',
              property.leadTemperature === LeadTemperature.COLD && 'bg-info/10 text-info',
            )}
          >
            <span className="text-lg font-semibold">
              {property.leadTemperature.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">
                {property.propertyName || 'Unnamed Property'}
              </h1>
              <span
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  property.leadTemperature === LeadTemperature.HOT && 'bg-error',
                  property.leadTemperature === LeadTemperature.WARM && 'bg-warning',
                  property.leadTemperature === LeadTemperature.COLD && 'bg-info',
                )}
                title={`${property.leadTemperature} Lead`}
              />
              {property.wantsLoan && (
                <span
                  className="text-primary font-semibold text-xs shrink-0"
                  title="Loan Required"
                >
                  $
                </span>
              )}
            </div>
            <p className="text-sm text-foreground-secondary mt-1">
              {property.address || '-'}, {property.city || '-'} &middot; {propertyTypeName}
            </p>
            <Link
              href={buildRoute(ROUTES.CUSTOMERS.DETAIL, { id: property.customerId })}
              className="text-sm text-primary hover:underline"
            >
              {customerName}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled
            title="TODO: Phase 2"
          >
            <FolderOpen className="mr-2 size-icon-sm" />
            Convert to Project
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(buildRoute(ROUTES.PROPERTIES.EDIT, { id: propertyId }))
            }
          >
            <Edit className="mr-2 size-icon-sm" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`${ROUTES.SITE_VISITS.NEW}?propertyId=${propertyId}`)
            }
          >
            <Calendar className="mr-2 size-icon-sm" />
            Schedule Visit
          </Button>
          <Button
            size="sm"
            onClick={() =>
              router.push(`${ROUTES.QUOTES.NEW}?propertyId=${propertyId}`)
            }
          >
            <FileText className="mr-2 size-icon-sm" />
            Create Quote
          </Button>
        </div>
      </div>

      {/* 3-Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Site Address Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Site Address</CardTitle>
              <button
                type="button"
                onClick={() =>
                  router.push(buildRoute(ROUTES.PROPERTIES.EDIT, { id: propertyId }))
                }
                className="p-1 text-foreground-tertiary hover:text-foreground-secondary rounded transition-colors"
                title="Edit"
              >
                <Edit className="size-icon-xs" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div>
                <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                  Address
                </p>
                <p className="text-sm text-foreground mt-0.5">
                  {property.address || '-'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                    City
                  </p>
                  <p className="text-sm text-foreground mt-0.5">
                    {property.city || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                    State
                  </p>
                  <p className="text-sm text-foreground mt-0.5">
                    {property.state || '-'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                  Pincode
                </p>
                <p className="text-sm text-foreground mt-0.5">
                  {property.pincode || '-'}
                </p>
              </div>
            </div>
            <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
              <MapPin className="size-icon text-foreground-tertiary mr-2" />
              <p className="text-xs text-foreground-tertiary">Map placeholder</p>
            </div>
          </CardContent>
        </Card>

        {/* Electricity Details Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Electricity Details</CardTitle>
              <button
                type="button"
                onClick={() =>
                  router.push(buildRoute(ROUTES.PROPERTIES.EDIT, { id: propertyId }))
                }
                className="p-1 text-foreground-tertiary hover:text-foreground-secondary rounded transition-colors"
                title="Edit"
              >
                <Edit className="size-icon-xs" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                  Consumer No.
                </p>
                <p className="text-sm text-foreground mt-0.5">
                  {property.consumerNumber || '-'}
                </p>
              </div>
              <div>
                <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                  Consumer Name
                </p>
                <p className="text-sm text-foreground mt-0.5">
                  {property.consumerName || '-'}
                </p>
              </div>
              <div>
                <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                  DISCOM
                </p>
                <p className="text-sm text-foreground mt-0.5">
                  {property.discomName || '-'}
                </p>
              </div>
              <div>
                <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                  Connection Type
                </p>
                <p className="text-sm text-foreground mt-0.5">
                  {property.connectionType || '-'}
                </p>
              </div>
              <div>
                <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                  Sanctioned Load
                </p>
                <p className="text-sm text-foreground mt-0.5">
                  {property.sanctionedLoad ? `${property.sanctionedLoad} kW` : '-'}
                </p>
              </div>
              <div>
                <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                  Meter No.
                </p>
                <p className="text-sm text-foreground mt-0.5">
                  {property.meterNumber || '-'}
                </p>
              </div>
            </div>
            <div className="border-t border-border-light pt-3">
              <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                Average Monthly Bill
              </p>
              <p className="text-xl font-semibold text-foreground mt-1">
                {property.monthlyBill ? `₹${property.monthlyBill.toLocaleString()}` : '-'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Lead Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Lead Status</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  router.push(
                    `${ROUTES.FOLLOWUPS.NEW}?propertyId=${propertyId}&customerId=${property.customerId}`,
                  )
                }
              >
                <Plus className="size-icon-sm" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Temperature Selector */}
            <div className="space-y-2">
              <p className="text-2xs text-foreground-secondary uppercase">Temperature</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleTemperatureChange(LeadTemperature.HOT)}
                  className={cn(
                    'flex-1 h-8 rounded-lg text-xs font-medium transition-all',
                    property.leadTemperature === LeadTemperature.HOT
                      ? 'bg-error text-white shadow-sm'
                      : 'bg-error/10 text-error hover:bg-error/20',
                  )}
                >
                  Hot
                </button>
                <button
                  type="button"
                  onClick={() => handleTemperatureChange(LeadTemperature.WARM)}
                  className={cn(
                    'flex-1 h-8 rounded-lg text-xs font-medium transition-all',
                    property.leadTemperature === LeadTemperature.WARM
                      ? 'bg-warning text-white shadow-sm'
                      : 'bg-warning/10 text-warning hover:bg-warning/20',
                  )}
                >
                  Warm
                </button>
                <button
                  type="button"
                  onClick={() => handleTemperatureChange(LeadTemperature.COLD)}
                  className={cn(
                    'flex-1 h-8 rounded-lg text-xs font-medium transition-all',
                    property.leadTemperature === LeadTemperature.COLD
                      ? 'bg-info text-white shadow-sm'
                      : 'bg-info/10 text-info hover:bg-info/20',
                  )}
                >
                  Cold
                </button>
              </div>
            </div>

            {/* Quote info */}
            {property.latestQuoteNumber && (
              <div className="pt-2 border-t border-border-light">
                <p className="text-2xs text-foreground-secondary uppercase mb-2">Latest Quote</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">
                    {property.latestQuoteNumber}
                  </span>
                  <Badge variant="info" size="xs">
                    {property.latestQuoteStatus || 'draft'}
                  </Badge>
                </div>
              </div>
            )}

            {/* Followups Mini-List */}
            <div className="border-t border-border-light pt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-2xs font-medium text-foreground-secondary uppercase">
                    Followups
                  </p>
                  {followups.length > 0 && (
                    <Badge variant="secondary" size="xs">
                      {followups.filter((f) => f.status === 'pending').length}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    router.push(
                      `${ROUTES.FOLLOWUPS.NEW}?propertyId=${propertyId}&customerId=${property.customerId}`,
                    )
                  }
                >
                  <Plus className="size-icon-xs" />
                </Button>
              </div>
              <FollowupMiniList
                followups={followups}
                isLoading={isLoadingFollowups}
                onViewAll={() => handleTabChange('followups')}
                onMarkComplete={handleFollowupComplete}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* URL-synced Tabs */}
      <div className="rounded-lg border border-border-light bg-background">
        {/* Tab Buttons */}
        <div className="flex overflow-x-auto border-b border-border-light">
          {VALID_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
                activeTab === tab
                  ? 'text-primary border-primary'
                  : 'text-foreground-secondary border-transparent hover:text-foreground',
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Tab Content */}

        {/* Site Visit Tab */}
        {activeTab === 'sitevisit' && (
          <div className="py-12 text-center">
            <Calendar className="size-icon-xl text-foreground-tertiary mx-auto mb-3" />
            <p className="text-sm text-foreground-secondary">No site visit completed yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() =>
                router.push(`${ROUTES.SITE_VISITS.NEW}?propertyId=${propertyId}`)
              }
            >
              Schedule Site Visit
            </Button>
          </div>
        )}

        {/* Quotes Tab */}
        {activeTab === 'quotes' && (
          <div className="p-4">
            {isLoadingQuotes ? (
              <div className="space-y-3">
                <div className="h-10 bg-muted rounded animate-pulse" />
                <div className="h-10 bg-muted rounded animate-pulse" />
                <div className="h-10 bg-muted rounded animate-pulse" />
              </div>
            ) : quotes.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="size-icon-xl text-foreground-tertiary mx-auto mb-3" />
                <p className="text-sm text-foreground-secondary">No quotes created yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() =>
                    router.push(`${ROUTES.QUOTES.NEW}?propertyId=${propertyId}`)
                  }
                >
                  Create Quote
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light">
                      <th className="text-left py-2 px-3 text-2xs font-medium text-foreground-secondary uppercase">
                        Quote #
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
                          {quote.quoteNumber}
                        </td>
                        <td className="py-3 px-3 text-foreground-secondary">
                          {quote.systemType} · {quote.systemSizeKw} kW
                        </td>
                        <td className="py-3 px-3 text-right font-medium">
                          {quote.finalPrice
                            ? `₹${quote.finalPrice.toLocaleString()}`
                            : quote.totalPrice
                              ? `₹${quote.totalPrice.toLocaleString()}`
                              : '-'}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              quote.status === QuoteStatus.ACCEPTED
                                ? 'success'
                                : quote.status === QuoteStatus.SENT
                                  ? 'info'
                                  : quote.status === QuoteStatus.REJECTED
                                    ? 'error'
                                    : 'default'
                            }
                            size="xs"
                          >
                            {quote.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-foreground-secondary">
                          {new Date(quote.quoteDate).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
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
            )}
          </div>
        )}

        {/* Followups Tab */}
        {activeTab === 'followups' && (
          <PropertyFollowupsTab
            propertyId={propertyId}
            customerId={property.customerId}
          />
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="p-4">
            <EditableField
              value={property.notes || ''}
              type="textarea"
              placeholder="Add notes about this property..."
              onSave={handleNotesSave}
            />
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <PropertyActivityTab propertyId={propertyId} />
        )}
      </div>
    </div>
  );
}
