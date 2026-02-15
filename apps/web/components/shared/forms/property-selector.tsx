'use client';

import { PropertyType, LeadTemperature } from '@oneohm-epc/shared-types';
import { Building2, Home, Factory, Sprout, GraduationCap } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface Property {
  id: string;
  propertyName: string;
  propertyType: PropertyType;
  address: string;
  city: string;
  leadTemperature?: LeadTemperature;
}

export interface PropertySelectorProps {
  /** List of properties to display */
  properties: Property[];
  /** Currently selected property ID */
  value?: string;
  /** Called when property is selected */
  onSelect: (propertyId: string) => void;
  /** Show temperature badge */
  showTemperature?: boolean;
  /** Number of columns */
  columns?: 1 | 2 | 3;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const PROPERTY_TYPE_ICONS: Record<PropertyType, React.ElementType> = {
  [PropertyType.RESIDENTIAL]: Home,
  [PropertyType.RESIDENTIAL_APARTMENT]: Building2,
  [PropertyType.COMMERCIAL]: Building2,
  [PropertyType.INDUSTRIAL]: Factory,
  [PropertyType.AGRICULTURAL]: Sprout,
  [PropertyType.INSTITUTIONAL]: GraduationCap,
};

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  [PropertyType.RESIDENTIAL]: 'Residential',
  [PropertyType.RESIDENTIAL_APARTMENT]: 'Apartment',
  [PropertyType.COMMERCIAL]: 'Commercial',
  [PropertyType.INDUSTRIAL]: 'Industrial',
  [PropertyType.AGRICULTURAL]: 'Agricultural',
  [PropertyType.INSTITUTIONAL]: 'Institutional',
};

const TEMPERATURE_VARIANTS: Record<LeadTemperature, 'hot' | 'warm' | 'cold'> = {
  [LeadTemperature.HOT]: 'hot',
  [LeadTemperature.WARM]: 'warm',
  [LeadTemperature.COLD]: 'cold',
};

// ============================================================================
// Component
// ============================================================================

export function PropertySelector({
  properties,
  value,
  onSelect,
  showTemperature = true,
  columns = 2,
  disabled = false,
  className,
}: PropertySelectorProps): React.JSX.Element {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  };

  if (properties.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Building2 className="size-icon-xl mx-auto text-foreground-tertiary mb-3" />
        <p className="text-sm text-foreground-secondary">No properties found</p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-3', gridCols[columns], className)} role="radiogroup">
      {properties.map((property) => {
        const Icon = PROPERTY_TYPE_ICONS[property.propertyType] || Building2;
        const isSelected = value === property.id;

        return (
          <button
            key={property.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onSelect(property.id)}
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border text-left transition-all duration-fast',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border-light bg-background hover:border-primary/50 hover:bg-primary/5',
              disabled && 'opacity-50 cursor-not-allowed',
              !disabled && 'cursor-pointer'
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                'size-container-md rounded-lg flex items-center justify-center shrink-0',
                isSelected ? 'bg-primary/10' : 'bg-muted'
              )}
            >
              <Icon className={cn('size-icon', isSelected ? 'text-primary' : 'text-foreground-secondary')} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={cn('text-sm font-medium truncate', isSelected && 'text-primary')}>
                  {property.propertyName}
                </p>
                {showTemperature && property.leadTemperature && (
                  <Badge variant={TEMPERATURE_VARIANTS[property.leadTemperature]} size="xs">
                    {property.leadTemperature}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-foreground-secondary truncate">
                {property.address}, {property.city}
              </p>
              <p className="text-xs text-foreground-tertiary mt-1">
                {PROPERTY_TYPE_LABELS[property.propertyType]}
              </p>
            </div>

            {/* Selection indicator */}
            <div
              className={cn(
                'size-5 rounded-full border-2 shrink-0 flex items-center justify-center',
                isSelected ? 'border-primary bg-primary' : 'border-border-medium'
              )}
            >
              {isSelected && (
                <div className="size-2 rounded-full bg-white" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
