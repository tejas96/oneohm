import { PhaseType, PanelTechnology, StructureType, ProjectType } from '../enums/product.enum';
import { SubsidySchemeType, DcrPreference } from '../enums/quote.enum';

/**
 * ============================================================================
 * SUBSIDY CONFIGURATION INTERFACES
 * ============================================================================
 */

/**
 * Subsidy Tier - Defines rate for a specific kW range
 */
export interface SubsidyTier {
  /** Starting kW for this tier (inclusive) */
  fromKw: number;
  /** Ending kW for this tier (exclusive, null for unlimited) */
  toKw: number | null;
  /** Subsidy rate per kW in INR */
  ratePerKw: number;
}

/**
 * Subsidy Configuration JSONB
 * Stored in subsidy_configuration.tiers
 */
export interface SubsidyTiersConfig {
  /** Tiered subsidy rates */
  tiers: SubsidyTier[];
}

/**
 * Full Subsidy Configuration (for entity)
 */
export interface SubsidyConfig {
  /** Scheme name (e.g., PM Surya Ghar) */
  schemeName: string;
  /** Scheme type */
  schemeType: SubsidySchemeType;
  /** Project type this applies to */
  projectType: ProjectType;
  /** Maximum system size eligible for subsidy in kW */
  maxSubsidyKw: number;
  /** Whether DCR panels are required */
  requiresDcr: boolean;
  /** Whether to auto-split system if size > maxSubsidyKw */
  autoSplitEnabled: boolean;
  /** Tiered subsidy rates */
  tiers: SubsidyTier[];
  /** Whether this configuration is currently active */
  isActive: boolean;
}

/**
 * ============================================================================
 * INSTALLATION PRICING INTERFACES
 * ============================================================================
 */

/**
 * Installation Cost Components (Dynamic JSONB)
 *
 * Stores all installation cost components in a flexible structure.
 * New cost components can be added without schema changes.
 *
 * @example
 * {
 *   electrical_work: 4200,
 *   fixed_material: 8500,
 *   variable_floor: 4548,
 *   structure_cost: 13336,
 *   installation_labor: 4400,
 *   msedcl_charges: 1500,
 *   loading_unloading: 1500
 * }
 */
export interface InstallationCostComponents {
  /** Electrical work: Wiring, junction boxes, DB installation */
  electrical_work?: number;
  /** Fixed material cost: Cables, connectors, earthing kit */
  fixed_material?: number;
  /** Variable floor cost (base amount, multiplied by floor level) */
  variable_floor?: number;
  /** Mounting structure cost */
  structure_cost?: number;
  /** Installation labor charges */
  installation_labor?: number;
  /** MSEDCL/Utility grid connection charges */
  msedcl_charges?: number;
  /** Loading and unloading charges */
  loading_unloading?: number;
  /** Supervision charges */
  supervision?: number;

  // ==================== Future additions (no schema change needed) ====================
  /** Crane charges for large installations */
  crane_charges?: number;
  /** Permit and approval fees */
  permit_fees?: number;
  /** Insurance charges */
  insurance?: number;
  /** Safety equipment charges */
  safety_equipment?: number;
  /** Documentation charges */
  documentation?: number;

  // ==================== Profitability ====================
  /** Profitability percentage for this system size tier */
  profitability_percent?: number;

  /** Allow any additional custom cost components */
  [key: string]: number | undefined;
}

/**
 * Installation Pricing Config
 * Defines pricing for a specific system size range
 *
 * @deprecated Use InstallationCostComponents with dynamic JSONB instead
 */
export interface InstallationPricingConfig {
  /** Minimum system size in kW (inclusive) */
  minSystemSizeKw: number;
  /** Maximum system size in kW (exclusive, null for unlimited) */
  maxSystemSizeKw: number | null;
  /** Electrical work cost in INR */
  electricalWorkCost: number;
  /** Fixed material cost in INR */
  fixedMaterialCost: number;
  /** Variable cost per floor in INR */
  variableFloorCost: number;
  /** MSEDCL charges in INR */
  msedclCharges: number;
  /** Supervision charges in INR */
  supervisionCharges: number;
  /** Floor increment percentage (e.g., 5 for 5%) */
  floorIncrementPercent: number;
  /** Transport cost per km in INR */
  transportCostPerKm: number;
  /** GST rate for installation (12%) */
  gstRate: number;
}

