import {
  QuoteStatus,
  SystemType,
  ProjectType,
  PhaseType,
  DcrPreference,
  StructureType,
} from '@oneohm-epc/shared-types';
import { type LucideIcon , Building2, Factory, Home, Landmark, Warehouse } from 'lucide-react';

import type { FilterTab } from '@/components/shared';

// ============================================================================
// Status Labels & Badge Variants
// ============================================================================

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  [QuoteStatus.DRAFT]: 'Draft',
  [QuoteStatus.SENT]: 'Sent',
  [QuoteStatus.VIEWED]: 'Viewed',
  [QuoteStatus.ACCEPTED]: 'Accepted',
  [QuoteStatus.REJECTED]: 'Rejected',
  [QuoteStatus.EXPIRED]: 'Expired',
};

export const QUOTE_STATUS_BADGE_VARIANTS: Record<string, string> = {
  [QuoteStatus.DRAFT]: 'muted',
  [QuoteStatus.SENT]: 'info',
  [QuoteStatus.VIEWED]: 'pending',
  [QuoteStatus.ACCEPTED]: 'success',
  [QuoteStatus.REJECTED]: 'error',
  [QuoteStatus.EXPIRED]: 'warning',
};

// ============================================================================
// System Type Labels
// ============================================================================

export const SYSTEM_TYPE_LABELS: Record<SystemType, string> = {
  [SystemType.ON_GRID]: 'On Grid',
  [SystemType.OFF_GRID]: 'Off Grid',
  [SystemType.HYBRID]: 'Hybrid',
};

// ============================================================================
// Filter Tabs
// ============================================================================

export const QUOTE_FILTER_TABS: FilterTab<string>[] = [
  { id: 'all', label: 'All' },
  { id: QuoteStatus.DRAFT, label: 'Draft' },
  { id: QuoteStatus.SENT, label: 'Sent' },
  { id: QuoteStatus.VIEWED, label: 'Viewed' },
  { id: QuoteStatus.ACCEPTED, label: 'Accepted' },
  { id: QuoteStatus.REJECTED, label: 'Rejected' },
];

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 500;

// ============================================================================
// Project Type Options
// ============================================================================

export interface ProjectTypeOption {
  value: ProjectType;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const PROJECT_TYPE_OPTIONS: ProjectTypeOption[] = [
  {
    value: ProjectType.RESIDENTIAL,
    label: 'Residential',
    icon: Home,
    description: 'Individual homes',
  },
  {
    value: ProjectType.RESIDENTIAL_APARTMENT,
    label: 'Apartment',
    icon: Building2,
    description: 'Apartment buildings',
  },
  {
    value: ProjectType.COMMERCIAL,
    label: 'Commercial',
    icon: Landmark,
    description: 'Offices, shops, etc.',
  },
  {
    value: ProjectType.INDUSTRIAL,
    label: 'Industrial',
    icon: Factory,
    description: 'Factories, warehouses',
  },
  {
    value: ProjectType.AGRICULTURAL,
    label: 'Agricultural',
    icon: Warehouse,
    description: 'Farm installations',
  },
];

// ============================================================================
// Phase Type Options
// ============================================================================

export interface PhaseTypeOption {
  value: PhaseType;
  label: string;
  subtitle: string;
}

export const PHASE_TYPE_OPTIONS: PhaseTypeOption[] = [
  {
    value: PhaseType.SINGLE_PHASE,
    label: 'Single Phase',
    subtitle: 'Up to 7 kW systems',
  },
  {
    value: PhaseType.THREE_PHASE,
    label: 'Three Phase',
    subtitle: 'Above 7 kW systems',
  },
];

// ============================================================================
// Structure Type Options
// ============================================================================

export interface StructureTypeOption {
  value: StructureType;
  label: string;
  description: string;
}

export const STRUCTURE_TYPE_OPTIONS: StructureTypeOption[] = [
  {
    value: StructureType.ALUMINUM_RAIL,
    label: 'Aluminum Rail',
    description: 'Standard roof mounting',
  },
  {
    value: StructureType.RCC_3X6,
    label: 'RCC 3x6',
    description: 'Metal sheet rooftop',
  },
  {
    value: StructureType.ELEVATED_6X9,
    label: 'Elevated 6x9',
    description: 'Elevated 6x9 feet',
  },
  {
    value: StructureType.SUPER_ELEVATED,
    label: 'Super Elevated',
    description: 'Super elevated 10x14 feet',
  },
  {
    value: StructureType.GROUND_MOUNT,
    label: 'Ground Mount',
    description: 'Ground installation',
  },
];

// ============================================================================
// DCR Preference Options
// ============================================================================

export interface DcrPreferenceOption {
  value: DcrPreference;
  label: string;
  description: string;
  recommended?: boolean;
}

export const DCR_PREFERENCE_OPTIONS: DcrPreferenceOption[] = [
  {
    value: DcrPreference.AUTO_SPLIT,
    label: 'Auto Split',
    description: 'DCR for subsidy portion + Non-DCR for rest',
    recommended: true,
  },
  {
    value: DcrPreference.DCR_ONLY,
    label: 'All DCR',
    description: '100% DCR panels (subsidy eligible)',
  },
  {
    value: DcrPreference.NON_DCR_ONLY,
    label: 'Non-DCR Only',
    description: 'Budget option (no subsidy)',
  },
];

// ============================================================================
// System Size Configuration
// ============================================================================

export const SYSTEM_SIZE_CONFIG = {
  min: 1,
  max: 100,
  maxApi: 1000,
  step: 1,
  defaultResidential: 3,
  defaultCommercial: 10,
  defaultIndustrial: 50,
} as const;

export const QUICK_SIZE_OPTIONS = [3, 5, 7, 10, 15, 20] as const;

// ============================================================================
// Floor Options
// ============================================================================

export const FLOOR_OPTIONS = Array.from({ length: 11 }, (_, i) => ({
  value: i,
  label: i === 0 ? 'Ground Floor' : `Floor ${i}`,
}));

// ============================================================================
// Distance Configuration
// ============================================================================

export const DISTANCE_CONFIG = {
  min: 0,
  max: 500,
  default: 50,
  step: 5,
  transportRatePerKm: 25,
} as const;

// ============================================================================
// Discount Presets
// ============================================================================

export const DISCOUNT_PRESETS = [1000, 2000, 5000, 10000] as const;

// ============================================================================
// Property Type to Project Type Mapping
// ============================================================================

export const PROPERTY_TYPE_TO_PROJECT_TYPE: Record<string, ProjectType> = {
  residential: ProjectType.RESIDENTIAL,
  residential_apartment: ProjectType.RESIDENTIAL_APARTMENT,
  commercial: ProjectType.COMMERCIAL,
  industrial: ProjectType.INDUSTRIAL,
  agricultural: ProjectType.AGRICULTURAL,
};

// ============================================================================
// Pricing-affecting fields (changes to these clear calculation)
// ============================================================================

export const PRICING_AFFECTING_FIELDS = [
  'systemSizeKw',
  'projectType',
  'phaseType',
  'subsidyApplicable',
  'dcrPreference',
  'preferredPanelBrand',
  'preferredPanelTechnology',
  'preferredPanelWattage',
  'preferredInverterBrand',
  'structureType',
  'floorNumber',
  'distanceKm',
] as const;
