/**
 * Property Feature Constants
 *
 * Static configuration for forms, detail page, label maps, and badge variants.
 */

import type { LeadTemperature, PropertyType } from '@oneohm-epc/shared/types';

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
  { value: 'followups', label: 'Followups' },
  { value: 'documents', label: 'Documents' },
  { value: 'activity', label: 'Activity' },
] as const;

export type PropertyDetailTab = (typeof PROPERTY_DETAIL_TABS)[number]['value'];

// ---------------------------------------------------------------------------
// Detail Page: Property Type Labels
// ---------------------------------------------------------------------------

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  residential: 'Residential',
  residential_apartment: 'Apartment',
  commercial: 'Commercial',
  industrial: 'Industrial',
  agricultural: 'Agricultural',
  institutional: 'Institutional',
};

// ---------------------------------------------------------------------------
// Detail Page: Lead Temperature Config
// ---------------------------------------------------------------------------

export const LEAD_TEMPERATURE_CONFIG: Record<
  LeadTemperature,
  { label: string; bg: string; bgActive: string; text: string; dot: string }
> = {
  hot: {
    label: 'Hot',
    bg: 'bg-error/10 text-error hover:bg-error/20',
    bgActive: 'bg-error text-white shadow-sm',
    text: 'text-error',
    dot: 'bg-error',
  },
  warm: {
    label: 'Warm',
    bg: 'bg-warning/10 text-warning hover:bg-warning/20',
    bgActive: 'bg-warning text-white shadow-sm',
    text: 'text-warning',
    dot: 'bg-warning',
  },
  cold: {
    label: 'Cold',
    bg: 'bg-info/10 text-info hover:bg-info/20',
    bgActive: 'bg-info text-white shadow-sm',
    text: 'text-info',
    dot: 'bg-info',
  },
};
