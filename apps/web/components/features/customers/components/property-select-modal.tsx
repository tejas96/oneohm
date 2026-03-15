'use client';

import { LeadTemperature, PropertyType } from '@oneohm-epc/shared/types';
import { Building2, MapPin, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { CustomerPropertyResponse } from '../hooks';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ROUTES } from '@/lib/config/routes';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface PropertySelectModalProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  properties: CustomerPropertyResponse[];
}

// ============================================================================
// Constants
// ============================================================================

const TEMP_COLORS: Record<LeadTemperature, { dot: string; label: string }> = {
  [LeadTemperature.HOT]: { dot: 'bg-destructive', label: 'Hot' },
  [LeadTemperature.WARM]: { dot: 'bg-warning', label: 'Warm' },
  [LeadTemperature.COLD]: { dot: 'bg-info', label: 'Cold' },
};

const PROPERTY_TYPE_LABELS: Partial<Record<PropertyType, string>> = {
  [PropertyType.RESIDENTIAL]: 'Residential',
  [PropertyType.RESIDENTIAL_APARTMENT]: 'Apartment',
  [PropertyType.COMMERCIAL]: 'Commercial',
  [PropertyType.INDUSTRIAL]: 'Industrial',
  [PropertyType.AGRICULTURAL]: 'Agricultural',
  [PropertyType.INSTITUTIONAL]: 'Institutional',
};

// ============================================================================
// Component
// ============================================================================

/**
 * PropertySelectModal - Modal to select a property before creating a quote
 *
 * Used when clicking "Create Quote" from the customer detail page.
 * User must select which property the quote is for.
 */
export function PropertySelectModal({
  open,
  onClose,
  customerId,
  properties,
}: PropertySelectModalProps): React.JSX.Element {
  const router = useRouter();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const handleContinue = (): void => {
    if (!selectedPropertyId) return;

    // Navigate to quote builder with customer and property context
    router.push(`${ROUTES.QUOTES.NEW}?customerId=${customerId}&propertyId=${selectedPropertyId}`);
    onClose();
  };

  const handlePropertyClick = (propertyId: string): void => {
    setSelectedPropertyId(propertyId);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="space-y-1">
            <DialogTitle>Select Property for Quote</DialogTitle>
            <DialogDescription>
              Choose the property you want to create a quote for.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="max-h-80 space-y-2 overflow-y-auto px-4 py-4">
          {properties.length === 0 ? (
            <div className="py-8 text-center text-foreground-secondary">
              <Building2 className="mx-auto mb-3 size-12 text-foreground-tertiary" />
              <p>No properties found for this customer.</p>
              <p className="mt-1 text-sm">Add a property first before creating a quote.</p>
            </div>
          ) : (
            properties.map((property) => {
              const isSelected = selectedPropertyId === property.id;
              const tempConfig =
                TEMP_COLORS[property.leadTemperature] || TEMP_COLORS[LeadTemperature.COLD];
              const typeLabel = PROPERTY_TYPE_LABELS[property.propertyType] || 'Property';
              const displayName = property.propertyName || property.address || 'Unnamed Property';

              return (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => handlePropertyClick(property.id)}
                  className={cn(
                    'w-full rounded-lg border-2 p-3 text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border-light bg-muted hover:border-primary/50',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate font-medium">{displayName}</h4>
                        {property.isPrimary && (
                          <Badge variant="default" size="xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                      {property.address && (
                        <p className="mt-0.5 flex items-center gap-1 text-sm text-foreground-secondary">
                          <MapPin className="size-3" />
                          <span className="truncate">
                            {property.address}
                            {property.city && `, ${property.city}`}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-1.5">
                      <span className={cn('size-2 rounded-full', tempConfig.dot)} />
                      <span className="text-xs text-foreground-secondary">{tempConfig.label}</span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="rounded bg-white px-1.5 py-0.5 border border-border-light">
                      {typeLabel}
                    </span>
                    {property.monthlyBill && (
                      <span className="flex items-center gap-1 text-foreground-secondary">
                        <Zap className="size-3" />₹{property.monthlyBill.toLocaleString('en-IN')}
                        /month
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selectedPropertyId || properties.length === 0}
          >
            Continue to Quote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
