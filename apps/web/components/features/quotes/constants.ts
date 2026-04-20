import { PROJECT_TYPE_LABELS as _PROJECT_TYPE_LABELS } from '@oneohm-epc/shared/constants';
import { SYSTEM_SIZE_CONFIG, DISCOUNT_PRESETS, DISTANCE_CONFIG } from '@oneohm-epc/shared/schemas';
import {
  QuoteStatus,
  SystemType,
  ProjectType,
  DcrPreference,
  ItemCategory,
} from '@oneohm-epc/shared/types';
import { type LucideIcon, Building2, Factory, Home, Landmark, Warehouse } from 'lucide-react';

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

export { SYSTEM_SIZE_CONFIG, DISCOUNT_PRESETS, DISTANCE_CONFIG };
export const PROJECT_TYPE_LABELS: Record<string, string> = _PROJECT_TYPE_LABELS;

export const QUICK_SIZE_OPTIONS = [3, 5, 7, 10, 15, 20] as const;

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
  'selectedSubsidyIds',
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
  { value: 'payments', label: 'Payments' },
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
