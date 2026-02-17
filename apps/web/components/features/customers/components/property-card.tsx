'use client';

import { LeadTemperature, PropertyType, QuoteStatus } from '@oneohm-epc/shared-types';
import { Eye, FileText, Folder, MoreVertical, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { CustomerPropertyResponse } from '../hooks';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buildRoute, ROUTES } from '@/lib/config/routes';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface PropertyCardProps {
  property: CustomerPropertyResponse;
  customerId: string;
  onCreateQuote?: (propertyId: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const TEMP_COLORS: Record<LeadTemperature, { dot: string; text: string; label: string }> = {
  [LeadTemperature.HOT]: {
    dot: 'bg-red-500',
    text: 'text-red-600',
    label: 'Hot',
  },
  [LeadTemperature.WARM]: {
    dot: 'bg-yellow-500',
    text: 'text-yellow-600',
    label: 'Warm',
  },
  [LeadTemperature.COLD]: {
    dot: 'bg-blue-400',
    text: 'text-blue-600',
    label: 'Cold',
  },
};

const PROPERTY_TYPE_LABELS: Partial<Record<PropertyType, string>> = {
  [PropertyType.RESIDENTIAL]: 'Residential',
  [PropertyType.RESIDENTIAL_APARTMENT]: 'Apartment',
  [PropertyType.COMMERCIAL]: 'Commercial',
  [PropertyType.INDUSTRIAL]: 'Industrial',
  [PropertyType.AGRICULTURAL]: 'Agricultural',
  [PropertyType.INSTITUTIONAL]: 'Institutional',
};

const QUOTE_STATUS_STYLES: Record<QuoteStatus, { bg: string; text: string; label: string }> = {
  [QuoteStatus.DRAFT]: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  [QuoteStatus.SENT]: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Quote Sent' },
  [QuoteStatus.VIEWED]: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Viewed' },
  [QuoteStatus.ACCEPTED]: { bg: 'bg-green-100', text: 'text-green-700', label: 'Accepted' },
  [QuoteStatus.REJECTED]: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  [QuoteStatus.EXPIRED]: { bg: 'bg-gray-200', text: 'text-gray-600', label: 'Expired' },
};

// ============================================================================
// Component
// ============================================================================

/**
 * PropertyCard - Displays a property card with temperature indicator, badges, and actions
 *
 * Features:
 * - Temperature dot indicator (Hot, Warm, Cold)
 * - Property type badge (Residential, Commercial, etc.)
 * - System size badge with lightning icon
 * - Loan indicator badge
 * - Monthly bill display
 * - Quote status badge
 * - Hover dropdown with actions (View Details, Create Quote, Convert to Project)
 */
export function PropertyCard({
  property,
  customerId,
  onCreateQuote,
}: PropertyCardProps): React.JSX.Element {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const tempConfig = TEMP_COLORS[property.leadTemperature] || TEMP_COLORS[LeadTemperature.COLD];
  const propertyTypeLabel = PROPERTY_TYPE_LABELS[property.propertyType] || 'Property';
  const quoteStatusConfig = property.latestQuoteStatus
    ? QUOTE_STATUS_STYLES[property.latestQuoteStatus]
    : null;

  // Format property display name
  const displayName = property.propertyName || property.address || 'Unnamed Property';
  const displayAddress = property.address
    ? `${property.address}${property.city ? `, ${property.city}` : ''}`
    : property.city || '';

  // Format monthly bill
  const formattedMonthlyBill = property.monthlyBill
    ? `₹${property.monthlyBill.toLocaleString('en-IN')}/month`
    : null;

  // Estimate system size based on monthly bill (rough estimate: 1kW per ₹1500/month)
  const estimatedSystemSize = property.monthlyBill
    ? Math.round(property.monthlyBill / 1500)
    : null;

  const handleViewDetails = (): void => {
    router.push(buildRoute(ROUTES.PROPERTIES.DETAIL, { id: property.id }));
  };

  const handleCreateQuote = (): void => {
    if (onCreateQuote) {
      onCreateQuote(property.id);
    } else {
      router.push(`${ROUTES.QUOTES.NEW}?customerId=${customerId}&propertyId=${property.id}`);
    }
  };

  const handleConvertToProject = (): void => {
    // Navigate to project creation with property context
    router.push(`/projects/new?propertyId=${property.id}&customerId=${customerId}`);
  };

  return (
    <div
      className={cn(
        'group relative block rounded-lg border-2 border-transparent bg-gray-50 p-4 transition-all',
        'hover:border-primary hover:shadow-md cursor-pointer'
      )}
    >
      {/* Quick Actions Dropdown (visible on hover) */}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-8 bg-white shadow-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="size-4" />
              <span className="sr-only">Property actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={handleViewDetails}>
              <Eye className="mr-2 size-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCreateQuote}>
              <FileText className="mr-2 size-4" />
              Create Quote
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleConvertToProject} className="text-primary font-medium">
              <Folder className="mr-2 size-4" />
              Convert to Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Card Content - Clickable to View Details */}
      <Link href={buildRoute(ROUTES.PROPERTIES.DETAIL, { id: property.id })} className="block">
        {/* Header Row: Property Name + Temperature */}
        <div className="mb-2 flex items-start justify-between pr-8">
          <div className="min-w-0 flex-1">
            <h4 className="truncate font-medium text-foreground">{displayName}</h4>
            {displayAddress && (
              <p className="truncate text-sm text-foreground-secondary">{displayAddress}</p>
            )}
          </div>
          <div className="ml-2 flex shrink-0 items-center gap-2">
            <span className={cn('size-2 rounded-full', tempConfig.dot)} />
            <span className={cn('text-xs font-medium', tempConfig.text)}>{tempConfig.label}</span>
          </div>
        </div>

        {/* Badges Row */}
        <div className="mb-3 flex flex-wrap gap-2">
          {/* Property Type Badge */}
          <span className="rounded border border-border-light bg-white px-2 py-0.5 text-xs">
            {propertyTypeLabel}
          </span>

          {/* System Size Badge */}
          {estimatedSystemSize ? (
            <span className="flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <Zap className="size-3" />
              ~{estimatedSystemSize} kW (est.)
            </span>
          ) : null}

          {/* Wants Loan Badge */}
          {property.wantsLoan ? (
            <span className="flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
              <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Wants Loan
            </span>
          ) : null}
        </div>

        {/* Footer Row: Monthly Bill + Quote Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground-secondary">
            {formattedMonthlyBill || 'Bill not set'}
          </span>
          {quoteStatusConfig ? (
            <span
              className={cn(
                'rounded px-2 py-0.5 text-xs font-medium',
                quoteStatusConfig.bg,
                quoteStatusConfig.text
              )}
            >
              {quoteStatusConfig.label}
            </span>
          ) : (
            <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
              No Quote
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
