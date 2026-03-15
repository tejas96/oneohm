/**
 * Product Type Enum
 * Defines all types of products in the solar EPC system
 */
export enum ProductType {
  SOLAR_PANEL = 'solar_panel',
  INVERTER = 'inverter',
  BATTERY = 'battery',
  MOUNTING_STRUCTURE = 'mounting_structure',
  CABLE = 'cable',
  CONNECTOR = 'connector',
  JUNCTION_BOX = 'junction_box',
  METER = 'meter',
  EARTHING = 'earthing',
  ACCESSORIES = 'accessories',
}

/**
 * Product Status Enum
 * Defines the lifecycle status of a product
 */
export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
}

/**
 * Pricing Rule Type Enum
 * Defines different types of pricing strategies
 */
export enum PricingRuleType {
  BASE_PRICE = 'base_price',
  VOLUME_DISCOUNT = 'volume_discount',
  CUSTOMER_TYPE = 'customer_type',
  SEASONAL = 'seasonal',
  PROMOTIONAL = 'promotional',
  PROJECT_TYPE = 'project_type',
}

/**
 * Project Type Enum
 * Defines types of solar projects
 */
export enum ProjectType {
  RESIDENTIAL = 'residential',
  RESIDENTIAL_APARTMENT = 'residential_apartment',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
  AGRICULTURAL = 'agricultural',
}

/**
 * Unit of Measure Enum
 * Common units used for products
 */
export enum UnitOfMeasure {
  PIECES = 'pcs',
  METERS = 'mtr',
  KILOGRAMS = 'kg',
  SETS = 'set',
  BOXES = 'box',
  ROLLS = 'roll',
}

/**
 * Phase Type Enum
 * Defines electrical phase types for inverters
 */
export enum PhaseType {
  SINGLE_PHASE = 'single_phase',
  THREE_PHASE = 'three_phase',
}

/**
 * Panel Technology Enum
 * Defines solar panel manufacturing technologies
 */
export enum PanelTechnology {
  PERC = 'perc',
  TOPCON = 'topcon',
  MONO_PERC = 'mono_perc',
  POLY = 'poly',
  BIFACIAL = 'bifacial',
}

export const PANEL_TECHNOLOGY_LABELS: Record<PanelTechnology, string> = {
  [PanelTechnology.PERC]: 'PERC',
  [PanelTechnology.TOPCON]: 'TOPCon',
  [PanelTechnology.MONO_PERC]: 'Mono PERC',
  [PanelTechnology.POLY]: 'Poly',
  [PanelTechnology.BIFACIAL]: 'Bifacial',
};

/**
 * Structure Type Enum
 * Defines mounting structure types
 *
 * Pricing formula: basePrice × multiplier × systemSizeKw
 * Multipliers:
 * - ALUMINUM_RAIL: 1.0
 * - RCC_3X6: 2.2
 * - ELEVATED_6X9: 2.5
 * - SUPER_ELEVATED: 3.2
 * - GROUND_MOUNT: 3.5
 */
export enum StructureType {
  ALUMINUM_RAIL = 'aluminum_rail',
  RCC_3X6 = 'rcc_3x6',
  ELEVATED_6X9 = 'elevated_6x9',
  SUPER_ELEVATED = 'super_elevated',
  GROUND_MOUNT = 'ground_mount',
}

/**
 * Installation Component Type Enum
 * Defines different installation cost components
 *
 * Note: These are the standard component keys used in InstallationCostComponents JSONB.
 * Additional custom keys can be added to the JSONB without updating this enum.
 */
export enum InstallationComponentType {
  ELECTRICAL_WORK = 'electrical_work',
  FIXED_MATERIAL = 'fixed_material',
  VARIABLE_FLOOR = 'variable_floor',
  STRUCTURE_COST = 'structure_cost',
  INSTALLATION_LABOR = 'installation_labor',
  MSEDCL_CHARGES = 'msedcl_charges',
  LOADING_UNLOADING = 'loading_unloading',
  SUPERVISION = 'supervision',
  TRANSPORT = 'transport',
  CRANE_CHARGES = 'crane_charges',
  PERMIT_FEES = 'permit_fees',
  INSURANCE = 'insurance',
  SAFETY_EQUIPMENT = 'safety_equipment',
  DOCUMENTATION = 'documentation',
  OTHER = 'other',
}