/**
 * ============================================================================
 * QUOTE CONFIGURATION INTERFACES
 * ============================================================================
 */

/**
 * Default Payment Milestone Configuration
 */
export interface PaymentMilestoneConfig {
  /** Stage identifier */
  stage: string;
  /** Display name */
  name: string;
  /** Percentage of total */
  percentage: number;
  /** Order for display */
  order: number;
}

/**
 * GST Configuration
 */
export interface GstConfig {
  /** First GST rate (e.g., 12%) */
  rate1: number;
  /** Percentage of base for rate1 (e.g., 70) */
  rate1Percentage: number;
  /** Second GST rate (e.g., 18%) */
  rate2: number;
  /** Percentage of base for rate2 (e.g., 30) */
  rate2Percentage: number;
}

/**
 * Wattage Rounding Configuration
 */
export interface WattageRoundingConfig {
  /** Round to nearest (e.g., 10 for nearest 10W) */
  roundTo: number;
  /** Threshold for rounding up (e.g., 5 means >=5 rounds up) */
  roundUpThreshold: number;
}

/**
 * Quote Configuration - Per Organization
 * Stored as JSON with one active config per org
 */
export interface QuoteConfiguration {
  /** Default quote validity in days */
  defaultValidityDays: number;
  /** Maximum allowed versions per quote */
  maxVersions: number;
  /** Default project completion weeks */
  defaultCompletionWeeks: number;
  /** GST configuration */
  gstConfig: GstConfig;
  /** Wattage rounding rules */
  wattageRounding: WattageRoundingConfig;
  /** Default payment milestones */
  paymentMilestones: PaymentMilestoneConfig[];
  /** Whether to show real-time inventory */
  showInventoryStock: boolean;
  /** Minimum profit margin percentage */
  minProfitMarginPercent?: number;
}

/**
 * ============================================================================
 * QUOTE CALCULATION INPUT/OUTPUT INTERFACES
 * ============================================================================
 */

/**
 * Quote Calculation Input
 * Data provided by sales person to calculate a quote
 */
export interface QuoteCalculationInput {
  /** Customer ID */
  customerId: string;
  /** Project type */
  projectType: ProjectType;
  /** Required system size in kW */
  systemSizeKw: number;
  /** Electrical phase type */
  phaseType: PhaseType;
  /** Whether subsidy is applicable */
  subsidyApplicable: boolean;
  /** DCR panel preference */
  dcrPreference: DcrPreference;
  /** Preferred panel brand (optional) */
  preferredPanelBrand?: string;
  /** Preferred inverter brand (optional) */
  preferredInverterBrand?: string;
  /** Structure type */
  structureType: StructureType;
  /** Installation floor number (default 0 for ground) */
  floorNumber?: number;
  /** Distance from warehouse in km */
  distanceKm?: number;
}

/**
 * Calculated Panel Configuration
 */
export interface CalculatedPanelConfig {
  /** Product ID of selected panel */
  productId: string;
  /** Panel name */
  name: string;
  /** Brand */
  brand: string;
  /** Whether DCR panel */
  isDcr: boolean;
  /** Technology (optional - may not be specified in specs) */
  technology?: PanelTechnology;
  /** Wattage per panel */
  wattagePerPanel: number;
  /** Number of panels */
  quantity: number;
  /** Total wattage */
  totalWattage: number;
  /** Price per watt */
  pricePerWatt: number;
  /** Line total before tax */
  lineTotal: number;
  /** GST amount */
  gstAmount: number;
  /** GST rate applied (e.g., 12) */
  gstRate: number;
  /** Product warranty in years */
  productWarrantyYears?: number;
  /** Performance warranty in years */
  performanceWarrantyYears?: number;
}

