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
  SINGLE_PHASE = '1_phase',
  THREE_PHASE = '3_phase',
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

/**
 * Structure Type Enum
 * Defines mounting structure types
 */
export enum StructureType {
  ALUMINUM_RAIL = 'aluminum_rail',
  GI_STRUCTURE = 'gi_structure',
  FLUSH_MOUNT = 'flush_mount',
  GROUND_MOUNT = 'ground_mount',
  ELEVATED = 'elevated',
  CARPORT = 'carport',
}

/**
 * Installation Component Type Enum
 * Defines different installation cost components
 */
export enum InstallationComponentType {
  ELECTRICAL_WORK = 'electrical_work',
  FIXED_MATERIAL = 'fixed_material',
  VARIABLE_FLOOR = 'variable_floor',
  MSEDCL_CHARGES = 'msedcl_charges',
  SUPERVISION = 'supervision',
  TRANSPORT = 'transport',
  OTHER = 'other',
}
