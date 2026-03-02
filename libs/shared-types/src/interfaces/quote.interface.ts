import type { PanelTechnology, PhaseType, StructureType } from '../enums/product.enum';
import type {
  DcrPreference,
  PaymentMilestoneStage,
  QuoteCalculationMode,
} from '../enums/quote.enum';

/**
 * Payment Milestone Interface
 * Structure for payment_milestones JSONB field in quote_versions
 */
export interface PaymentMilestone {
  /** Milestone stage identifier */
  stage: PaymentMilestoneStage;

  /** Milestone display name */
  name: string;

  /** Percentage of total price */
  percentage: number;

  /** Calculated amount in INR */
  amount: number;

  /** Expected/due date for this milestone */
  dueDate?: string; // ISO date string

  /** Description or conditions for this milestone */
  description?: string;

  /** Display order in the quote */
  order: number;
}

/**
 * Calculator Inputs
 * Captures all user-chosen parameters for a quote calculation.
 * Stored as JSONB on quote_versions.
 */
export interface CalculatorInputs {
  phaseType: PhaseType;
  dcrPreference: DcrPreference;
  calculationMode: QuoteCalculationMode;
  dcrSystemSizeKw?: number;
  nonDcrSystemSizeKw?: number;
  floorNumber: number;
  distanceKm?: number;
  structureType: StructureType;
  preferredPanelBrand?: string;
  preferredPanelTechnology?: PanelTechnology;
  preferredPanelWattage?: number;
  preferredInverterBrand?: string;
  subsidyApplicable: boolean;
}

/**
 * Pricing Breakdown
 * Detailed pricing components stored as JSONB on quote_versions.
 * Top-level final_price and effective_price remain as sortable columns.
 */
export interface PricingBreakdown {
  basePrice: number;
  /** GST at 5% on solar equipment (panels + inverters) */
  gst5OnEquipment: number;
  /** GST at 18% on services (structure + installation) */
  gst18OnServices: number;
  totalGst: number;
  totalPrice: number;
  discountAmount: number;
  subsidyAmount: number;
  isSubsidyApplicable: boolean;
}

/**
 * GST Configuration Interface
 * Structure for configurable GST rates
 */
export interface GstConfiguration {
  /** GST rate 1 (e.g., 12%) */
  rate1: number;

  /** Percentage of base price for rate1 (e.g., 70%) */
  rate1Percentage: number;

  /** GST rate 2 (e.g., 18%) */
  rate2: number;

  /** Percentage of base price for rate2 (e.g., 30%) */
  rate2Percentage: number;
}

/**
 * Subsidy Configuration Interface
 * Rules for auto-calculating subsidy based on system size
 */
export interface SubsidyConfiguration {
  /** Minimum system size in kW */
  minSystemSizeKw: number;

  /** Maximum system size in kW */
  maxSystemSizeKw: number;

  /** Subsidy amount per kW in INR */
  subsidyPerKw: number;

  /** Maximum total subsidy amount in INR (if applicable) */
  maxSubsidyAmount?: number;

  /** Project type applicability */
  projectType?: string;
}
