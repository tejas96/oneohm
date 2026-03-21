/**
 * ============================================================================
 * PRODUCT FLAT SPECIFICATIONS INTERFACE
 * ============================================================================
 *
 * Flat JSONB structure for the products.specifications column.
 * All product types share a single flat namespace - keys are defined
 * per product type in the product_type_attributes table.
 */

/**
 * Flat Product Specifications (JSONB)
 *
 * All specification keys are at the top level. Which keys apply
 * is determined by the product's product_type (via product_type_attributes).
 *
 * @example Solar Panel
 * { technology: "perc", is_dcr: true, wattage: 540, min_wattage: 530, max_wattage: 550, efficiency: 21.5 }
 *
 * @example Inverter
 * { capacity_kw: 5, phase_type: "single_phase", min_system_size_kw: 1, max_system_size_kw: 6, voltage: "230V AC" }
 *
 * @example Mounting Structure
 * { structure_type: "elevated_6x9", material: "Aluminum", weight_kg: 45 }
 */
export interface ProductSpecifications {
  // Panel attributes
  technology?: string;
  is_dcr?: boolean;
  wattage?: number;
  min_wattage?: number;
  max_wattage?: number;

  // Inverter attributes
  capacity_kw?: number;
  phase_type?: string;
  min_system_size_kw?: number;
  max_system_size_kw?: number;
  mppt_count?: number;

  // Structure attributes
  structure_type?: string;
  material?: string;
  max_wind_speed_kmh?: number;

  // Shared attributes
  efficiency?: number;
  voltage?: string;
  weight_kg?: number;

  // Allow any additional fields for future product types
  [key: string]: unknown;
}
