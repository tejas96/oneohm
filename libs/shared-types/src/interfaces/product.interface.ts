import { PhaseType, PanelTechnology, StructureType } from '../enums/product.enum';

/**
 * ============================================================================
 * PRODUCT ENTITY SPECIFICATIONS INTERFACES
 * ============================================================================
 *
 * These interfaces define the structure for the `specifications` JSONB column
 * in the products table. They provide a type-safe, nested structure for
 * different product types while maintaining flexibility for custom fields.
 */

/**
 * Common specifications shared across all product types
 */
export interface CommonProductSpecs {
  /** Wattage in W */
  wattage?: number;
  /** Capacity in kW/kWh */
  capacity?: number;
  /** Voltage specification (e.g., "230V AC") */
  voltage?: string;
  /** Efficiency percentage */
  efficiency?: number;
  /** Dimensions (e.g., "2278x1134x35mm") */
  dimensions?: string;
  /** Weight in kg */
  weight?: number;
  /** Input voltage range (e.g., "350-850V DC") */
  inputVoltage?: string;
  /** Output voltage (e.g., "230V AC") */
  outputVoltage?: string;
  /** Number of phases */
  phases?: number;
  /** MPPT channels count */
  mpptChannels?: number;
  /** Solar cell type (e.g., "Monocrystalline") */
  cellType?: string;
  /** Battery chemistry (e.g., "Lithium-ion") */
  chemistry?: string;
  /** Battery cycle life */
  cycleLife?: number;
  /** Depth of discharge percentage */
  depthOfDischarge?: number;
}

/**
 * Solar Panel specific specifications
 */
export interface PanelProductSpecs {
  /** Whether panel qualifies for DCR subsidy */
  isDcr?: boolean;
  /** Panel technology (PERC, TOPCon, etc.) */
  technology?: PanelTechnology;
  /** Nominal wattage */
  wattage?: number;
  /** Minimum wattage in batch (defaults to wattage if not specified) */
  minWattage?: number;
  /** Maximum wattage in batch (defaults to wattage if not specified) */
  maxWattage?: number;
}

/**
 * Inverter specific specifications
 */
export interface InverterProductSpecs {
  /** Inverter capacity in kW */
  capacityKw?: number;
  /** Phase type (1-phase or 3-phase) */
  phaseType?: PhaseType;
  /** Minimum system size this inverter supports */
  minSystemSizeKw?: number;
  /** Maximum system size this inverter supports */
  maxSystemSizeKw?: number;
  /** Number of MPPT channels */
  mpptCount?: number;
}

/**
 * Mounting Structure specific specifications
 */
export interface StructureProductSpecs {
  /** Type of mounting structure */
  structureType?: StructureType;
  /** Material (e.g., aluminum, GI) */
  material?: string;
  /** Maximum wind speed rating in km/h */
  maxWindSpeedKmh?: number;
  /**
   * Cost multiplier applied to base structure cost from installation pricing
   * e.g., 1.0 for standard aluminum rail, 1.3 for elevated, 1.5 for super elevated
   */
  costMultiplier?: number;
}

/**
 * Product Specifications (JSONB)
 *
 * Strongly typed JSONB structure for the products.specifications column.
 * Supports hybrid approach: typed sections + flexible additional fields.
 *
 * @example Solar Panel
 * {
 *   panel: {
 *     isDcr: true,
 *     technology: "perc",
 *     wattage: 550,
 *     minWattage: 530,
 *     maxWattage: 550
 *   },
 *   common: {
 *     efficiency: 21.5,
 *     dimensions: "2278x1134x35mm",
 *     weight: 27.5
 *   }
 * }
 *
 * @example Inverter
 * {
 *   inverter: {
 *     capacityKw: 5,
 *     phaseType: "1_phase",
 *     minSystemSizeKw: 1,
 *     maxSystemSizeKw: 6,
 *     mpptCount: 2
 *   },
 *   common: {
 *     efficiency: 98.3,
 *     inputVoltage: "350-850V DC",
 *     outputVoltage: "230V AC"
 *   }
 * }
 *
 * @example Mounting Structure
 * {
 *   structure: {
 *     structureType: "elevated",
 *     material: "Aluminum",
 *     maxWindSpeedKmh: 150
 *   }
 * }
 */
export interface ProductSpecifications {
  /** Common specifications (efficiency, dimensions, weight, etc.) */
  common?: CommonProductSpecs;
  /** Solar Panel specific fields (isDcr, technology, wattage range) */
  panel?: PanelProductSpecs;
  /** Inverter specific fields (capacity, phase, system size range) */
  inverter?: InverterProductSpecs;
  /** Mounting structure specific fields (type, material) */
  structure?: StructureProductSpecs;
  /** Additional flexible fields for custom specifications */
  additional?: Record<string, unknown>;
}
