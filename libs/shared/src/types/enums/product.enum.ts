/**
 * Product Type Enum
 * Kept for backward compatibility - new code should use product_types.code strings
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

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
}

export enum ProjectType {
  RESIDENTIAL = 'residential',
  RESIDENTIAL_APARTMENT = 'residential_apartment',
  COMMERCIAL = 'commercial',
  INDUSTRIAL = 'industrial',
  AGRICULTURAL = 'agricultural',
  INSTITUTIONAL = 'institutional',
}

export enum UnitOfMeasure {
  PIECES = 'pcs',
  METERS = 'mtr',
  KILOGRAMS = 'kg',
  SETS = 'set',
  BOXES = 'box',
  ROLLS = 'roll',
}

/** @deprecated Runtime validation now uses product_type_attributes. Kept as well-known constants. */
export enum PhaseType {
  SINGLE_PHASE = 'single_phase',
  THREE_PHASE = 'three_phase',
}

/** @deprecated Runtime validation now uses product_type_attributes. Kept as well-known constants. */
export enum PanelTechnology {
  PERC = 'perc',
  TOPCON = 'topcon',
  MONO_PERC = 'mono_perc',
  POLY = 'poly',
  BIFACIAL = 'bifacial',
}

export const PANEL_TECHNOLOGY_LABELS: Record<string, string> = {
  [PanelTechnology.PERC]: 'PERC',
  [PanelTechnology.TOPCON]: 'TOPCon',
  [PanelTechnology.MONO_PERC]: 'Mono PERC',
  [PanelTechnology.POLY]: 'Poly',
  [PanelTechnology.BIFACIAL]: 'Bifacial',
};

/**
 * @deprecated Runtime validation now uses product_type_attributes. Kept as well-known constants.
 * Pricing: unitPrice × costMultiplier × systemSizeKw
 */
export enum StructureType {
  ALUMINUM_RAIL = 'aluminum_rail',
  RCC_3X6 = 'rcc_3x6',
  ELEVATED_6X9 = 'elevated_6x9',
  SUPER_ELEVATED = 'super_elevated',
  GROUND_MOUNT = 'ground_mount',
}

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
