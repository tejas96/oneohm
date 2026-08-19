import type { QuotePdfPaymentMilestone } from '@tejas96/shared/reports';
import type {
  ProjectType,
  DcrPreference,
  CalculatorInputs,
  PricingBreakdown,
  PaymentMilestone as SharedPaymentMilestone,
  ProfitMarginTier,
  SubsidyTier as SharedSubsidyTier,
  SubsidySchemeResult as SharedSubsidySchemeResult,
  CalculatedSubsidy as SharedCalculatedSubsidy,
  ValidationWarning as SharedValidationWarning,
  CalculatedPanelConfig,
  CalculatedInstallationCost,
  GstConfig,
} from '@tejas96/shared/types';

// Re-export shared types that consumers already reference by local names
export type { ProfitMarginTier } from '@tejas96/shared/types';
export type ValidationWarning = SharedValidationWarning;
export type SubsidySchemeResult = SharedSubsidySchemeResult;
export type SubsidyTier = SharedSubsidyTier;

// ============================================================================
// Request Types (mirrors backend CalculateQuoteDto)
// ============================================================================

export interface PanelOverride {
  productId: string;
  quantity: number;
}

export interface InverterOverride {
  productId: string;
  quantity: number;
}

export interface CalculateQuoteRequest {
  customerId: string;
  propertyId?: string;
  projectType: ProjectType;
  systemSizeKw: number;
  phaseType: string;
  subsidyApplicable: boolean;
  dcrPreference?: DcrPreference;
  preferredPanelBrand?: string;
  preferredPanelTechnology?: string;
  preferredPanelWattage?: number;
  preferredInverterBrand?: string;
  preferredInverterCapacityKw?: number;
  structureType: string;
  floorNumber?: number;
  distanceKm?: number;
  panelOverrides?: PanelOverride[];
  inverterOverrides?: InverterOverride[];
  manualInverterCount?: number;
  manualDcrPanelCount?: number;
  manualNonDcrPanelCount?: number;
  selectedSubsidyIds?: string[];
}

export interface CreateFromCalculationRequest extends CalculateQuoteRequest {
  propertyId: string;
  discountAmount?: number;
  internalNotes?: string;
  customerNotes?: string;
  salesPersonId?: string;
  resellerId?: string;
  paymentMilestones?: SharedPaymentMilestone[];
}

// ============================================================================
// Response Types (mirrors backend CalculateQuoteResponseDto)
// Re-uses shared types but adds frontend-specific shapes where the API
// response differs slightly from the canonical shared interface.
// ============================================================================

export interface SystemConfig {
  totalSystemSizeKw: number;
  dcrSizeKw: number;
  nonDcrSizeKw: number;
  phaseType: string;
}

/**
 * Frontend alias for shared CalculatedPanelConfig.
 * Identical structure -- gstRate is optional in the API response.
 */
export interface CalculatedPanel extends Omit<CalculatedPanelConfig, 'gstRate'> {
  gstRate?: number;
}

export interface InverterItem {
  productId: string;
  name: string;
  brand: string;
  description?: string;
  capacityKw: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  gstAmount: number;
  gstRate?: number;
  productWarrantyYears?: number;
}

export interface CalculatedInverter {
  inverters: InverterItem[];
  totalCapacityKw: number;
  totalCost: number;
  totalGst: number;
}

export interface CalculatedStructure {
  productId: string;
  name: string;
  description?: string;
  structureType: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  gstAmount: number;
  gstRate?: number;
}

/**
 * Frontend installation type -- extends shared CalculatedInstallationCost
 * with optional gstRate (required in shared but optional in API response).
 */
export interface CalculatedInstallation extends Omit<CalculatedInstallationCost, 'gstRate'> {
  gstRate?: number;
}

export interface SubsidyBreakdown {
  fromKw: number;
  toKw: number;
  kw: number;
  ratePerKw: number;
  amount: number;
}

/**
 * Frontend CalculatedSubsidy -- mirrors shared but with optional `schemes`
 * for backward compatibility with API responses that predate multi-scheme.
 */