/**
 * Calculated Inverter Configuration
 */
export interface CalculatedInverterConfig {
  /** Array of inverters (may be multiple for combination) */
  inverters: {
    productId: string;
    name: string;
    brand: string;
    capacityKw: number;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    gstAmount: number;
    /** GST rate applied (e.g., 12) */
    gstRate: number;
    /** Product warranty in years */
    productWarrantyYears?: number;
  }[];
  /** Total inverter capacity */
  totalCapacityKw: number;
  /** Total cost before tax */
  totalCost: number;
  /** Total GST */
  totalGst: number;
}

/**
 * Calculated Installation Cost
 */
export interface CalculatedInstallationCost {
  /** Electrical work */
  electricalWork: number;
  /** Fixed materials */
  fixedMaterial: number;
  /** Variable floor cost */
  variableFloor: number;
  /** Structure cost (from installation pricing, with multiplier applied) */
  structureCost: number;
  /** Installation labor charges */
  installationLabor: number;
  /** Loading/unloading charges */
  loadingUnloading: number;
  /** MSEDCL charges */
  msedclCharges: number;
  /** Supervision charges */
  supervision: number;
  /** Transport cost */
  transport: number;
  /** Total installation before tax */
  totalBeforeTax: number;
  /** GST on installation */
  gstAmount: number;
  /** GST rate applied (e.g., 18) */
  gstRate: number;
  /** Total with GST */
  totalWithGst: number;
  /** Full breakdown of all cost components */
  breakdown?: Record<string, number>;
}

/**
 * Validation Warning
 */
export interface ValidationWarning {
  /** Warning code for programmatic handling */
  code: string;
  /** Human-readable message */
  message: string;
  /** Severity level */
  severity: 'info' | 'warning' | 'error';
}

/**
 * Calculated Subsidy
 */
export interface CalculatedSubsidy {
  /** Whether subsidy is applicable */
  isApplicable: boolean;
  /** Scheme name */
  schemeName?: string;
  /** Eligible system size for subsidy */
  eligibleKw?: number;
  /** Total subsidy amount */
  amount: number;
  /** Breakdown by tier */
  breakdown?: {
    fromKw: number;
    toKw: number;
    kw: number;
    ratePerKw: number;
    amount: number;
  }[];
}

/**
 * Quote Calculation Result
 * Complete calculated quote data
 */
export interface QuoteCalculationResult {
  /** System configuration */
  systemConfig: {
    totalSystemSizeKw: number;
    dcrSizeKw: number;
    nonDcrSizeKw: number;
    phaseType: PhaseType;
  };
  /** Panel configurations (may have DCR + Non-DCR split) */
  panels: CalculatedPanelConfig[];
  /** Inverter configuration */
  inverters: CalculatedInverterConfig;
  /** Structure cost */
  structure: {
    productId: string;
    name: string;
    structureType: StructureType;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    gstAmount: number;
    gstRate: number;
  };
  /** Installation costs */
  installation: CalculatedInstallationCost;
  /** Pricing summary */
  pricing: {
    /** Sum of all line items before tax */
    basePrice: number;
    /** GST at 5% on solar equipment (panels + inverters) */
    gst5Amount: number;
    /** GST at 18% on services (structure + installation) */
    gst18Amount: number;
    /** Total GST */
    totalGst: number;
    /** Total price with GST */
    totalPrice: number;
    /** Discount amount */
    discountAmount: number;
    /** Final price after discount */
    finalPrice: number;
  };
  /** Subsidy calculation */
  subsidy: CalculatedSubsidy;
  /** Effective price (final - subsidy) */
  effectivePrice: number;
  /** Estimated completion weeks */
  completionWeeks: number;
}

/**
 * ============================================================================
 * QUOTE VERSION SNAPSHOT INTERFACES
 * ============================================================================
 */

