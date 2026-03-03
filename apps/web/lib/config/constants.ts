/**
 * Shared Constants
 *
 * Centralized location for reusable constants across the web app.
 * Avoids duplication in form components.
 *
 * @module lib/config/constants
 */

import { ConnectionType, LeadTemperature, PropertyType } from '@oneohm-epc/shared-types';

// ============================================================================
// Indian States
// ============================================================================

export const INDIAN_STATES = ['Karnataka', 'Maharashtra'] as const;

// ============================================================================
// Property Type Options
// ============================================================================

export const PROPERTY_TYPE_OPTIONS = [
  { value: PropertyType.RESIDENTIAL, label: 'Residential', description: 'House or villa' },
  {
    value: PropertyType.RESIDENTIAL_APARTMENT,
    label: 'Apartment',
    description: 'Flat in a building',
  },
  { value: PropertyType.COMMERCIAL, label: 'Commercial', description: 'Shop or office' },
  { value: PropertyType.INDUSTRIAL, label: 'Industrial', description: 'Factory or warehouse' },
  {
    value: PropertyType.AGRICULTURAL,
    label: 'Agricultural',
    description: 'Farm or agricultural land',
  },
  { value: PropertyType.INSTITUTIONAL, label: 'Institutional', description: 'School or hospital' },
] as const;

// ============================================================================
// Connection Type Options
// ============================================================================

export const CONNECTION_TYPE_OPTIONS = [
  { value: ConnectionType.SINGLE_PHASE, label: 'Single Phase' },
  { value: ConnectionType.THREE_PHASE, label: 'Three Phase' },
] as const;

// ============================================================================
// Lead Temperature Options
// ============================================================================

export const LEAD_TEMPERATURE_OPTIONS = [
  { value: LeadTemperature.HOT, label: 'Hot', description: 'Ready to buy' },
  { value: LeadTemperature.WARM, label: 'Warm', description: 'Interested' },
  { value: LeadTemperature.COLD, label: 'Cold', description: 'Just exploring' },
] as const;

// ============================================================================
// DISCOM Options (Distribution Companies)
// ============================================================================

export const DISCOM_OPTIONS = [
  { value: 'MSEDCL', label: 'MSEDCL' },
  { value: 'BEST', label: 'BEST Undertaking' },
  { value: 'AEML', label: 'Adani Electricity Mumbai' },
  { value: 'TPCODL', label: 'Tata Power' },
  { value: 'HESCOM', label: 'HESCOM' },
  { value: 'BESCOM', label: 'BESCOM' },
  { value: 'GUVNL', label: 'GUVNL' },
  { value: 'PSPCL', label: 'PSPCL' },
  { value: 'UPPCL', label: 'UPPCL' },
  { value: 'DHBVN', label: 'DHBVN' },
  { value: 'OTHER', label: 'Other' },
] as const;
