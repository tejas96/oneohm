import {
  QuoteStatus,
  SystemType,
  ProjectType,
  PhaseType,
  DcrPreference,
  ItemCategory,
} from '@oneohm-epc/shared/types';
import { type LucideIcon, Building2, Factory, Home, Landmark, Warehouse } from 'lucide-react';

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
// Status Transitions (mirrors backend validateStatusTransition)
// ============================================================================

export const QUOTE_STATUS_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  [QuoteStatus.DRAFT]: [QuoteStatus.SENT],
  [QuoteStatus.SENT]: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED],
  [QuoteStatus.VIEWED]: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED],
  [QuoteStatus.ACCEPTED]: [],
  [QuoteStatus.REJECTED]: [],
  [QuoteStatus.EXPIRED]: [],
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
export const SEARCH_DEBOUNCE_MS = 550;

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
  'preferredInverterCapacityKw',
  'structureType',
  'floorNumber',
  'distanceKm',
] as const;

// ============================================================================
// Quote Detail Tabs
// ============================================================================

export const QUOTE_DETAIL_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'line-items', label: 'Line Items' },
  { value: 'versions', label: 'Versions' },
  { value: 'payments', label: 'Payments' },
  { value: 'activity', label: 'Activity' },
] as const;

export type QuoteDetailTab = (typeof QUOTE_DETAIL_TABS)[number]['value'];

// ============================================================================
// Item Category Labels
// ============================================================================

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  [ItemCategory.SOLAR_PANELS]: 'Solar Panels',
  [ItemCategory.INVERTERS]: 'Inverters',
  [ItemCategory.BATTERIES]: 'Batteries',
  [ItemCategory.MOUNTING]: 'Mounting Structure',
  [ItemCategory.ACCESSORIES]: 'Accessories',
  [ItemCategory.CABLES_WIRING]: 'Cables & Wiring',
  [ItemCategory.EARTHING]: 'Earthing',
  [ItemCategory.LABOR]: 'Labor',
  [ItemCategory.INSTALLATION]: 'Installation',
  [ItemCategory.COMMISSIONING]: 'Commissioning',
  [ItemCategory.TRANSPORTATION]: 'Transportation',
  [ItemCategory.OTHER]: 'Other',
};

// ============================================================================
// Project Type Labels (for detail view)
// ============================================================================

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  [ProjectType.RESIDENTIAL]: 'Residential',
  [ProjectType.RESIDENTIAL_APARTMENT]: 'Residential Apartment',
  [ProjectType.COMMERCIAL]: 'Commercial',
  [ProjectType.INDUSTRIAL]: 'Industrial',
  [ProjectType.INSTITUTIONAL]: 'Institutional',
  [ProjectType.AGRICULTURAL]: 'Agricultural',
};
