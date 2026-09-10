/**
 * Shared Constants
 *
 * Centralized location for reusable constants across the web app.
 * Avoids duplication in form components.
 *
 * @module lib/config/constants
 */

import { ConnectionType, PropertyType } from '@tejas96/shared/types';

// ============================================================================
// Indian States
// ============================================================================

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
  {
    value: ConnectionType.SINGLE_PHASE,
    label: 'Single phase',
    description: 'Most homes up to 5 kW',
  },
  {
    value: ConnectionType.THREE_PHASE,
    label: 'Three phase',
    description: 'Larger homes, shops, industry',
  },
] as const;

// ============================================================================
// Lead Temperature Options
// ============================================================================

// ============================================================================
// DISCOM Options (Distribution Companies)
// ============================================================================
