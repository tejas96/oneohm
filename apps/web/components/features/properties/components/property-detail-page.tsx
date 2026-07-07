'use client';

import {
  CustomerStatus,
  DocumentEntityType,
  LeadTemperature,
  QuoteStatus,
} from '@tejas96/shared/types';
import { Edit, FileText, MapPin } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type JSX, useCallback } from 'react';

import { QUOTE_STATUS_BADGE_VARIANT } from '../../customers/constants';
import { useCustomer } from '../../customers/hooks';
import {
  LEAD_TEMPERATURE_CONFIG,
  PROPERTY_DETAIL_TABS,
  type PropertyDetailTab,
} from '../constants';
import { useProperty, useUpdateProperty, usePropertyQuotes } from '../hooks';
import { PropertyDetailHeader } from './property-detail-header';

import { SiteActivityTab } from '@/components/features/site-activities/components';
import { EmptyState, ErrorState } from '@/components/shared';
import { PropertyDocumentHub } from '@/components/shared/document-manager';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  showToast,
  SystemSizeDisplay,
} from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { cn, formatCurrency, formatDate, getErrorMessage } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface PropertyDetailPageProps {
  propertyId: string;
}

const DEFAULT_TAB: PropertyDetailTab = 'siteactivity';

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-64" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Skeleton className="size-14 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function PropertyDetailPage({ propertyId }: PropertyDetailPageProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get('tab') || DEFAULT_TAB;
  const activeTab: PropertyDetailTab = PROPERTY_DETAIL_TABS.some((t) => t.value === rawTab)
    ? (rawTab as PropertyDetailTab)
    : DEFAULT_TAB;

  const { data: property, isLoading, isError, error, refetch } = useProperty(propertyId);
  const { data: customer } = useCustomer(property?.customerId ?? '');
  const updateProperty = useUpdateProperty();

  const { data: quotesData, isLoading: isLoadingQuotes } = usePropertyQuotes(propertyId);

  const handleTabChange = useCallback(
    (tab: string) => {
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

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <ErrorState
        title="Failed to load property"
        description={
          error ? getErrorMessage(error) : 'Something went wrong while loading the property.'
        }
        onRetry={() => void refetch()}
      />
    );
  }

  // Not found state
  if (!property) {
    return (
      <EmptyState
        icon={<FileText className="w-full h-full" />}
        title="Property not found"
        description="The property you're looking for doesn't exist or has been deleted."
        action={{
          label: 'Back to Properties',
          onClick: () => router.push(ROUTES.PROPERTIES.LIST),
        }}
      />
    );
  }

  const quotes = quotesData?.data ?? [];
  const isInactiveCustomer = customer?.status === CustomerStatus.INACTIVE;

  return (
    <div className="space-y-4">
      {/* Header (breadcrumb + title + actions) */}
      <PropertyDetailHeader property={property} />

      {/* 3-Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Site Address Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Site Address</CardTitle>
              <button
                type="button"
                onClick={() => router.push(buildRoute(ROUTES.PROPERTIES.EDIT, { id: propertyId }))}
                className="p-1 text-foreground-tertiary hover:text-foreground-secondary rounded transition-colors cursor-pointer"
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
                <p className="text-sm text-foreground mt-0.5">{property.address || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                    City
                  </p>
                  <p className="text-sm text-foreground mt-0.5">{property.city || '-'}</p>
                </div>
                <div>
                  <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                    State
                  </p>
                  <p className="text-sm text-foreground mt-0.5">{property.state || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                  Pincode
                </p>
                <p className="text-sm text-foreground mt-0.5">{property.pincode || '-'}</p>
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
                onClick={() => router.push(buildRoute(ROUTES.PROPERTIES.EDIT, { id: propertyId }))}
                className="p-1 text-foreground-tertiary hover:text-foreground-secondary rounded transition-colors cursor-pointer"
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
                <p className="text-sm text-foreground mt-0.5">{property.consumerNumber || '-'}</p>
              </div>
              <div>
                <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                  Consumer Name
                </p>
                <p className="text-sm text-foreground mt-0.5">{property.consumerName || '-'}</p>
              </div>
              <div>
                <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                  DISCOM
                </p>
                <p className="text-sm text-foreground mt-0.5">{property.discomName || '-'}</p>
              </div>
              <div>
                <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                  Connection Type
                </p>
                <p className="text-sm text-foreground mt-0.5">{property.connectionType || '-'}</p>
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
                  Current Load
                </p>
                <p className="text-sm text-foreground mt-0.5">{property.currentLoad || '-'}</p>
              </div>
              <div>
                <p className="text-2xs font-medium text-foreground-secondary uppercase tracking-wider">
                  Meter No.
                </p>
                <p className="text-sm text-foreground mt-0.5">{property.meterNumber || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Lead Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Temperature Selector */}
            <div className="space-y-2">
              <p className="text-2xs text-foreground-secondary uppercase">Temperature</p>
              <div className="flex gap-2">
                {(
                  Object.entries(LEAD_TEMPERATURE_CONFIG) as [
                    LeadTemperature,
                    (typeof LEAD_TEMPERATURE_CONFIG)[LeadTemperature],
                  ][]
                ).map(([temp, config]) => (
                  <button
                    key={temp}
                    type="button"
                    onClick={() => handleTemperatureChange(temp)}
                    className={cn(
                      'flex-1 h-8 rounded-lg text-xs font-medium transition-all cursor-pointer',
                      property.leadTemperature === temp ? config.bgActive : config.bg,
                    )}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Latest Quote Info */}
            {property.latestQuoteNumber && (
              <div className="pt-2 border-t border-border-light">
                <p className="text-2xs text-foreground-secondary uppercase mb-2">Latest Quote</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">
                    {property.latestQuoteNumber}
                  </span>
                  <Badge
                    variant={
                      property.latestQuoteStatus
                        ? QUOTE_STATUS_BADGE_VARIANT[property.latestQuoteStatus]
                        : 'default'
                    }
                    size="xs"
                  >
                    {property.latestQuoteStatus || 'draft'}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="rounded-lg border border-border bg-background">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList
            variant="underline"
            className="overflow-x-auto overflow-y-hidden"
            aria-label="Property detail tabs"
          >
            {PROPERTY_DETAIL_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} variant="underline">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Site Activity Tab */}
          <TabsContent value="siteactivity">
            <SiteActivityTab propertyId={propertyId} />
          </TabsContent>

          {/* Quotes Tab */}
          <TabsContent value="quotes">
            <div className="p-4">
              {isLoadingQuotes ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded" />
                  ))}
                </div>
              ) : quotes.length === 0 ? (
                <EmptyState
                  icon={<FileText className="w-full h-full" />}
                  title="No quotes created yet"
                  description={
                    isInactiveCustomer
                      ? 'Quote creation is blocked because the customer is inactive.'
                      : 'Create a quote to start the proposal process for this property.'
                  }
                  action={
                    isInactiveCustomer
                      ? undefined
                      : {
                          label: 'Create Quote',
                          onClick: () =>
                            router.push(
                              `${ROUTES.QUOTES.NEW}?propertyId=${propertyId}&customerId=${property.customerId}`,
                            ),
                          icon: <FileText className="size-icon-sm" />,
                        }
                  }
                />
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
                            <span className="capitalize">{quote.systemType.replace('_', ' ')}</span>
                            {' · '}
                            <SystemSizeDisplay
                              actualKw={quote.actualSystemSizeKw}
                              requestedKw={quote.systemSizeKw}
                              size="sm"
                              layout="inline"
                            />
                          </td>
                          <td className="py-3 px-3 text-right font-medium">
                            {quote.finalPrice
                              ? formatCurrency(quote.finalPrice)
                              : quote.totalPrice
                                ? formatCurrency(quote.totalPrice)
                                : '-'}
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              variant={
                                QUOTE_STATUS_BADGE_VARIANT[quote.status as QuoteStatus] ?? 'default'
                              }
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
              )}
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <PropertyDocumentHub
              propertyId={property.id}
              allowUpload
              defaultUploadEntityType={DocumentEntityType.PROPERTY}
              defaultUploadEntityId={property.id}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
