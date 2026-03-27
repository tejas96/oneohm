import type { ProjectType } from '../enums/product.enum';
import type { DcrPreference, QuoteCalculationMode } from '../enums/quote.enum';

/**
 * Payment Milestone Interface
 * Structure for payment_milestones JSONB field in quote_versions
 */
export interface PaymentMilestone {
  /** Milestone stage identifier (free-form string to support custom milestones) */
  stage: string;

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
  phaseType: string;
  dcrPreference: DcrPreference;
  calculationMode: QuoteCalculationMode;
  dcrSystemSizeKw?: number;
  nonDcrSystemSizeKw?: number;
  floorNumber: number;
  distanceKm?: number;
  structureType: string;
  preferredPanelBrand?: string;
  preferredPanelTechnology?: string;
  preferredPanelWattage?: number;
  preferredInverterBrand?: string;
  preferredInverterCapacityKw?: number;
  subsidyApplicable: boolean;
  selectedSubsidyIds?: string[];
  manualDcrPanelCount?: number;
  manualNonDcrPanelCount?: number;
  manualInverterCount?: number;
  systemSizeKw?: number;
  projectType?: ProjectType;
  actualSystemSizeKw?: number;
  actualDcrSizeKw?: number;
  actualNonDcrSizeKw?: number;
}

/**
 * Pricing Breakdown
 * Detailed pricing components stored as JSONB on quote_versions.
 * Top-level final_price and effective_price remain as sortable columns.
 */
export interface PricingBreakdown {
  basePrice: number;
  /** Base price after discount applied (before GST recalculation) */
  discountedBasePrice?: number;
  /** GST on the equipment-weighted portion of the base at organization-configurable rate */
  gst5OnEquipment: number;
  /** GST on the services-weighted portion of the base at organization-configurable rate */
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
 *
 * @deprecated Use SubsidyConfig from quote-calculator.interface.ts
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
