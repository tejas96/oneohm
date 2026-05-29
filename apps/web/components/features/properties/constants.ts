/**
 * Property Feature Constants
 *
 * Static configuration for forms, detail page, label maps, and badge variants.
 * All enum-derived filter options use Object.values() from @oneohm-epc/shared/types
 * so they stay in sync automatically when new enum members are added.
 */

import {
  LeadTemperature,
  PropertyStatus,
  PropertyType,
  QuoteStatus,
} from '@oneohm-epc/shared/types';

import { toTitleLabel } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Form: Required Fields
// ---------------------------------------------------------------------------

export const REQUIRED_FIELD_KEYS = [
  'customerId',
  'propertyName',
  'propertyType',
  'address',
  'city',
  'pincode',
  'leadTemperature',
] as const;

export const REQUIRED_FIELDS_TOTAL = REQUIRED_FIELD_KEYS.length;

// ---------------------------------------------------------------------------
// Form: Alert Messages
// ---------------------------------------------------------------------------

export const PROPERTY_ALERTS = {
  propertyTip: {
    title: 'Quick Tip',
    message:
      'Give a descriptive name like \u201CMain Residence\u201D or \u201CWarehouse \u2013 Andheri\u201D to easily identify this property later.',
  },
  addressPrefill: {
    message: 'Address pre-filled from customer profile. You can modify it for this property.',
  },
  electricityTip: {
    title: "Don't have the electricity bill?",
    message:
      'No worries \u2014 all fields here are optional. You can fill these details during the Site Visit.',
  },
  loanBenefits: {
    title: 'Loan Benefits',
    message:
      'With loan financing, your customer pays only 10% advance (vs 30% without). EMI options available from partner banks.',
  },
  documentWarning: {
    title: 'Document Required',
    message:
      'Aadhaar card is required when loan financing is enabled. Other documents are optional but speed up the approval process.',
  },
} as const;

// ---------------------------------------------------------------------------
// Detail Page: Tab Configuration
// ---------------------------------------------------------------------------

export const PROPERTY_DETAIL_TABS = [
  { value: 'siteactivity', label: 'Site Activity' },
  { value: 'quotes', label: 'Quotes' },
  { value: 'documents', label: 'Documents' },
] as const;

export type PropertyDetailTab = (typeof PROPERTY_DETAIL_TABS)[number]['value'];

// ---------------------------------------------------------------------------
// Detail Page: Property Type Labels
// Human-readable overrides for enum values that don't read well via toTitleLabel.
// ---------------------------------------------------------------------------

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  [PropertyType.RESIDENTIAL]: 'Residential',
  [PropertyType.RESIDENTIAL_APARTMENT]: 'Apartment',
  [PropertyType.COMMERCIAL]: 'Commercial',
  [PropertyType.INDUSTRIAL]: 'Industrial',
  [PropertyType.AGRICULTURAL]: 'Agricultural',
  [PropertyType.INSTITUTIONAL]: 'Institutional',
};

// ---------------------------------------------------------------------------
// Detail Page: Lead Temperature Config (Tailwind — used by legacy detail views)
// ---------------------------------------------------------------------------

export const LEAD_TEMPERATURE_CONFIG: Record<
  LeadTemperature,
  { label: string; bg: string; bgActive: string; text: string; dot: string }
> = {
  [LeadTemperature.HOT]: {
    label: 'Hot',
    bg: 'bg-error/10 text-error hover:bg-error/20',
    bgActive: 'bg-error text-white shadow-sm',
    text: 'text-error',
    dot: 'bg-error',
  },
  [LeadTemperature.WARM]: {
    label: 'Warm',
    bg: 'bg-warning/10 text-warning hover:bg-warning/20',
    bgActive: 'bg-warning text-white shadow-sm',
    text: 'text-warning',
    dot: 'bg-warning',
  },
  [LeadTemperature.COLD]: {
    label: 'Cold',
    bg: 'bg-info/10 text-info hover:bg-info/20',
    bgActive: 'bg-info text-white shadow-sm',
    text: 'text-info',
    dot: 'bg-info',
  },
};

// ---------------------------------------------------------------------------
// List Page: MUI theme color tokens for lead temperature dot
// ---------------------------------------------------------------------------

export const TEMP_DOT_MUI_COLOR: Record<LeadTemperature, string> = {
  [LeadTemperature.HOT]: 'error.main',
  [LeadTemperature.WARM]: 'warning.main',
  [LeadTemperature.COLD]: 'info.main',
};

// ---------------------------------------------------------------------------
// List Page: Filter select options — built from shared enums via Object.values()
// No hardcoded value strings; stays in sync when enum members are added.
// ---------------------------------------------------------------------------

/** Filter options for lead temperature — augmented with live counts by PropertyListPage. */
export const LEAD_TEMPERATURE_OPTIONS: ReadonlyArray<{ value: LeadTemperature; label: string }> =
  Object.values(LeadTemperature).map((value) => ({ value, label: toTitleLabel(value) }));

/** Filter options for property type. */
export const PROPERTY_TYPE_OPTIONS: ReadonlyArray<{ value: PropertyType; label: string }> =
  Object.values(PropertyType).map((value) => ({
    value,
    label: PROPERTY_TYPE_LABELS[value],
  }));

/** Filter options for property status. */
export const PROPERTY_STATUS_OPTIONS: ReadonlyArray<{ value: PropertyStatus; label: string }> =
  Object.values(PropertyStatus).map((value) => ({ value, label: toTitleLabel(value) }));

/** Filter options for latest quote status. */
export const QUOTE_STATUS_OPTIONS: ReadonlyArray<{ value: QuoteStatus; label: string }> =
  Object.values(QuoteStatus).map((value) => ({ value, label: toTitleLabel(value) }));

// Re-export enums so callers can import from this feature barrel, avoiding
// deep imports into @oneohm-epc/shared/types for property-specific usage.
export { LeadTemperature, PropertyStatus, PropertyType, QuoteStatus };