export interface CalculatedSubsidy extends Omit<SharedCalculatedSubsidy, 'schemes'> {
  schemes?: SubsidySchemeResult[];
}

export interface PricingSummary {
  basePrice: number;
  gst5Amount: number;
  gst18Amount: number;
  totalGst: number;
  totalPrice: number;
  discountAmount: number;
  finalPrice: number;
}

export interface InventoryStatus {
  productId: string;
  productName: string;
  requiredQuantity: number;
  availableStock: number;
  isSufficient: boolean;
}

export interface CalculateQuoteResponse {
  systemConfig: SystemConfig;
  panels: CalculatedPanel[];
  inverters: CalculatedInverter;
  structure: CalculatedStructure;
  installation: CalculatedInstallation;
  pricing: PricingSummary;
  subsidy: CalculatedSubsidy;
  effectivePrice: number;
  completionWeeks: number;
  inventoryStatus?: InventoryStatus[];
  warnings?: ValidationWarning[];
  hasOverrides: boolean;
  actualTotalWattage: number;
  actualSystemSizeKw: number;
  actualDcrSizeKw: number;
  actualNonDcrSizeKw: number;
  profitabilityPercent: number;
  profitabilityAmount: number;
  calculatedAt: string;
}

export interface QuoteSnapshot {
  inputs: CalculatorInputs;
  calculation: CalculateQuoteResponse;
  pricing: PricingBreakdown;
  discountAmount: number;
}

export interface SaveQuoteResponse {
  quoteId: string;
  quoteNumber: string;
  finalPrice: number;
  effectivePrice: number;
  discountAmount: number;
  subsidyAmount: number;
  calculation: CalculateQuoteResponse;
}

// ============================================================================
// Config Response Types
// ============================================================================

/**
 * The config endpoint's milestone, which is ALSO the one the PDF prints.
 *
 * An alias rather than a second declaration: it moved into the shared package
 * with the template, and re-declaring the identical shape here is how the two
 * drift the next time a field is added to one of them. The shared package's own
 * `PaymentMilestone` remains a different, smaller type — see the note at the
 * foot of this file.
 */
export type PaymentMilestone = QuotePdfPaymentMilestone;

export interface QuoteConfigResponse {
  defaultValidityDays: number;
  maxVersions: number;
  gstConfig: GstConfig;
  /** Already resolved for the requested property — the loan schedule when it is financed. */
  paymentMilestones: PaymentMilestone[];
  /** The financed schedule, always. Exposed so the resolution above is inspectable. */
  paymentMilestonesLoan?: PaymentMilestone[];
  /** Whether `paymentMilestones` is the loan schedule. Only true when a propertyId was sent. */
  isLoanSchedule?: boolean;
  profitMarginTiers: ProfitMarginTier[];
}

export interface SubsidyConfigResponse {
  id: string;
  schemeName: string;
  projectType: ProjectType;
  maxSubsidyKw: number;
  maxSubsidyAmount?: number;
  requiresDcr: boolean;
  tiers: SubsidyTier[];
  isActive: boolean;
}

// ============================================================================
// PDF Data Types
// ============================================================================

/*
  NOT DEFINED HERE ANY MORE. The quote PDF template moved into
  `@tejas96/shared/reports` so web and mobile print the same document, and a
  template in a shared package cannot import types out of one of its consumers —
  so these moved with it.

  They are re-exported under their old web names because roughly a dozen files
  in this feature import them from here, and renaming those would have made a
  mechanical move look like a rewrite. `QuotePdfPaymentMilestone` is the one
  that changed name at the source, deliberately: two types called
  `PaymentMilestone` in one package is exactly how the shared one gets
  substituted by accident, and the shared one has no `amount` — the schedule
  would print as a column of zeroes.
*/
export type { QuotePdfPaymentMilestone };
export type {
  PdfCompanyInfo,
  QuoteCustomerInfo,
  QuotePdfData,
  QuotePdfOrgConfig,
  QuotePropertyInfo,
} from '@tejas96/shared/reports';
